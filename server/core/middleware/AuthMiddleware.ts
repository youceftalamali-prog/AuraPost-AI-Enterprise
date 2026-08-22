import { Request, Response, NextFunction } from 'express';
import { JwtService, TokenPayload } from '../../identity/services/JwtService';
import { DatabaseManager } from '../../db';
import { getAccessTokenFromRequest } from '../../identity/http/authCookies';
import { AppError } from '../errors/AppError';
import {
  resolveImportIdempotencyKey,
  sanitizeImportRequestBody,
  type SanitizedImportRequest,
} from '../../imports/importRequestPolicy';
import { normalizeImportStartResponse } from '../../imports/importResponseContract';

const jwtService = new JwtService();
const IMPORT_IDEMPOTENCY_TTL_MS = 10 * 60 * 1_000;
const IMPORT_IDEMPOTENCY_MAX_ENTRIES = 2_000;

type ImportIdempotencyEntry = {
  createdAt: number;
  status: 'pending' | 'completed';
  responseStatus?: number;
  responseBody?: unknown;
};

const importIdempotencyCache = new Map<string, ImportIdempotencyEntry>();

export interface AuthenticatedRequest extends Request {
  user?: TokenPayload;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function getBearerToken(req: Request): string | null {
  const authHeader = req.headers.authorization;
  if (!authHeader) return null;
  if (!authHeader.startsWith('Bearer ')) return null;
  const token = authHeader.slice('Bearer '.length).trim();
  return token || null;
}

function isProductImportRequest(req: Request): boolean {
  const pathname = (req.originalUrl || req.url).split('?', 1)[0];
  return req.method === 'POST' && pathname === '/api/import';
}

function pruneImportIdempotencyCache(now: number): void {
  for (const [key, entry] of importIdempotencyCache) {
    if (now - entry.createdAt > IMPORT_IDEMPOTENCY_TTL_MS) {
      importIdempotencyCache.delete(key);
    }
  }

  if (importIdempotencyCache.size <= IMPORT_IDEMPOTENCY_MAX_ENTRIES) return;
  const oldest = [...importIdempotencyCache.entries()]
    .sort((left, right) => left[1].createdAt - right[1].createdAt)
    .slice(0, importIdempotencyCache.size - IMPORT_IDEMPOTENCY_MAX_ENTRIES);
  for (const [key] of oldest) importIdempotencyCache.delete(key);
}

function sendImportPolicyError(res: Response, error: unknown): void {
  if (error instanceof AppError) {
    const details = isRecord(error.details) ? error.details : undefined;
    res.status(error.statusCode).json({
      error: error.message,
      code: typeof details?.code === 'string' ? details.code : 'IMPORT_POLICY_REJECTED',
      details,
    });
    return;
  }

  res.status(500).json({
    error: 'Failed to validate the product import request.',
    code: 'IMPORT_POLICY_ERROR',
  });
}

function prepareImportRequest(
  req: AuthenticatedRequest & { workspaceId?: string },
  res: Response,
): boolean {
  if (!req.workspaceId) {
    res.status(400).json({ error: 'A workspace is required for product import.' });
    return false;
  }

  let sanitized: SanitizedImportRequest;
  let idempotencyKey: string;
  try {
    sanitized = sanitizeImportRequestBody(req.body, req.workspaceId);
    idempotencyKey = resolveImportIdempotencyKey(req.header('Idempotency-Key'), sanitized);
  } catch (error) {
    sendImportPolicyError(res, error);
    return false;
  }

  req.body = sanitized;
  const cacheKey = `${req.workspaceId}:${idempotencyKey}`;
  const now = Date.now();
  pruneImportIdempotencyCache(now);
  const existing = importIdempotencyCache.get(cacheKey);
  res.setHeader('Idempotency-Key', idempotencyKey);
  res.setHeader('Cache-Control', 'no-store');

  if (existing?.status === 'completed') {
    res.setHeader('Idempotency-Replayed', 'true');
    res.status(existing.responseStatus || 202).json(existing.responseBody);
    return false;
  }
  if (existing?.status === 'pending') {
    res.status(409).json({
      error: 'An identical product import request is already being created.',
      code: 'IMPORT_REQUEST_IN_PROGRESS',
      idempotencyKey,
    });
    return false;
  }

  const entry: ImportIdempotencyEntry = { createdAt: now, status: 'pending' };
  importIdempotencyCache.set(cacheKey, entry);
  const originalJson = res.json.bind(res);
  res.json = ((body?: unknown) => {
    const contractedBody = normalizeImportStartResponse(body);
    if (
      res.statusCode >= 200 &&
      res.statusCode < 300 &&
      isRecord(contractedBody) &&
      typeof contractedBody.operationId === 'string'
    ) {
      entry.status = 'completed';
      entry.responseStatus = res.statusCode;
      entry.responseBody = contractedBody;
    } else {
      importIdempotencyCache.delete(cacheKey);
    }
    return originalJson(contractedBody);
  }) as typeof res.json;
  return true;
}

export function requireAuth(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  const token = getBearerToken(req) || getAccessTokenFromRequest(req);
  if (!token) {
    return res.status(401).json({ error: 'Authentication credentials are required.' });
  }

  try {
    const payload = jwtService.verifyAccessToken(token);
    req.user = payload;
    return next();
  } catch {
    return res.status(401).json({ error: 'Invalid or expired access token.' });
  }
}

export async function requireWorkspaceAccess(
  req: AuthenticatedRequest & { workspaceId?: string },
  res: Response,
  next: NextFunction,
) {
  if (!req.user) {
    return res.status(401).json({
      error: 'Authentication required before workspace access can be authorized.',
    });
  }

  const requestedWorkspaceId =
    (req.query.workspaceId as string) ||
    (req.body && (req.body as Record<string, unknown>).workspaceId as string) ||
    (req.params && (req.params as Record<string, unknown>).workspaceId as string) ||
    undefined;

  try {
    const db = await DatabaseManager.getInstance();

    if (!requestedWorkspaceId) {
      req.workspaceId = await db.ensureUserHasWorkspace(req.user.userId);
      return next();
    }

    const isMember = await db.isWorkspaceMember(req.user.userId, requestedWorkspaceId);
    if (!isMember) {
      return res.status(403).json({ error: 'You do not have access to this workspace.' });
    }

    req.workspaceId = requestedWorkspaceId;
    return next();
  } catch (err: unknown) {
    return res.status(500).json({
      error: err instanceof Error ? err.message : 'Failed to authorize workspace access.',
    });
  }
}

export function requireAuthAndWorkspace() {
  return [
    requireAuth,
    async (
      req: AuthenticatedRequest & { workspaceId?: string },
      res: Response,
      next: NextFunction,
    ) => {
      await requireWorkspaceAccessInternal(req, res, next);
    },
  ];
}

export function attachAssetsProjectsContext(
  req: AuthenticatedRequest & { workspaceId?: string; userId?: string },
  _res: Response,
  next: NextFunction,
) {
  if (req.user) req.userId = req.user.userId;
  next();
}

export function attachVideoStudioContext(
  req: AuthenticatedRequest & {
    workspaceId?: string;
    userId?: string;
    userEmail?: string;
  },
  _res: Response,
  next: NextFunction,
) {
  if (req.user) {
    req.userId = req.user.userId;
    req.userEmail = req.user.email;
  }
  next();
}

async function requireWorkspaceAccessInternal(
  req: AuthenticatedRequest & { workspaceId?: string },
  res: Response,
  next: NextFunction,
) {
  await requireWorkspaceAccess(req, res, () => {
    if (req.workspaceId) {
      if (req.query) (req.query as Record<string, unknown>).workspaceId = req.workspaceId;
      if (req.body && typeof req.body === 'object') {
        (req.body as Record<string, unknown>).workspaceId = req.workspaceId;
      }
    }

    if (isProductImportRequest(req) && !prepareImportRequest(req, res)) return;
    next();
  });
}
