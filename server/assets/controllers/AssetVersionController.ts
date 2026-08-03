/**
 * Asset Version Controller
 * REST API endpoints for asset version history
 * Phase: 5.3 Part 5
 */

import { Request, Response, NextFunction } from 'express';
import { assetVersionService } from '../services/AssetVersionService';
import { PipelineLogger } from '../../core/logger/PipelineLogger';

const logger = new PipelineLogger('AssetVersionController');

export class AssetVersionController {
  /**
   * GET /api/assets/:id/versions
   * List version history for an asset
   */
  static async listVersions(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = (req as any).userId;
      const workspaceId = (req as any).workspaceId;
      const { id: assetId } = req.params;
      const { limit, offset } = req.query;

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

      const versions = await assetVersionService.getVersionHistory(
        assetId,
        userId,
        workspaceId,
        parseInt(limit as string) || 50,
        parseInt(offset as string) || 0
      );

      res.json({
        success: true,
        data: versions,
        meta: {
          count: versions.length,
          timestamp: new Date().toISOString(),
        },
      });
    } catch (error) {
      if (error instanceof Error && error.message === 'Asset not found') {
        res.status(404).json({
          success: false,
          error: {
            code: 'NOT_FOUND',
            message: error.message,
          },
        });
        return;
      }
      logger.error('List versions failed', { error });
      next(error);
    }
  }

  /**
   * POST /api/assets/:id/versions
   * Create a new version snapshot
   */
  static async createVersion(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = (req as any).userId;
      const workspaceId = (req as any).workspaceId;
      const { id: assetId } = req.params;

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

      const { fileUrl, fileSize, metadata, notes } = req.body;

      if (!fileUrl || !fileSize) {
        res.status(400).json({
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'fileUrl and fileSize are required',
          },
        });
        return;
      }

      const version = await assetVersionService.createVersion({
        assetId,
        userId,
        workspaceId,
        fileUrl,
        fileSize,
        metadata,
        notes,
      });

      res.status(201).json({
        success: true,
        data: version,
        meta: {
          timestamp: new Date().toISOString(),
        },
      });
    } catch (error) {
      if (error instanceof Error) {
        if (error.message === 'Asset not found') {
          res.status(404).json({
            success: false,
            error: {
              code: 'NOT_FOUND',
              message: error.message,
            },
          });
          return;
        }
        if (error.message.includes('limit reached')) {
          res.status(403).json({
            success: false,
            error: {
              code: 'LIMIT_EXCEEDED',
              message: error.message,
            },
          });
          return;
        }
      }
      logger.error('Create version failed', { error });
      next(error);
    }
  }

  /**
   * GET /api/assets/versions/:versionId
   * Get a specific version
   */
  static async getVersion(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = (req as any).userId;
      const workspaceId = (req as any).workspaceId;
      const { versionId } = req.params;
      const { assetId } = req.query;

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

      if (!assetId) {
        res.status(400).json({
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'assetId query parameter is required',
          },
        });
        return;
      }

      const version = await assetVersionService.getVersion(
        assetId as string,
        versionId,
        userId,
        workspaceId
      );

      res.json({
        success: true,
        data: version,
        meta: {
          timestamp: new Date().toISOString(),
        },
      });
    } catch (error) {
      if (error instanceof Error) {
        if (error.message === 'Asset not found') {
          res.status(404).json({
            success: false,
            error: {
              code: 'NOT_FOUND',
              message: error.message,
            },
          });
          return;
        }
        if (error.message === 'Version not found') {
          res.status(404).json({
            success: false,
            error: {
              code: 'NOT_FOUND',
              message: error.message,
            },
          });
          return;
        }
      }
      logger.error('Get version failed', { error });
      next(error);
    }
  }

  /**
   * POST /api/assets/versions/:versionId/restore
   * Restore a version
   */
  static async restoreVersion(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = (req as any).userId;
      const workspaceId = (req as any).workspaceId;
      const { versionId } = req.params;
      const { assetId, createNewVersionBeforeRestore } = req.body;

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

      if (!assetId) {
        res.status(400).json({
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'assetId is required in request body',
          },
        });
        return;
      }

      const version = await assetVersionService.restoreVersion({
        assetId,
        versionId,
        userId,
        workspaceId,
        createNewVersionBeforeRestore,
      });

      res.json({
        success: true,
        data: version,
        meta: {
          timestamp: new Date().toISOString(),
        },
      });
    } catch (error) {
      if (error instanceof Error) {
        if (error.message === 'Asset not found') {
          res.status(404).json({
            success: false,
            error: {
              code: 'NOT_FOUND',
              message: error.message,
            },
          });
          return;
        }
        if (error.message === 'Version not found') {
          res.status(404).json({
            success: false,
            error: {
              code: 'NOT_FOUND',
              message: error.message,
            },
          });
          return;
        }
      }
      logger.error('Restore version failed', { error });
      next(error);
    }
  }

  /**
   * DELETE /api/assets/versions/:versionId
   * Delete a version
   */
  static async deleteVersion(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = (req as any).userId;
      const workspaceId = (req as any).workspaceId;
      const { versionId } = req.params;
      const { assetId } = req.query;

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

      if (!assetId) {
        res.status(400).json({
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'assetId query parameter is required',
          },
        });
        return;
      }

      await assetVersionService.deleteVersion(
        assetId as string,
        versionId,
        userId,
        workspaceId
      );

      res.status(204).send();
    } catch (error) {
      if (error instanceof Error) {
        if (error.message === 'Asset not found') {
          res.status(404).json({
            success: false,
            error: {
              code: 'NOT_FOUND',
              message: error.message,
            },
          });
          return;
        }
        if (error.message === 'Version not found') {
          res.status(404).json({
            success: false,
            error: {
              code: 'NOT_FOUND',
              message: error.message,
            },
          });
          return;
        }
        if (error.message.includes('only version')) {
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
      logger.error('Delete version failed', { error });
      next(error);
    }
  }

  /**
   * POST /api/assets/:id/versions/cleanup
   * Delete old versions (keep last N)
   */
  static async cleanupVersions(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = (req as any).userId;
      const workspaceId = (req as any).workspaceId;
      const { id: assetId } = req.params;
      const { keepCount } = req.body;

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

      if (!keepCount || keepCount < 1) {
        res.status(400).json({
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'keepCount must be at least 1',
          },
        });
        return;
      }

      const count = await assetVersionService.deleteOldVersions(
        assetId,
        keepCount,
        userId,
        workspaceId
      );

      res.json({
        success: true,
        data: { deleted: count, kept: keepCount },
        meta: {
          timestamp: new Date().toISOString(),
        },
      });
    } catch (error) {
      if (error instanceof Error && error.message === 'Asset not found') {
        res.status(404).json({
          success: false,
          error: {
            code: 'NOT_FOUND',
            message: error.message,
          },
        });
        return;
      }
      logger.error('Cleanup versions failed', { error });
      next(error);
    }
  }

  /**
   * GET /api/assets/:id/versions/latest
   * Get latest version
   */
  static async getLatestVersion(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id: assetId } = req.params;

      const version = await assetVersionService.getLatestVersion(assetId);

      if (!version) {
        res.status(404).json({
          success: false,
          error: {
            code: 'NOT_FOUND',
            message: 'No versions found for this asset',
          },
        });
        return;
      }

      res.json({
        success: true,
        data: version,
        meta: {
          timestamp: new Date().toISOString(),
        },
      });
    } catch (error) {
      logger.error('Get latest version failed', { error });
      next(error);
    }
  }

  /**
   * DELETE /api/assets/:id/versions/all
   * Delete all versions for an asset
   */
  static async deleteAllVersions(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = (req as any).userId;
      const workspaceId = (req as any).workspaceId;
      const { id: assetId } = req.params;

      if (!userId || !workspaceId) {
        res.status(401).json({
          success: false,
          error: { code: 'UNAUTHORIZED', message: 'Authentication required' },
        });
        return;
      }

      const deletedCount = await assetVersionService.deleteAllVersions(assetId, userId, workspaceId);

      res.json({
        success: true,
        data: { deletedCount },
        meta: { timestamp: new Date().toISOString() },
      });
    } catch (error) {
      logger.error('Delete all versions failed', { error });
      next(error);
    }
  }

  /**
   * POST /api/assets/:id/versions/compare
   * Compare two versions
   */
  static async compareVersions(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = (req as any).userId;
      const workspaceId = (req as any).workspaceId;
      const { id: assetId } = req.params;
      const { versionId1, versionId2 } = req.body;

      if (!userId || !workspaceId) {
        res.status(401).json({
          success: false,
          error: { code: 'UNAUTHORIZED', message: 'Authentication required' },
        });
        return;
      }

      if (!versionId1 || !versionId2) {
        res.status(400).json({
          success: false,
          error: { code: 'VALIDATION_ERROR', message: 'versionId1 and versionId2 are required' },
        });
        return;
      }

      const comparison = await assetVersionService.compareVersions(assetId, versionId1, versionId2, userId, workspaceId);

      res.json({
        success: true,
        data: comparison,
        meta: { timestamp: new Date().toISOString() },
      });
    } catch (error) {
      logger.error('Compare versions failed', { error });
      next(error);
    }
  }

  /**
   * GET /api/assets/:id/versions/count
   * Get version count
   */
  static async getVersionCount(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id: assetId } = req.params;

      const count = await assetVersionService.getVersionCount(assetId);

      res.json({
        success: true,
        data: { count },
        meta: {
          timestamp: new Date().toISOString(),
        },
      });
    } catch (error) {
      logger.error('Get version count failed', { error });
      next(error);
    }
  }
}