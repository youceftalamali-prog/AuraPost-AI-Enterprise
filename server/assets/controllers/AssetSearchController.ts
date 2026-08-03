/**
 * Asset Search Controller
 * REST API endpoints for advanced asset search
 * Phase: 5.3 Part 5
 */

import { Request, Response, NextFunction } from 'express';
import { assetSearchService } from '../services/AssetSearchService';
import { PipelineLogger } from '../../core/logger/PipelineLogger';
import { AssetType } from '../types';

const logger = new PipelineLogger('AssetSearchController');

export class AssetSearchController {
  /**
   * GET /api/assets/search
   * Advanced search with filters
   */
  static async search(req: Request, res: Response, next: NextFunction): Promise<void> {
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
        q,
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
        mimeType,
        aiGenerated,
        sortBy,
        sortDirection,
        page,
        limit,
      } = req.query;

      const result = await assetSearchService.search({
        workspaceId,
        query: q as string,
        type: type ? ((Array.isArray(type) ? type : [type]) as unknown as AssetType[]) : undefined,
        status: status as string,
        folderId: folderId as string,
        collectionId: collectionId as string,
        tags: tags ? (tags as string).split(',') : undefined,
        keywords: keywords ? (keywords as string).split(',') : undefined,
        isFavorite: isFavorite === 'true' ? true : isFavorite === 'false' ? false : undefined,
        isPinned: isPinned === 'true' ? true : isPinned === 'false' ? false : undefined,
        projectId: projectId as string,
        userId: userId as string,
        dateFrom: dateFrom as string,
        dateTo: dateTo as string,
        fileSizeMin: fileSizeMin ? parseInt(fileSizeMin as string) : undefined,
        fileSizeMax: fileSizeMax ? parseInt(fileSizeMax as string) : undefined,
        widthMin: widthMin ? parseInt(widthMin as string) : undefined,
        widthMax: widthMax ? parseInt(widthMax as string) : undefined,
        heightMin: heightMin ? parseInt(heightMin as string) : undefined,
        heightMax: heightMax ? parseInt(heightMax as string) : undefined,
        dominantColor: dominantColor as string,
        mimeType: mimeType as string,
        aiGenerated: aiGenerated === 'true' ? true : aiGenerated === 'false' ? false : undefined,
        sortBy: sortBy as string,
        sortDirection: sortDirection as 'asc' | 'desc',
        page: parseInt(page as string) || 1,
        limit: Math.min(parseInt(limit as string) || 20, 100),
      });

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
          query: {
            search: q,
            type,
            status,
          },
          timestamp: new Date().toISOString(),
        },
      });
    } catch (error) {
      logger.error('Search failed', { error });
      next(error);
    }
  }

  /**
   * GET /api/assets/search/fulltext
   * Full text search
   */
  static async fullTextSearch(req: Request, res: Response, next: NextFunction): Promise<void> {
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

      const { q, limit } = req.query;

      if (!q || (q as string).trim().length < 2) {
        res.json({
          success: true,
          data: [],
          meta: {
            timestamp: new Date().toISOString(),
          },
        });
        return;
      }

      const assets = await assetSearchService.fullTextSearch(
        workspaceId,
        q as string,
        Math.min(parseInt(limit as string) || 20, 50)
      );

      res.json({
        success: true,
        data: assets,
        meta: {
          query: q,
          count: assets.length,
          timestamp: new Date().toISOString(),
        },
      });
    } catch (error) {
      logger.error('Full text search failed', { error });
      next(error);
    }
  }

  /**
   * GET /api/assets/search/by-tags
   * Search by tags
   */
  static async searchByTags(req: Request, res: Response, next: NextFunction): Promise<void> {
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

      const { tags, limit } = req.query;

      if (!tags) {
        res.status(400).json({
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'tags parameter is required',
          },
        });
        return;
      }

      const tagsArray = (tags as string).split(',').map(t => t.trim());

      const assets = await assetSearchService.searchByTags(
        workspaceId,
        tagsArray,
        Math.min(parseInt(limit as string) || 20, 50)
      );

      res.json({
        success: true,
        data: assets,
        meta: {
          tags: tagsArray,
          count: assets.length,
          timestamp: new Date().toISOString(),
        },
      });
    } catch (error) {
      logger.error('Search by tags failed', { error });
      next(error);
    }
  }

  /**
   * GET /api/assets/search/by-color
   * Search by color
   */
  static async searchByColor(req: Request, res: Response, next: NextFunction): Promise<void> {
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

      const { color, limit } = req.query;

      if (!color) {
        res.status(400).json({
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'color parameter is required',
          },
        });
        return;
      }

      const assets = await assetSearchService.searchByColor(
        workspaceId,
        color as string,
        Math.min(parseInt(limit as string) || 20, 50)
      );

      res.json({
        success: true,
        data: assets,
        meta: {
          color,
          count: assets.length,
          timestamp: new Date().toISOString(),
        },
      });
    } catch (error) {
      logger.error('Search by color failed', { error });
      next(error);
    }
  }

  /**
   * GET /api/assets/search/by-date
   * Search by date range
   */
  static async searchByDate(req: Request, res: Response, next: NextFunction): Promise<void> {
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

      const { dateFrom, dateTo, limit } = req.query;

      if (!dateFrom || !dateTo) {
        res.status(400).json({
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'dateFrom and dateTo parameters are required',
          },
        });
        return;
      }

      const assets = await assetSearchService.searchByDateRange(
        workspaceId,
        new Date(dateFrom as string),
        new Date(dateTo as string),
        Math.min(parseInt(limit as string) || 20, 50)
      );

      res.json({
        success: true,
        data: assets,
        meta: {
          dateFrom,
          dateTo,
          count: assets.length,
          timestamp: new Date().toISOString(),
        },
      });
    } catch (error) {
      logger.error('Search by date failed', { error });
      next(error);
    }
  }

  /**
   * GET /api/assets/search/by-size
   * Search by file size range
   */
  static async searchBySize(req: Request, res: Response, next: NextFunction): Promise<void> {
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

      const { minSize, maxSize, limit } = req.query;

      if (!minSize || !maxSize) {
        res.status(400).json({
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'minSize and maxSize parameters are required',
          },
        });
        return;
      }

      const assets = await assetSearchService.searchByFileSize(
        workspaceId,
        parseInt(minSize as string),
        parseInt(maxSize as string),
        Math.min(parseInt(limit as string) || 20, 50)
      );

      res.json({
        success: true,
        data: assets,
        meta: {
          minSize,
          maxSize,
          count: assets.length,
          timestamp: new Date().toISOString(),
        },
      });
    } catch (error) {
      logger.error('Search by size failed', { error });
      next(error);
    }
  }

  /**
   * GET /api/assets/search/by-dimensions
   * Search by dimensions
   */
  static async searchByDimensions(req: Request, res: Response, next: NextFunction): Promise<void> {
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

      const { widthMin, widthMax, heightMin, heightMax, limit } = req.query;

      const assets = await assetSearchService.searchByDimensions(
        workspaceId,
        widthMin ? parseInt(widthMin as string) : undefined,
        widthMax ? parseInt(widthMax as string) : undefined,
        heightMin ? parseInt(heightMin as string) : undefined,
        heightMax ? parseInt(heightMax as string) : undefined,
        Math.min(parseInt(limit as string) || 20, 50)
      );

      res.json({
        success: true,
        data: assets,
        meta: {
          widthMin,
          widthMax,
          heightMin,
          heightMax,
          count: assets.length,
          timestamp: new Date().toISOString(),
        },
      });
    } catch (error) {
      logger.error('Search by dimensions failed', { error });
      next(error);
    }
  }

  /**
   * GET /api/assets/search/by-type/:type
   * Get assets by type
   */
  static async getByType(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const workspaceId = (req as any).workspaceId;
      const { type } = req.params;
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

      const assets = await assetSearchService.getByType(
        workspaceId,
        type as any,
        Math.min(parseInt(limit as string) || 20, 50)
      );

      res.json({
        success: true,
        data: assets,
        meta: {
          type,
          count: assets.length,
          timestamp: new Date().toISOString(),
        },
      });
    } catch (error) {
      logger.error('Get by type failed', { error });
      next(error);
    }
  }

  /**
   * GET /api/assets/search/suggestions
   * Get search suggestions (autocomplete)
   */
  static async getSearchSuggestions(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const workspaceId = (req as any).workspaceId;
      const { prefix, limit } = req.query;

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

      if (!prefix || (prefix as string).length < 2) {
        res.json({
          success: true,
          data: [],
          meta: {
            timestamp: new Date().toISOString(),
          },
        });
        return;
      }

      const suggestions = await assetSearchService.getSearchSuggestions(
        workspaceId,
        prefix as string,
        Math.min(parseInt(limit as string) || 10, 20)
      );

      res.json({
        success: true,
        data: suggestions,
        meta: {
          prefix,
          count: suggestions.length,
          timestamp: new Date().toISOString(),
        },
      });
    } catch (error) {
      logger.error('Get search suggestions failed', { error });
      next(error);
    }
  }

  /**
   * GET /api/assets/search/facets
   * Get search facets (for filtering UI)
   */
  static async getSearchFacets(req: Request, res: Response, next: NextFunction): Promise<void> {
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

      const facets = await assetSearchService.getSearchFacets(workspaceId);

      res.json({
        success: true,
        data: facets,
        meta: {
          timestamp: new Date().toISOString(),
        },
      });
    } catch (error) {
      logger.error('Get search facets failed', { error });
      next(error);
    }
  }

  /**
   * GET /api/assets/search/similar/:id
   * Find similar assets
   */
  static async findSimilarAssets(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const workspaceId = (req as any).workspaceId;
      const { id } = req.params;
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

      const assets = await assetSearchService.findSimilarAssets(
        id,
        workspaceId,
        Math.min(parseInt(limit as string) || 10, 20)
      );

      res.json({
        success: true,
        data: assets,
        meta: {
          sourceAssetId: id,
          count: assets.length,
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
      logger.error('Find similar assets failed', { error });
      next(error);
    }
  }

  /**
   * GET /api/assets/search/count-by-type
   * Get asset count by type
   */
  static async getCountByType(req: Request, res: Response, next: NextFunction): Promise<void> {
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

      const counts = await assetSearchService.getCountByType(workspaceId);

      res.json({
        success: true,
        data: counts,
        meta: {
          timestamp: new Date().toISOString(),
        },
      });
    } catch (error) {
      logger.error('Get count by type failed', { error });
      next(error);
    }
  }
}