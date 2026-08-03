/**
 * Project Controller
 * REST API endpoints for project CRUD and lifecycle operations
 * Phase: 5.3 Part 5
 */

import { Request, Response, NextFunction } from 'express';
import { projectService } from '../services/ProjectService';
import { projectSearchService } from '../services/ProjectSearchService';
import { PipelineLogger } from '../../core/logger/PipelineLogger';
import { ProjectStatus, ProjectVisibility, ProjectType } from '../types';

const logger = new PipelineLogger('ProjectController');

export class ProjectController {
  /**
   * POST /api/projects
   * Create a new project
   */
  static async createProject(req: Request, res: Response, next: NextFunction): Promise<void> {
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

      const { name, description, type, canvasWidth, canvasHeight, coverImageUrl, brandKitId, tags, visibility } = req.body;

      if (!name) {
        res.status(400).json({
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Project name is required',
          },
        });
        return;
      }

      const project = await projectService.createProject({
        workspaceId,
        userId,
        name,
        description,
        type,
        canvasWidth,
        canvasHeight,
        coverImageUrl,
        brandKitId,
        tags,
        visibility,
      });

      res.status(201).json({
        success: true,
        data: project,
        meta: {
          timestamp: new Date().toISOString(),
        },
      });
    } catch (error) {
      logger.error('Create project failed', { error });
      next(error);
    }
  }

  /**
   * GET /api/projects
   * List projects with filters and pagination
   */
  static async listProjects(req: Request, res: Response, next: NextFunction): Promise<void> {
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
        status,
        visibility,
        type,
        isFavorite,
        isArchived,
        isTrashed,
        isPublished,
        search,
        tags,
        sortBy,
        sortDirection,
        page,
        limit,
      } = req.query;

      const filters = {
        status: status as unknown as ProjectStatus,
        visibility: visibility as unknown as ProjectVisibility,
        type: type as unknown as ProjectType,
        isFavorite: isFavorite === 'true' ? true : isFavorite === 'false' ? false : undefined,
        isArchived: isArchived === 'true' ? true : isArchived === 'false' ? false : undefined,
        isTrashed: isTrashed === 'true' ? true : isTrashed === 'false' ? false : undefined,
        isPublished: isPublished === 'true' ? true : isPublished === 'false' ? false : undefined,
        search: search as string,
        tags: tags ? (tags as string).split(',') : undefined,
      };

      const pagination = {
        page: parseInt(page as string) || 1,
        limit: Math.min(parseInt(limit as string) || 20, 100),
        sortBy: ((sortBy as string) || 'updatedAt') as 'name' | 'lastOpenedAt' | 'createdAt' | 'updatedAt',
        sortDirection: (sortDirection as 'asc' | 'desc') || 'desc',
      };

      const result = await projectService.listProjects(workspaceId, filters, pagination);

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
          timestamp: new Date().toISOString(),
        },
      });
    } catch (error) {
      logger.error('List projects failed', { error });
      next(error);
    }
  }

  /**
   * GET /api/projects/:id
   * Get project by ID
   */
  static async getProject(req: Request, res: Response, next: NextFunction): Promise<void> {
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

      const project = await projectService.getProject(id, userId, workspaceId);

      res.json({
        success: true,
        data: project,
        meta: {
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
      logger.error('Get project failed', { error });
      next(error);
    }
  }

  /**
   * PUT /api/projects/:id
   * Update project
   */
  static async updateProject(req: Request, res: Response, next: NextFunction): Promise<void> {
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
        type,
        canvasWidth,
        canvasHeight,
        coverImageUrl,
        thumbnailUrl,
        brandKitId,
        tags,
        visibility,
        metadata,
      } = req.body;

      const project = await projectService.updateProject({
        projectId: id,
        userId,
        workspaceId,
        name,
        description,
        type,
        canvasWidth,
        canvasHeight,
        coverImageUrl,
        thumbnailUrl,
        brandKitId,
        tags,
        visibility,
        metadata,
      });

      res.json({
        success: true,
        data: project,
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
        if (error.message === 'Project is locked and cannot be edited') {
          res.status(403).json({
            success: false,
            error: {
              code: 'LOCKED',
              message: error.message,
            },
          });
          return;
        }
      }
      logger.error('Update project failed', { error });
      next(error);
    }
  }

  /**
   * DELETE /api/projects/:id
   * Soft delete project (move to trash)
   */
  static async deleteProject(req: Request, res: Response, next: NextFunction): Promise<void> {
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

      await projectService.deleteProject(id, userId, workspaceId);

      res.status(204).send();
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
      logger.error('Delete project failed', { error });
      next(error);
    }
  }

  /**
   * POST /api/projects/:id/archive
   * Archive project
   */
  static async archiveProject(req: Request, res: Response, next: NextFunction): Promise<void> {
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

      const project = await projectService.archiveProject(id, userId, workspaceId);

      res.json({
        success: true,
        data: project,
        meta: {
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
      logger.error('Archive project failed', { error });
      next(error);
    }
  }

  /**
   * POST /api/projects/:id/restore
   * Restore project from trash
   */
  static async restoreProject(req: Request, res: Response, next: NextFunction): Promise<void> {
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

      const project = await projectService.restoreProject(id, userId, workspaceId);

      res.json({
        success: true,
        data: project,
        meta: {
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
      logger.error('Restore project failed', { error });
      next(error);
    }
  }

  /**
   * POST /api/projects/:id/publish
   * Publish project
   */
  static async publishProject(req: Request, res: Response, next: NextFunction): Promise<void> {
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

      const project = await projectService.publishProject(id, userId, workspaceId);

      res.json({
        success: true,
        data: project,
        meta: {
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
      logger.error('Publish project failed', { error });
      next(error);
    }
  }

  /**
   * POST /api/projects/:id/favorite
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

      const project = await projectService.toggleFavorite(id, userId, workspaceId);

      res.json({
        success: true,
        data: project,
        meta: {
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
      logger.error('Toggle favorite failed', { error });
      next(error);
    }
  }

  /**
   * POST /api/projects/:id/lock
   * Toggle lock
   */
  static async toggleLock(req: Request, res: Response, next: NextFunction): Promise<void> {
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

      const project = await projectService.toggleLock(id, userId, workspaceId);

      res.json({
        success: true,
        data: project,
        meta: {
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
      logger.error('Toggle lock failed', { error });
      next(error);
    }
  }

  /**
   * GET /api/projects/search
   * Search projects
   */
  static async searchProjects(req: Request, res: Response, next: NextFunction): Promise<void> {
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
          },
          timestamp: new Date().toISOString(),
        },
      });
    } catch (error) {
      logger.error('Search projects failed', { error });
      next(error);
    }
  }

  /**
   * GET /api/projects/recent
   * Get recent projects
   */
  static async getRecentProjects(req: Request, res: Response, next: NextFunction): Promise<void> {
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

      const { limit } = req.query;

      const projects = await projectSearchService.getRecent(
        workspaceId,
        userId,
        Math.min(parseInt(limit as string) || 10, 50)
      );

      res.json({
        success: true,
        data: projects,
        meta: {
          timestamp: new Date().toISOString(),
        },
      });
    } catch (error) {
      logger.error('Get recent projects failed', { error });
      next(error);
    }
  }

  /**
   * GET /api/projects/favorites
   * Get favorite projects
   */
  static async getFavoriteProjects(req: Request, res: Response, next: NextFunction): Promise<void> {
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

      const projects = await projectSearchService.getFavorites(workspaceId, userId);

      res.json({
        success: true,
        data: projects,
        meta: {
          timestamp: new Date().toISOString(),
        },
      });
    } catch (error) {
      logger.error('Get favorite projects failed', { error });
      next(error);
    }
  }

  /**
   * GET /api/projects/archived
   * Get archived projects
   */
  static async getArchivedProjects(req: Request, res: Response, next: NextFunction): Promise<void> {
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

      const projects = await projectSearchService.getArchived(workspaceId);

      res.json({
        success: true,
        data: projects,
        meta: {
          timestamp: new Date().toISOString(),
        },
      });
    } catch (error) {
      logger.error('Get archived projects failed', { error });
      next(error);
    }
  }

  /**
   * GET /api/projects/trash
   * Get trashed projects
   */
  static async getTrashedProjects(req: Request, res: Response, next: NextFunction): Promise<void> {
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

      const projects = await projectSearchService.getTrash(workspaceId);

      res.json({
        success: true,
        data: projects,
        meta: {
          timestamp: new Date().toISOString(),
        },
      });
    } catch (error) {
      logger.error('Get trashed projects failed', { error });
      next(error);
    }
  }
}