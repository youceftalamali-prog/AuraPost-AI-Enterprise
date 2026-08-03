/**
 * Project Version Controller
 * REST API endpoints for project version history
 * Phase: 5.3 Part 5
 */

import { Request, Response, NextFunction } from 'express';
import { projectVersionService } from '../services/ProjectVersionService';
import { PipelineLogger } from '../../core/logger/PipelineLogger';

const logger = new PipelineLogger('ProjectVersionController');

export class ProjectVersionController {
  /**
   * GET /api/projects/:id/versions
   * List version history for a project
   */
  static async listVersions(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = (req as any).userId;
      const workspaceId = (req as any).workspaceId;
      const { id: projectId } = req.params;
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

      const versions = await projectVersionService.getVersionHistory(
        projectId,
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
      logger.error('List versions failed', { error });
      next(error);
    }
  }

  /**
   * POST /api/projects/:id/versions
   * Create a new version snapshot
   */
  static async createVersion(req: Request, res: Response, next: NextFunction): Promise<void> {
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

      const { name, description, includePages, includeCanvasData } = req.body;

      const version = await projectVersionService.createVersion({
        projectId,
        userId,
        workspaceId,
        name,
        description,
        includePages,
        includeCanvasData,
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
      logger.error('Create version failed', { error });
      next(error);
    }
  }

  /**
   * GET /api/versions/:id
   * Get a specific version
   */
  static async getVersion(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = (req as any).userId;
      const workspaceId = (req as any).workspaceId;
      const { id: versionId } = req.params;
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

      const version = await projectVersionService.getVersion(
        projectId as string,
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
      if (error instanceof Error && error.message === 'Version not found') {
        res.status(404).json({
          success: false,
          error: {
            code: 'NOT_FOUND',
            message: error.message,
          },
        });
        return;
      }
      logger.error('Get version failed', { error });
      next(error);
    }
  }

  /**
   * POST /api/versions/:id/restore
   * Restore a version
   */
  static async restoreVersion(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = (req as any).userId;
      const workspaceId = (req as any).workspaceId;
      const { id: versionId } = req.params;
      const { projectId, createNewVersionBeforeRestore, restorePages, restoreCanvasData } = req.body;

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
            message: 'projectId is required in request body',
          },
        });
        return;
      }

      const version = await projectVersionService.restoreVersion({
        projectId,
        versionId,
        userId,
        workspaceId,
        createNewVersionBeforeRestore,
        restorePages,
        restoreCanvasData,
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
      logger.error('Restore version failed', { error });
      next(error);
    }
  }

  /**
   * DELETE /api/versions/:id
   * Delete a version
   */
  static async deleteVersion(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = (req as any).userId;
      const workspaceId = (req as any).workspaceId;
      const { id: versionId } = req.params;
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

      await projectVersionService.deleteVersion(
        projectId as string,
        versionId,
        userId,
        workspaceId
      );

      res.status(204).send();
    } catch (error) {
      if (error instanceof Error) {
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
        if (error.message === 'Cannot delete the only version of a project') {
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
}