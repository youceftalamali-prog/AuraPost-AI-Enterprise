import { Request, Response, NextFunction } from 'express';
import { JwtService, TokenPayload } from '../../identity/services/JwtService';
import { DatabaseManager } from '../../db';
import { getAccessTokenFromRequest } from '../../identity/http/authCookies';

const jwtService = new JwtService();

export interface AuthenticatedRequest extends Request {
  user?: TokenPayload;
}

function getBearerToken(req: Request): string | null {
  const authHeader = req.headers.authorization;
  if (!authHeader) return null;
  if (!authHeader.startsWith('Bearer ')) return null;
  const token = authHeader.slice('Bearer '.length).trim();
  return token || null;
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
    (req.body && (req.body as any).workspaceId) ||
    (req.params && (req.params as any).workspaceId) ||
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
  } catch (err: any) {
    return res.status(500).json({
      error: err?.message || 'Failed to authorize workspace access.',
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
  if (req.user) {
    req.userId = req.user.userId;
  }
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
      if (req.query) (req.query as any).workspaceId = req.workspaceId;
      if (req.body && typeof req.body === 'object') {
        (req.body as any).workspaceId = req.workspaceId;
      }
    }
    next();
  });
}
