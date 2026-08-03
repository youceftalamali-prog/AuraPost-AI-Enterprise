/**
 * Project Search Controller
 * REST API endpoints for advanced project search
 * Phase: 5.3 Part 5
 */

import { Request, Response, NextFunction } from 'express';
import { projectSearchService } from '../services/ProjectSearchService';
import { PipelineLogger } from '../../core/logger/PipelineLogger';

const logger = new PipelineLogger('ProjectSearchController');

export class ProjectSearchController {
  /**
   * GET /api/projects/search
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
        status,
        visibility,
        type,
        isFavorite,
        isArchived,
        isTrashed,
        isPublished,
        tags,
        userId,
        dateFrom,
        dateTo,
        sortBy,
        sortDirection,
        page,
        limit,
      } = req.query;

      const result = await projectSearchService.search({
        workspaceId,
        query: q as string,
        status: status as string,
        visibility: visibility as string,
        type: type as string,
        isFavorite: isFavorite === 'true' ? true : isFavorite === 'false' ? false : undefined,
        isArchived: isArchived === 'true' ? true : isArchived === 'false' ? false : undefined,
        isTrashed: isTrashed === 'true' ? true : isTrashed === 'false' ? false : undefined,
        isPublished: isPublished === 'true' ? true : isPublished === 'false' ? false : undefined,
        tags: tags ? (tags as string).split(',') : undefined,
        userId: userId as string,
        dateFrom: dateFrom as string,
        dateTo: dateTo as string,
        sortBy: sortBy as string,
        sortDirection: sortDirection as 'asc' | 'desc',
        page: parseInt(page as string) || 1,
        limit: Math.min(parseInt(limit as string) || 20, 100),
      });

      res.json({
        success: true,
        data: result.projects,
        meta: {
          pagination: {
            page: result.page,
            limit: result.limit,
            totalItems: result.total,
            totalPages: result.totalPages,
          },
          query: {
            search: q,
            status,
            visibility,
            type,
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
   * GET /api/projects/search/fulltext
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

      const projects = await projectSearchService.fullTextSearch(
        workspaceId,
        q as string,
        Math.min(parseInt(limit as string) || 20, 50)
      );

      res.json({
        success: true,
        data: projects,
        meta: {
          query: q,
          count: projects.length,
          timestamp: new Date().toISOString(),
        },
      });
    } catch (error) {
      logger.error('Full text search failed', { error });
      next(error);
    }
  }

  /**
   * GET /api/projects/search/by-tags
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

      const projects = await projectSearchService.searchByTags(
        workspaceId,
        tagsArray,
        Math.min(parseInt(limit as string) || 20, 50)
      );

      res.json({
        success: true,
        data: projects,
        meta: {
          tags: tagsArray,
          count: projects.length,
          timestamp: new Date().toISOString(),
        },
      });
    } catch (error) {
      logger.error('Search by tags failed', { error });
      next(error);
    }
  }

  /**
   * GET /api/projects/search/by-date
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

      const projects = await projectSearchService.searchByDateRange(
        workspaceId,
        new Date(dateFrom as string),
        new Date(dateTo as string),
        Math.min(parseInt(limit as string) || 20, 50)
      );

      res.json({
        success: true,
        data: projects,
        meta: {
          dateFrom,
          dateTo,
          count: projects.length,
          timestamp: new Date().toISOString(),
        },
      });
    } catch (error) {
      logger.error('Search by date failed', { error });
      next(error);
    }
  }

  /**
   * GET /api/projects/search/by-status
   * Search by status
   */
  static async searchByStatus(req: Request, res: Response, next: NextFunction): Promise<void> {
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

      const { status, limit } = req.query;

      if (!status) {
        res.status(400).json({
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'status parameter is required',
          },
        });
        return;
      }

      const projects = await projectSearchService.getByStatus(
        workspaceId,
        status as string,
        Math.min(parseInt(limit as string) || 20, 50)
      );

      res.json({
        success: true,
        data: projects,
        meta: {
          status,
          count: projects.length,
          timestamp: new Date().toISOString(),
        },
      });
    } catch (error) {
      logger.error('Search by status failed', { error });
      next(error);
    }
  }

  /**
   * GET /api/projects/search/published
   * Get published projects
   */
  static async getPublished(req: Request, res: Response, next: NextFunction): Promise<void> {
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

      const { limit } = req.query;

      const projects = await projectSearchService.getPublished(
        workspaceId,
        Math.min(parseInt(limit as string) || 20, 50)
      );

      res.json({
        success: true,
        data: projects,
        meta: {
          count: projects.length,
          timestamp: new Date().toISOString(),
        },
      });
    } catch (error) {
      logger.error('Get published failed', { error });
      next(error);
    }
  }

  /**
   * GET /api/projects/search/by-user
   * Get projects by user
   */
  static async getByUser(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const workspaceId = (req as any).workspaceId;
      const userId = (req as any).userId;

      if (!workspaceId || !userId) {
        res.status(401).json({
          success: false,
          error: {
            code: 'UNAUTHORIZED',
            message: 'Authentication required',
          },
        });
        return;
      }

      const { targetUserId, limit } = req.query;

      if (!targetUserId) {
        res.status(400).json({
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'targetUserId parameter is required',
          },
        });
        return;
      }

      const projects = await projectSearchService.getByUser(
        workspaceId,
        targetUserId as string,
        Math.min(parseInt(limit as string) || 20, 50)
      );

      res.json({
        success: true,
        data: projects,
        meta: {
          userId: targetUserId,
          count: projects.length,
          timestamp: new Date().toISOString(),
        },
      });
    } catch (error) {
      logger.error('Get by user failed', { error });
      next(error);
    }
  }
}