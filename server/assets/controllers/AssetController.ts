/**
 * Asset Controller
 * REST API endpoints for asset CRUD and lifecycle operations
 * Phase: 5.3 Part 5
 */

import { Request, Response, NextFunction } from 'express';
import { assetService } from '../services/AssetService';
import { assetSearchService } from '../services/AssetSearchService';
import { PipelineLogger } from '../../core/logger/PipelineLogger';
import { AssetType, AssetStatus } from '../types';

const logger = new PipelineLogger('AssetController');

export class AssetController {
  /**
   * POST /api/assets
   * Create a new asset
   */
  static async createAsset(req: Request, res: Response, next: NextFunction): Promise<void> {
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
        type,
        mimeType,
        fileSize,
        originalUrl,
        originalName,
        fileExtension,
        width,
        height,
        thumbnailUrl,
        previewUrl,
        projectId,
        folderId,
        collectionIds,
        tags,
        keywords,
        dominantColor,
        colorPalette,
        exifData,
        metadata,
        generationPrompt,
        negativePrompt,
        aiModel,
        seed,
        provider,
        source,
        creator,
        license,
        permissionLevel,
      } = req.body;

      if (!name) {
        res.status(400).json({
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Asset name is required',
          },
        });
        return;
      }

      if (!type || !mimeType || !fileSize || !originalUrl) {
        res.status(400).json({
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'type, mimeType, fileSize, and originalUrl are required',
          },
        });
        return;
      }

      const asset = await assetService.createAsset({
        workspaceId,
        userId,
        name,
        description,
        type,
        mimeType,
        fileSize,
        originalUrl,
        originalName,
        fileExtension,
        width,
        height,
        thumbnailUrl,
        previewUrl,
        projectId,
        folderId,
        collectionIds,
        tags,
        keywords,
        dominantColor,
        colorPalette,
        exifData,
        metadata,
        generationPrompt,
        negativePrompt,
        aiModel,
        seed,
        provider,
        source,
        creator,
        license,
        permissionLevel,
      });

      res.status(201).json({
        success: true,
        data: asset,
        meta: {
          timestamp: new Date().toISOString(),
        },
      });
    } catch (error) {
      if (error instanceof Error) {
        if (error.message.includes('quota exceeded')) {
          res.status(403).json({
            success: false,
            error: {
              code: 'QUOTA_EXCEEDED',
              message: error.message,
            },
          });
          return;
        }
      }
      logger.error('Create asset failed', { error });
      next(error);
    }
  }

  /**
   * GET /api/assets
   * List assets with filters and pagination
   */
  static async listAssets(req: Request, res: Response, next: NextFunction): Promise<void> {
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

      const {
        type,
        status,
        folderId,
        collectionId,
        tags,
        keywords,
        isFavorite,
        isPinned,
        projectId,
        userId,
        dateFrom,
        dateTo,
        fileSizeMin,
        fileSizeMax,
        widthMin,
        widthMax,
        heightMin,
        heightMax,
        dominantColor,
        search,
        mimeType,
        aiGenerated,
        sortBy,
        sortDirection,
        page,
        limit,
      } = req.query;

      const filters = {
        type: type ? ((Array.isArray(type) ? type : [type]) as unknown as AssetType[]) : undefined,
        status: status as unknown as AssetStatus,
        folderId: folderId as string,
        collectionId: collectionId as string,
        tags: tags ? (tags as string).split(',') : undefined,
        keywords: keywords ? (keywords as string).split(',') : undefined,
        isFavorite: isFavorite === 'true' ? true : isFavorite === 'false' ? false : undefined,
        isPinned: isPinned === 'true' ? true : isPinned === 'false' ? false : undefined,
        projectId: projectId as string,
        userId: userId as string,
        dateFrom: dateFrom ? new Date(dateFrom as string) : undefined,
        dateTo: dateTo ? new Date(dateTo as string) : undefined,
        fileSizeMin: fileSizeMin ? parseInt(fileSizeMin as string) : undefined,
        fileSizeMax: fileSizeMax ? parseInt(fileSizeMax as string) : undefined,
        widthMin: widthMin ? parseInt(widthMin as string) : undefined,
        widthMax: widthMax ? parseInt(widthMax as string) : undefined,
        heightMin: heightMin ? parseInt(heightMin as string) : undefined,
        heightMax: heightMax ? parseInt(heightMax as string) : undefined,
        dominantColor: dominantColor as string,
        search: search as string,
        mimeType: mimeType as string,
        aiGenerated: aiGenerated === 'true' ? true : aiGenerated === 'false' ? false : undefined,
      };

      const pagination = {
        page: parseInt(page as string) || 1,
        limit: Math.min(parseInt(limit as string) || 20, 100),
        sortBy: ((sortBy as string) || 'createdAt') as 'name' | 'createdAt' | 'updatedAt' | 'usageCount' | 'fileSize',
        sortDirection: (sortDirection as 'asc' | 'desc') || 'desc',
      };

      const result = await assetService.listAssets(workspaceId, filters, pagination);

      res.json({
        success: true,
        data: result.assets,
        meta: {
          pagination: {
            page: result.page,
            limit: result.limit,
            totalItems: result.total,
            totalPages: result.totalPages,
          },
          timestamp: new Date().toISOString(),
        },
      });
    } catch (error) {
      logger.error('List assets failed', { error });
      next(error);
    }
  }

  /**
   * GET /api/assets/:id
   * Get asset by ID
   */
  static async getAsset(req: Request, res: Response, next: NextFunction): Promise<void> {
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

      const asset = await assetService.getAsset(id, userId, workspaceId);

      res.json({
        success: true,
        data: asset,
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
      logger.error('Get asset failed', { error });
      next(error);
    }
  }

  /**
   * PUT /api/assets/:id
   * Update asset
   */
  static async updateAsset(req: Request, res: Response, next: NextFunction): Promise<void> {
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

      const {
        name,
        description,
        folderId,
        collectionIds,
        tags,
        keywords,
        projectId,
        thumbnailUrl,
        previewUrl,
        dominantColor,
        colorPalette,
        metadata,
      } = req.body;

      const asset = await assetService.updateAsset({
        assetId: id,
        userId,
        workspaceId,
        name,
        description,
        folderId,
        collectionIds,
        tags,
        keywords,
        projectId,
        thumbnailUrl,
        previewUrl,
        dominantColor,
        colorPalette,
        metadata,
      });

      res.json({
        success: true,
        data: asset,
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
      }
      logger.error('Update asset failed', { error });
      next(error);
    }
  }

  /**
   * DELETE /api/assets/:id
   * Soft delete asset (move to trash)
   */
  static async deleteAsset(req: Request, res: Response, next: NextFunction): Promise<void> {
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

      await assetService.deleteAsset(id, userId, workspaceId);

      res.status(204).send();
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
      logger.error('Delete asset failed', { error });
      next(error);
    }
  }

  /**
   * POST /api/assets/:id/restore
   * Restore asset from trash
   */
  static async restoreAsset(req: Request, res: Response, next: NextFunction): Promise<void> {
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

      const asset = await assetService.restoreAsset(id, userId, workspaceId);

      res.json({
        success: true,
        data: asset,
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
      logger.error('Restore asset failed', { error });
      next(error);
    }
  }

  /**
   * POST /api/assets/:id/archive
   * Archive asset
   */
  static async archiveAsset(req: Request, res: Response, next: NextFunction): Promise<void> {
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

      const asset = await assetService.archiveAsset(id, userId, workspaceId);

      res.json({
        success: true,
        data: asset,
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
      logger.error('Archive asset failed', { error });
      next(error);
    }
  }

  /**
   * POST /api/assets/:id/favorite
   * Toggle favorite
   */
  static async toggleFavorite(req: Request, res: Response, next: NextFunction): Promise<void> {
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

      const asset = await assetService.toggleFavorite(id, userId, workspaceId);

      res.json({
        success: true,
        data: asset,
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
      logger.error('Toggle favorite failed', { error });
      next(error);
    }
  }

  /**
   * POST /api/assets/:id/pin
   * Toggle pin
   */
  static async togglePin(req: Request, res: Response, next: NextFunction): Promise<void> {
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

      const asset = await assetService.togglePin(id, userId, workspaceId);

      res.json({
        success: true,
        data: asset,
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
      logger.error('Toggle pin failed', { error });
      next(error);
    }
  }

  /**
   * POST /api/assets/bulk
   * Execute bulk action
   */
  static async executeBulkAction(req: Request, res: Response, next: NextFunction): Promise<void> {
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

      const { assetIds, action, data } = req.body;

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

      if (!action) {
        res.status(400).json({
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'action is required',
          },
        });
        return;
      }

      const result = await assetService.executeBulkAction(
        { assetIds, action, data },
        userId,
        workspaceId
      );

      res.json({
        success: true,
        data: result,
        meta: {
          timestamp: new Date().toISOString(),
        },
      });
    } catch (error) {
      logger.error('Bulk action failed', { error });
      next(error);
    }
  }

  /**
   * GET /api/assets/favorites
   * Get favorite assets
   */
  static async getFavoriteAssets(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const workspaceId = (req as any).workspaceId;
      const { limit } = req.query;

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

      const assets = await assetService.getFavoriteAssets(
        workspaceId,
        Math.min(parseInt(limit as string) || 50, 100)
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
      logger.error('Get favorite assets failed', { error });
      next(error);
    }
  }

  /**
   * GET /api/assets/pinned
   * Get pinned assets
   */
  static async getPinnedAssets(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const workspaceId = (req as any).workspaceId;
      const { limit } = req.query;

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

      const assets = await assetService.getPinnedAssets(
        workspaceId,
        Math.min(parseInt(limit as string) || 50, 100)
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
      logger.error('Get pinned assets failed', { error });
      next(error);
    }
  }

  /**
   * GET /api/assets/recent
   * Get recent assets
   */
  static async getRecentAssets(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const workspaceId = (req as any).workspaceId;
      const { limit } = req.query;

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

      const assets = await assetService.getRecentAssets(
        workspaceId,
        Math.min(parseInt(limit as string) || 10, 50)
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
      logger.error('Get recent assets failed', { error });
      next(error);
    }
  }

  /**
   * GET /api/assets/most-used
   * Get most used assets
   */
  static async getMostUsedAssets(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const workspaceId = (req as any).workspaceId;
      const { limit } = req.query;

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

      const assets = await assetService.getMostUsedAssets(
        workspaceId,
        Math.min(parseInt(limit as string) || 10, 50)
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
      logger.error('Get most used assets failed', { error });
      next(error);
    }
  }

  /**
   * GET /api/assets/ai-generated
   * Get AI generated assets
   */
  static async getAIGeneratedAssets(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const workspaceId = (req as any).workspaceId;
      const { limit } = req.query;

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

      const assets = await assetService.getAIGeneratedAssets(
        workspaceId,
        Math.min(parseInt(limit as string) || 50, 100)
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
      logger.error('Get AI generated assets failed', { error });
      next(error);
    }
  }

  /**
   * GET /api/assets/trash
   * Get trashed assets
   */
  static async getTrashedAssets(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const workspaceId = (req as any).workspaceId;
      const { limit } = req.query;

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

      const assets = await assetService.getTrashedAssets(
        workspaceId,
        Math.min(parseInt(limit as string) || 50, 100)
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
      logger.error('Get trashed assets failed', { error });
      next(error);
    }
  }

  /**
   * GET /api/assets/archived
   * Get archived assets
   */
  static async getArchivedAssets(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const workspaceId = (req as any).workspaceId;
      const { limit } = req.query;

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

      const assets = await assetService.getArchivedAssets(
        workspaceId,
        Math.min(parseInt(limit as string) || 50, 100)
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
      logger.error('Get archived assets failed', { error });
      next(error);
    }
  }

  /**
   * GET /api/assets/:id/statistics
   * Get asset statistics
   */
  static async getAssetStatistics(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;

      const statistics = await assetService.getAssetStatistics(id);

      res.json({
        success: true,
        data: statistics,
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
      logger.error('Get asset statistics failed', { error });
      next(error);
    }
  }

  /**
   * GET /api/assets/workspace/statistics
   * Get workspace statistics
   */
  static async getWorkspaceStatistics(req: Request, res: Response, next: NextFunction): Promise<void> {
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

      const statistics = await assetService.getWorkspaceStatistics(workspaceId);

      res.json({
        success: true,
        data: statistics,
        meta: {
          timestamp: new Date().toISOString(),
        },
      });
    } catch (error) {
      logger.error('Get workspace statistics failed', { error });
      next(error);
    }
  }

  /**
   * GET /api/assets/duplicates
   * Find duplicate assets
   */
  static async findDuplicateAssets(req: Request, res: Response, next: NextFunction): Promise<void> {
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

      const duplicates = await assetService.findDuplicateAssets(workspaceId);

      res.json({
        success: true,
        data: duplicates,
        meta: {
          count: duplicates.length,
          timestamp: new Date().toISOString(),
        },
      });
    } catch (error) {
      logger.error('Find duplicate assets failed', { error });
      next(error);
    }
  }
}