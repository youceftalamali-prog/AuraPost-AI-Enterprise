/**
 * Project Page Controller
 * REST API endpoints for project page management
 * Phase: 5.3 Part 5
 */

import { Request, Response, NextFunction } from 'express';
import { projectPageService } from '../services/ProjectPageService';
import { PipelineLogger } from '../../core/logger/PipelineLogger';

const logger = new PipelineLogger('ProjectPageController');

export class ProjectPageController {
  /**
   * GET /api/projects/:id/pages
   * List all pages for a project
   */
  static async listPages(req: Request, res: Response, next: NextFunction): Promise<void> {
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

      const pages = await projectPageService.getProjectPages(projectId, userId, workspaceId);

      res.json({
        success: true,
        data: pages,
        meta: {
          count: pages.length,
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
      logger.error('List pages failed', { error });
      next(error);
    }
  }

  /**
   * POST /api/projects/:id/pages
   * Create a new page
   */
  static async createPage(req: Request, res: Response, next: NextFunction): Promise<void> {
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

      const { name, canvasData, layersSnapshot, width, height } = req.body;

      const page = await projectPageService.createPage(
        projectId,
        userId,
        workspaceId,
        { name, canvasData, layersSnapshot, width, height }
      );

      res.status(201).json({
        success: true,
        data: page,
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
        if (error.message === 'Project is locked' || error.message === 'Cannot add pages to a trashed project') {
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
      logger.error('Create page failed', { error });
      next(error);
    }
  }

  /**
   * GET /api/pages/:id
   * Get page by ID
   */
  static async getPage(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = (req as any).userId;
      const workspaceId = (req as any).workspaceId;
      const { id: pageId } = req.params;
      const { projectId } = req.query;

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

      if (!projectId) {
        res.status(400).json({
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'projectId query parameter is required',
          },
        });
        return;
      }

      const page = await projectPageService.getPage(
        pageId,
        projectId as string,
        userId,
        workspaceId
      );

      res.json({
        success: true,
        data: page,
        meta: {
          timestamp: new Date().toISOString(),
        },
      });
    } catch (error) {
      if (error instanceof Error && error.message === 'Page not found') {
        res.status(404).json({
          success: false,
          error: {
            code: 'NOT_FOUND',
            message: error.message,
          },
        });
        return;
      }
      logger.error('Get page failed', { error });
      next(error);
    }
  }

  /**
   * PUT /api/pages/:id
   * Update page
   */
  static async updatePage(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = (req as any).userId;
      const workspaceId = (req as any).workspaceId;
      const { id: pageId } = req.params;
      const { projectId } = req.query;

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

      if (!projectId) {
        res.status(400).json({
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'projectId query parameter is required',
          },
        });
        return;
      }

      const { name, canvasData, layersSnapshot, thumbnailUrl, width, height } = req.body;

      const page = await projectPageService.updatePage(
        pageId,
        projectId as string,
        userId,
        workspaceId,
        { name, canvasData, layersSnapshot, thumbnailUrl, width, height }
      );

      res.json({
        success: true,
        data: page,
        meta: {
          timestamp: new Date().toISOString(),
        },
      });
    } catch (error) {
      if (error instanceof Error) {
        if (error.message === 'Page not found') {
          res.status(404).json({
            success: false,
            error: {
              code: 'NOT_FOUND',
              message: error.message,
            },
          });
          return;
        }
        if (error.message === 'Project is locked') {
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
      logger.error('Update page failed', { error });
      next(error);
    }
  }

  /**
   * DELETE /api/pages/:id
   * Delete page
   */
  static async deletePage(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = (req as any).userId;
      const workspaceId = (req as any).workspaceId;
      const { id: pageId } = req.params;
      const { projectId } = req.query;

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

      if (!projectId) {
        res.status(400).json({
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'projectId query parameter is required',
          },
        });
        return;
      }

      await projectPageService.deletePage(
        pageId,
        projectId as string,
        userId,
        workspaceId
      );

      res.status(204).send();
    } catch (error) {
      if (error instanceof Error) {
        if (error.message === 'Page not found') {
          res.status(404).json({
            success: false,
            error: {
              code: 'NOT_FOUND',
              message: error.message,
            },
          });
          return;
        }
        if (error.message === 'Cannot delete the last page of a project') {
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
      logger.error('Delete page failed', { error });
      next(error);
    }
  }

  /**
   * POST /api/pages/reorder
   * Reorder pages
   */
  static async reorderPages(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = (req as any).userId;
      const workspaceId = (req as any).workspaceId;
      const { projectId, pageIds } = req.body;

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

      if (!projectId || !Array.isArray(pageIds)) {
        res.status(400).json({
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'projectId and pageIds array are required',
          },
        });
        return;
      }

      await projectPageService.reorderPages(projectId, userId, workspaceId, pageIds);

      res.json({
        success: true,
        data: { projectId, pageIds },
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
        if (error.message === 'Project is locked') {
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
      logger.error('Reorder pages failed', { error });
      next(error);
    }
  }

  /**
   * POST /api/pages/:id/duplicate
   * Duplicate page
   */
  static async duplicatePage(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = (req as any).userId;
      const workspaceId = (req as any).workspaceId;
      const { id: pageId } = req.params;
      const { projectId } = req.query;

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

      if (!projectId) {
        res.status(400).json({
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'projectId query parameter is required',
          },
        });
        return;
      }

      const page = await projectPageService.duplicatePage(
        pageId,
        projectId as string,
        userId,
        workspaceId
      );

      res.status(201).json({
        success: true,
        data: page,
        meta: {
          timestamp: new Date().toISOString(),
        },
      });
    } catch (error) {
      if (error instanceof Error) {
        if (error.message === 'Page not found') {
          res.status(404).json({
            success: false,
            error: {
              code: 'NOT_FOUND',
              message: error.message,
            },
          });
          return;
        }
        if (error.message === 'Project is locked') {
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
      logger.error('Duplicate page failed', { error });
      next(error);
    }
  }

  /**
   * POST /api/pages/:id/thumbnail
   * Update page thumbnail
   */
  static async updateThumbnail(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = (req as any).userId;
      const workspaceId = (req as any).workspaceId;
      const { id: pageId } = req.params;
      const { projectId, thumbnailUrl } = req.body;

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

      if (!projectId || !thumbnailUrl) {
        res.status(400).json({
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'projectId and thumbnailUrl are required',
          },
        });
        return;
      }

      await projectPageService.updatePageThumbnail(
        pageId,
        projectId,
        userId,
        workspaceId,
        thumbnailUrl
      );

      res.json({
        success: true,
        data: { pageId, thumbnailUrl },
        meta: {
          timestamp: new Date().toISOString(),
        },
      });
    } catch (error) {
      logger.error('Update thumbnail failed', { error });
      next(error);
    }
  }
}