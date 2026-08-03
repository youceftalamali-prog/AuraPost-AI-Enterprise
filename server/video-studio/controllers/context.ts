import type { Request } from 'express';
import type { RequestContext } from '../types/api.js';
import { ApiError } from '../middleware/errorHandler.js';

/**
 * Extracts the authenticated request context populated by AuraPost's
 * existing auth middleware. Throws 401 if the context is missing so
 * controllers never operate without a user/workspace.
 */
export function getRequestContext(req: Request): RequestContext {
  const userId = (req as unknown as { userId?: string }).userId;
  const workspaceId = (req as unknown as { workspaceId?: string }).workspaceId;

  if (!userId || !workspaceId) {
    throw ApiError.unauthorized('Authentication context missing');
  }

  const userEmail = (req as unknown as { userEmail?: string }).userEmail;
  return { userId, workspaceId, userEmail };
}