/**
 * Project Share Controller
 * REST API endpoints for project sharing and collaboration
 * Phase: 5.3 Part 5
 */

import { Request, Response, NextFunction } from 'express';
import { projectShareService } from '../services/ProjectShareService';
import { PipelineLogger } from '../../core/logger/PipelineLogger';

const logger = new PipelineLogger('ProjectShareController');

export class ProjectShareController {
  /**
   * GET /api/projects/:id/shares
   * List all shares for a project
   */
  static async listShares(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = (req as any).userId;
      const workspaceId = (req as any).workspaceId;
      const { id: projectId } = req.params;

      if (!userId || !workspaceId) {
        res.status(401).json({
          success: false,
          error: {
            code: 'UNAUTHORIZED',
            message: 'Authentication required',
          },
        });
        return;
      }

      const shares = await projectShareService.getProjectShares(
        projectId,
        userId,
        workspaceId
      );

      res.json({
        success: true,
        data: shares,
        meta: {
          count: shares.length,
          timestamp: new Date().toISOString(),
        },
      });
    } catch (error) {
      if (error instanceof Error && error.message === 'Project not found') {
        res.status(404).json({
          success: false,
          error: {
            code: 'NOT_FOUND',
            message: error.message,
          },
        });
        return;
      }
      logger.error('List shares failed', { error });
      next(error);
    }
  }

  /**
   * POST /api/projects/:id/share
   * Share project (user, workspace, or public link)
   */
  static async shareProject(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = (req as any).userId;
      const workspaceId = (req as any).workspaceId;
      const { id: projectId } = req.params;

      if (!userId || !workspaceId) {
        res.status(401).json({
          success: false,
          error: {
            code: 'UNAUTHORIZED',
            message: 'Authentication required',
          },
        });
        return;
      }

      const { shareType, sharedWith, permission, expiresInDays } = req.body;

      if (!shareType) {
        res.status(400).json({
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'shareType is required',
          },
        });
        return;
      }

      let result;

      switch (shareType) {
        case 'user':
          if (!sharedWith) {
            res.status(400).json({
              success: false,
              error: {
                code: 'VALIDATION_ERROR',
                message: 'sharedWith (user ID) is required for user shares',
              },
            });
            return;
          }

          result = await projectShareService.shareWithUser({
            projectId,
            sharedBy: userId,
            sharedWith,
            workspaceId,
            permission,
          });
          break;

        case 'workspace':
          result = await projectShareService.shareWithWorkspace({
            projectId,
            sharedBy: userId,
            workspaceId,
            permission,
          });
          break;

        case 'link':
        case 'public':
          result = await projectShareService.createPublicLink({
            projectId,
            sharedBy: userId,
            workspaceId,
            permission,
            expiresInDays,
          });
          break;

        default:
          res.status(400).json({
            success: false,
            error: {
              code: 'VALIDATION_ERROR',
              message: `Invalid shareType: ${shareType}`,
            },
          });
          return;
      }

      res.status(201).json({
        success: true,
        data: result,
        meta: {
          timestamp: new Date().toISOString(),
        },
      });
    } catch (error) {
      if (error instanceof Error) {
        if (error.message === 'Project not found') {
          res.status(404).json({
            success: false,
            error: {
              code: 'NOT_FOUND',
              message: error.message,
            },
          });
          return;
        }
        if (
          error.message === 'Cannot share project with yourself' ||
          error.message === 'Cannot share project with its owner' ||
          error.message === 'Project already shared with this user'
        ) {
          res.status(400).json({
            success: false,
            error: {
              code: 'BAD_REQUEST',
              message: error.message,
            },
          });
          return;
        }
      }
      logger.error('Share project failed', { error });
      next(error);
    }
  }

  /**
   * PATCH /api/shares/:id
   * Update share permission or expiration
   */
  static async updateShare(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = (req as any).userId;
      const workspaceId = (req as any).workspaceId;
      const { id: shareId } = req.params;

      if (!userId || !workspaceId) {
        res.status(401).json({
          success: false,
          error: {
            code: 'UNAUTHORIZED',
            message: 'Authentication required',
          },
        });
        return;
      }

      const { permission, expiresAt } = req.body;

      if (!permission && expiresAt === undefined) {
        res.status(400).json({
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'permission or expiresAt is required',
          },
        });
        return;
      }

      let updated;

      if (permission) {
        updated = await projectShareService.updatePermission(
          shareId,
          permission,
          userId,
          workspaceId
        );
      } else {
        updated = await projectShareService.updateExpiration(
          shareId,
          expiresAt ? new Date(expiresAt) : null,
          userId,
          workspaceId
        );
      }

      res.json({
        success: true,
        data: updated,
        meta: {
          timestamp: new Date().toISOString(),
        },
      });
    } catch (error) {
      if (error instanceof Error) {
        if (error.message === 'Share not found') {
          res.status(404).json({
            success: false,
            error: {
              code: 'NOT_FOUND',
              message: error.message,
            },
          });
          return;
        }
        if (error.message === 'Permission denied') {
          res.status(403).json({
            success: false,
            error: {
              code: 'FORBIDDEN',
              message: error.message,
            },
          });
          return;
        }
      }
      logger.error('Update share failed', { error });
      next(error);
    }
  }

  /**
   * DELETE /api/shares/:id
   * Revoke a share
   */
  static async revokeShare(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = (req as any).userId;
      const workspaceId = (req as any).workspaceId;
      const { id: shareId } = req.params;

      if (!userId || !workspaceId) {
        res.status(401).json({
          success: false,
          error: {
            code: 'UNAUTHORIZED',
            message: 'Authentication required',
          },
        });
        return;
      }

      await projectShareService.revokeShare(shareId, userId, workspaceId);

      res.status(204).send();
    } catch (error) {
      if (error instanceof Error) {
        if (error.message === 'Share not found') {
          res.status(404).json({
            success: false,
            error: {
              code: 'NOT_FOUND',
              message: error.message,
            },
          });
          return;
        }
        if (error.message === 'Permission denied') {
          res.status(403).json({
            success: false,
            error: {
              code: 'FORBIDDEN',
              message: error.message,
            },
          });
          return;
        }
      }
      logger.error('Revoke share failed', { error });
      next(error);
    }
  }

  /**
   * GET /api/share/:token
   * Validate share token and return project access info (public endpoint)
   */
  static async validateShareToken(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { token } = req.params;

      if (!token) {
        res.status(400).json({
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Share token is required',
          },
        });
        return;
      }

      const result = await projectShareService.validateShareToken(token);

      if (!result.isValid) {
        res.status(401).json({
          success: false,
          error: {
            code: 'INVALID_SHARE_TOKEN',
            message: result.reason || 'Invalid or expired share link',
          },
        });
        return;
      }

      res.json({
        success: true,
        data: {
          projectId: result.projectId,
          permission: result.permission,
          token,
        },
        meta: {
          timestamp: new Date().toISOString(),
        },
      });
    } catch (error) {
      logger.error('Validate share token failed', { error });
      next(error);
    }
  }

  /**
   * GET /api/shares/my-shares
   * Get shares created by current user
   */
  static async getMyShares(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = (req as any).userId;

      if (!userId) {
        res.status(401).json({
          success: false,
          error: {
            code: 'UNAUTHORIZED',
            message: 'Authentication required',
          },
        });
        return;
      }

      const shares = await projectShareService.getSharesCreatedBy(userId);

      res.json({
        success: true,
        data: shares,
        meta: {
          count: shares.length,
          timestamp: new Date().toISOString(),
        },
      });
    } catch (error) {
      logger.error('Get my shares failed', { error });
      next(error);
    }
  }

  /**
   * GET /api/shares/shared-with-me
   * Get projects shared with current user
   */
  static async getSharedWithMe(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = (req as any).userId;

      if (!userId) {
        res.status(401).json({
          success: false,
          error: {
            code: 'UNAUTHORIZED',
            message: 'Authentication required',
          },
        });
        return;
      }

      const shares = await projectShareService.getUserShares(userId);

      res.json({
        success: true,
        data: shares,
        meta: {
          count: shares.length,
          timestamp: new Date().toISOString(),
        },
      });
    } catch (error) {
      logger.error('Get shared with me failed', { error });
      next(error);
    }
  }
}