/**
 * Collection Controller
 * REST API endpoints for asset collection management
 * Phase: 5.3 Part 5
 */

import { Request, Response, NextFunction } from 'express';
import { assetCollectionService } from '../services/AssetCollectionService';
import { PipelineLogger } from '../../core/logger/PipelineLogger';

const logger = new PipelineLogger('CollectionController');

export class CollectionController {
  /**
   * POST /api/assets/collections
   * Create a new collection
   */
  static async createCollection(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = (req as any).userId;
      const workspaceId = (req as any).workspaceId;

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

      const {
        name,
        description,
        coverAssetId,
        isSmart,
        smartQuery,
        isPublic,
        initialAssetIds,
      } = req.body;

      if (!name) {
        res.status(400).json({
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Collection name is required',
          },
        });
        return;
      }

      const collection = await assetCollectionService.createCollection({
        workspaceId,
        userId,
        name,
        description,
        coverAssetId,
        isSmart,
        smartQuery,
        isPublic,
        initialAssetIds,
      });

      res.status(201).json({
        success: true,
        data: collection,
        meta: {
          timestamp: new Date().toISOString(),
        },
      });
    } catch (error) {
      if (error instanceof Error) {
        if (error.message.includes('already exists')) {
          res.status(409).json({
            success: false,
            error: {
              code: 'CONFLICT',
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
        if (error.message === 'Cover asset not found') {
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
      logger.error('Create collection failed', { error });
      next(error);
    }
  }

  /**
   * GET /api/assets/collections
   * Get all collections for workspace
   */
  static async getCollections(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const workspaceId = (req as any).workspaceId;

      if (!workspaceId) {
        res.status(401).json({
          success: false,
          error: {
            code: 'UNAUTHORIZED',
            message: 'Authentication required',
          },
        });
        return;
      }

      const collections = await assetCollectionService.getWorkspaceCollections(workspaceId);

      res.json({
        success: true,
        data: collections,
        meta: {
          count: collections.length,
          timestamp: new Date().toISOString(),
        },
      });
    } catch (error) {
      logger.error('Get collections failed', { error });
      next(error);
    }
  }

  /**
   * GET /api/assets/collections/:id
   * Get collection by ID
   */
  static async getCollection(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = (req as any).userId;
      const workspaceId = (req as any).workspaceId;
      const { id } = req.params;

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

      const collection = await assetCollectionService.getCollection(id, userId, workspaceId);

      res.json({
        success: true,
        data: collection,
        meta: {
          timestamp: new Date().toISOString(),
        },
      });
    } catch (error) {
      if (error instanceof Error && error.message === 'Collection not found') {
        res.status(404).json({
          success: false,
          error: {
            code: 'NOT_FOUND',
            message: error.message,
          },
        });
        return;
      }
      logger.error('Get collection failed', { error });
      next(error);
    }
  }

  /**
   * GET /api/assets/collections/:id/with-assets
   * Get collection with assets
   */
  static async getCollectionWithAssets(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = (req as any).userId;
      const workspaceId = (req as any).workspaceId;
      const { id } = req.params;
      const { limit } = req.query;

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

      const collection = await assetCollectionService.getCollectionWithAssets(
        id,
        userId,
        workspaceId,
        Math.min(parseInt(limit as string) || 50, 200)
      );

      res.json({
        success: true,
        data: collection,
        meta: {
          timestamp: new Date().toISOString(),
        },
      });
    } catch (error) {
      if (error instanceof Error && error.message === 'Collection not found') {
        res.status(404).json({
          success: false,
          error: {
            code: 'NOT_FOUND',
            message: error.message,
          },
        });
        return;
      }
      logger.error('Get collection with assets failed', { error });
      next(error);
    }
  }

  /**
   * PUT /api/assets/collections/:id
   * Update collection
   */
  static async updateCollection(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = (req as any).userId;
      const workspaceId = (req as any).workspaceId;
      const { id } = req.params;

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

      const { name, description, coverAssetId, smartQuery, isPublic } = req.body;

      const collection = await assetCollectionService.updateCollection({
        collectionId: id,
        userId,
        workspaceId,
        name,
        description,
        coverAssetId,
        smartQuery,
        isPublic,
      });

      res.json({
        success: true,
        data: collection,
        meta: {
          timestamp: new Date().toISOString(),
        },
      });
    } catch (error) {
      if (error instanceof Error) {
        if (error.message === 'Collection not found') {
          res.status(404).json({
            success: false,
            error: {
              code: 'NOT_FOUND',
              message: error.message,
            },
          });
          return;
        }
        if (error.message.includes('already exists')) {
          res.status(409).json({
            success: false,
            error: {
              code: 'CONFLICT',
              message: error.message,
            },
          });
          return;
        }
      }
      logger.error('Update collection failed', { error });
      next(error);
    }
  }

  /**
   * DELETE /api/assets/collections/:id
   * Delete collection
   */
  static async deleteCollection(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = (req as any).userId;
      const workspaceId = (req as any).workspaceId;
      const { id } = req.params;

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

      await assetCollectionService.deleteCollection(id, userId, workspaceId);

      res.status(204).send();
    } catch (error) {
      if (error instanceof Error && error.message === 'Collection not found') {
        res.status(404).json({
          success: false,
          error: {
            code: 'NOT_FOUND',
            message: error.message,
          },
        });
        return;
      }
      logger.error('Delete collection failed', { error });
      next(error);
    }
  }

  /**
   * POST /api/assets/collections/:id/restore
   * Restore collection
   */
  static async restoreCollection(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = (req as any).userId;
      const workspaceId = (req as any).workspaceId;
      const { id } = req.params;

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

      const collection = await assetCollectionService.restoreCollection(id, userId, workspaceId);

      res.json({
        success: true,
        data: collection,
        meta: {
          timestamp: new Date().toISOString(),
        },
      });
    } catch (error) {
      if (error instanceof Error && error.message === 'Collection not found') {
        res.status(404).json({
          success: false,
          error: {
            code: 'NOT_FOUND',
            message: error.message,
          },
        });
        return;
      }
      logger.error('Restore collection failed', { error });
      next(error);
    }
  }

  /**
   * POST /api/assets/collections/:id/assets
   * Add assets to collection
   */
  static async addAssetsToCollection(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = (req as any).userId;
      const workspaceId = (req as any).workspaceId;
      const { id } = req.params;

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

      const { assetIds } = req.body;

      if (!assetIds || !Array.isArray(assetIds) || assetIds.length === 0) {
        res.status(400).json({
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'assetIds array is required',
          },
        });
        return;
      }

      const count = await assetCollectionService.addAssetsToCollection(
        id,
        assetIds,
        userId,
        workspaceId
      );

      res.json({
        success: true,
        data: { added: count },
        meta: {
          timestamp: new Date().toISOString(),
        },
      });
    } catch (error) {
      if (error instanceof Error && error.message === 'Collection not found') {
        res.status(404).json({
          success: false,
          error: {
            code: 'NOT_FOUND',
            message: error.message,
          },
        });
        return;
      }
      logger.error('Add assets to collection failed', { error });
      next(error);
    }
  }

  /**
   * DELETE /api/assets/collections/:id/assets
   * Remove assets from collection
   */
  static async removeAssetsFromCollection(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = (req as any).userId;
      const workspaceId = (req as any).workspaceId;
      const { id } = req.params;

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

      const { assetIds } = req.body;

      if (!assetIds || !Array.isArray(assetIds) || assetIds.length === 0) {
        res.status(400).json({
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'assetIds array is required',
          },
        });
        return;
      }

      const count = await assetCollectionService.removeAssetsFromCollection(
        id,
        assetIds,
        userId,
        workspaceId
      );

      res.json({
        success: true,
        data: { removed: count },
        meta: {
          timestamp: new Date().toISOString(),
        },
      });
    } catch (error) {
      if (error instanceof Error && error.message === 'Collection not found') {
        res.status(404).json({
          success: false,
          error: {
            code: 'NOT_FOUND',
            message: error.message,
          },
        });
        return;
      }
      logger.error('Remove assets from collection failed', { error });
      next(error);
    }
  }

  /**
   * POST /api/assets/collections/:id/cover
   * Set collection cover
   */
  static async setCollectionCover(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = (req as any).userId;
      const workspaceId = (req as any).workspaceId;
      const { id } = req.params;

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

      const { assetId } = req.body;

      if (!assetId) {
        res.status(400).json({
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'assetId is required',
          },
        });
        return;
      }

      const collection = await assetCollectionService.setCollectionCover(
        id,
        assetId,
        userId,
        workspaceId
      );

      res.json({
        success: true,
        data: collection,
        meta: {
          timestamp: new Date().toISOString(),
        },
      });
    } catch (error) {
      if (error instanceof Error) {
        if (error.message === 'Collection not found' || error.message === 'Asset not found') {
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
      logger.error('Set collection cover failed', { error });
      next(error);
    }
  }

  /**
   * POST /api/assets/collections/:id/refresh
   * Refresh smart collection
   */
  static async refreshSmartCollection(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = (req as any).userId;
      const workspaceId = (req as any).workspaceId;
      const { id } = req.params;

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

      const assets = await assetCollectionService.refreshSmartCollection(
        id,
        userId,
        workspaceId
      );

      res.json({
        success: true,
        data: assets,
        meta: {
          count: assets.length,
          timestamp: new Date().toISOString(),
        },
      });
    } catch (error) {
      if (error instanceof Error) {
        if (error.message === 'Collection not found') {
          res.status(404).json({
            success: false,
            error: {
              code: 'NOT_FOUND',
              message: error.message,
            },
          });
          return;
        }
        if (error.message.includes('not a smart collection')) {
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
      logger.error('Refresh smart collection failed', { error });
      next(error);
    }
  }

  /**
   * GET /api/assets/collections/:id/statistics
   * Get collection statistics
   */
  static async getCollectionStatistics(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;

      const statistics = await assetCollectionService.getCollectionStatistics(id);

      res.json({
        success: true,
        data: statistics,
        meta: {
          timestamp: new Date().toISOString(),
        },
      });
    } catch (error) {
      if (error instanceof Error && error.message === 'Collection not found') {
        res.status(404).json({
          success: false,
          error: {
            code: 'NOT_FOUND',
            message: error.message,
          },
        });
        return;
      }
      logger.error('Get collection statistics failed', { error });
      next(error);
    }
  }

  /**
   * POST /api/assets/collections/:id/duplicate
   * Duplicate collection
   */
  static async duplicateCollection(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = (req as any).userId;
      const workspaceId = (req as any).workspaceId;
      const { id } = req.params;

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

      const { newName } = req.body;

      if (!newName) {
        res.status(400).json({
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'newName is required',
          },
        });
        return;
      }

      const collection = await assetCollectionService.duplicateCollection(
        id,
        newName,
        userId,
        workspaceId
      );

      res.status(201).json({
        success: true,
        data: collection,
        meta: {
          timestamp: new Date().toISOString(),
        },
      });
    } catch (error) {
      if (error instanceof Error) {
        if (error.message === 'Collection not found') {
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
      logger.error('Duplicate collection failed', { error });
      next(error);
    }
  }

  /**
   * GET /api/assets/collections/public
   * Get public collections
   */
  static async getPublicCollections(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const workspaceId = (req as any).workspaceId;

      if (!workspaceId) {
        res.status(401).json({
          success: false,
          error: {
            code: 'UNAUTHORIZED',
            message: 'Authentication required',
          },
        });
        return;
      }

      const collections = await assetCollectionService.getPublicCollections(workspaceId);

      res.json({
        success: true,
        data: collections,
        meta: {
          count: collections.length,
          timestamp: new Date().toISOString(),
        },
      });
    } catch (error) {
      logger.error('Get public collections failed', { error });
      next(error);
    }
  }

  /**
   * GET /api/assets/collections/smart
   * Get smart collections
   */
  static async getSmartCollections(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const workspaceId = (req as any).workspaceId;

      if (!workspaceId) {
        res.status(401).json({
          success: false,
          error: {
            code: 'UNAUTHORIZED',
            message: 'Authentication required',
          },
        });
        return;
      }

      const collections = await assetCollectionService.getSmartCollections(workspaceId);

      res.json({
        success: true,
        data: collections,
        meta: {
          count: collections.length,
          timestamp: new Date().toISOString(),
        },
      });
    } catch (error) {
      logger.error('Get smart collections failed', { error });
      next(error);
    }
  }
}