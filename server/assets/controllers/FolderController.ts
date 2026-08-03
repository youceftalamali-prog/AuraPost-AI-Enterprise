/**
 * Folder Controller
 * REST API endpoints for asset folder management
 * Phase: 5.3 Part 5
 */

import { Request, Response, NextFunction } from 'express';
import { assetFolderService } from '../services/AssetFolderService';
import { PipelineLogger } from '../../core/logger/PipelineLogger';

const logger = new PipelineLogger('FolderController');

export class FolderController {
  /**
   * POST /api/assets/folders
   * Create a new folder
   */
  static async createFolder(req: Request, res: Response, next: NextFunction): Promise<void> {
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

      const { name, parentId, color, icon, description } = req.body;

      if (!name) {
        res.status(400).json({
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Folder name is required',
          },
        });
        return;
      }

      const folder = await assetFolderService.createFolder({
        workspaceId,
        userId,
        name,
        parentId,
        color,
        icon,
        description,
      });

      res.status(201).json({
        success: true,
        data: folder,
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
      }
      logger.error('Create folder failed', { error });
      next(error);
    }
  }

  /**
   * GET /api/assets/folders
   * Get all folders for workspace
   */
  static async getFolders(req: Request, res: Response, next: NextFunction): Promise<void> {
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

      const folders = await assetFolderService.getWorkspaceFolders(workspaceId);

      res.json({
        success: true,
        data: folders,
        meta: {
          count: folders.length,
          timestamp: new Date().toISOString(),
        },
      });
    } catch (error) {
      logger.error('Get folders failed', { error });
      next(error);
    }
  }

  /**
   * GET /api/assets/folders/:id
   * Get folder by ID
   */
  static async getFolder(req: Request, res: Response, next: NextFunction): Promise<void> {
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

      const folder = await assetFolderService.getFolder(id, userId, workspaceId);

      res.json({
        success: true,
        data: folder,
        meta: {
          timestamp: new Date().toISOString(),
        },
      });
    } catch (error) {
      if (error instanceof Error && error.message === 'Folder not found') {
        res.status(404).json({
          success: false,
          error: {
            code: 'NOT_FOUND',
            message: error.message,
          },
        });
        return;
      }
      logger.error('Get folder failed', { error });
      next(error);
    }
  }

  /**
   * PUT /api/assets/folders/:id
   * Update folder
   */
  static async updateFolder(req: Request, res: Response, next: NextFunction): Promise<void> {
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

      const { name, color, icon, description, parentId } = req.body;

      const folder = await assetFolderService.updateFolder({
        folderId: id,
        userId,
        workspaceId,
        name,
        color,
        icon,
        description,
        parentId,
      });

      res.json({
        success: true,
        data: folder,
        meta: {
          timestamp: new Date().toISOString(),
        },
      });
    } catch (error) {
      if (error instanceof Error) {
        if (error.message === 'Folder not found') {
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
        if (error.message.includes('descendant')) {
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
      logger.error('Update folder failed', { error });
      next(error);
    }
  }

  /**
   * DELETE /api/assets/folders/:id
   * Delete folder
   */
  static async deleteFolder(req: Request, res: Response, next: NextFunction): Promise<void> {
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

      await assetFolderService.deleteFolder(id, userId, workspaceId);

      res.status(204).send();
    } catch (error) {
      if (error instanceof Error) {
        if (error.message === 'Folder not found') {
          res.status(404).json({
            success: false,
            error: {
              code: 'NOT_FOUND',
              message: error.message,
            },
          });
          return;
        }
        if (error.message.includes('subfolders') || error.message.includes('assets')) {
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
      logger.error('Delete folder failed', { error });
      next(error);
    }
  }

  /**
   * POST /api/assets/folders/:id/restore
   * Restore folder
   */
  static async restoreFolder(req: Request, res: Response, next: NextFunction): Promise<void> {
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

      const folder = await assetFolderService.restoreFolder(id, userId, workspaceId);

      res.json({
        success: true,
        data: folder,
        meta: {
          timestamp: new Date().toISOString(),
        },
      });
    } catch (error) {
      if (error instanceof Error && error.message === 'Folder not found') {
        res.status(404).json({
          success: false,
          error: {
            code: 'NOT_FOUND',
            message: error.message,
          },
        });
        return;
      }
      logger.error('Restore folder failed', { error });
      next(error);
    }
  }

  /**
   * GET /api/assets/folders/:id/subfolders
   * Get subfolders
   */
  static async getSubfolders(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const workspaceId = (req as any).workspaceId;
      const { id } = req.params;

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

      const subfolders = await assetFolderService.getSubfolders(id, workspaceId);

      res.json({
        success: true,
        data: subfolders,
        meta: {
          count: subfolders.length,
          timestamp: new Date().toISOString(),
        },
      });
    } catch (error) {
      logger.error('Get subfolders failed', { error });
      next(error);
    }
  }

  /**
   * GET /api/assets/folders/root
   * Get root folders
   */
  static async getRootFolders(req: Request, res: Response, next: NextFunction): Promise<void> {
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

      const folders = await assetFolderService.getRootFolders(workspaceId);

      res.json({
        success: true,
        data: folders,
        meta: {
          count: folders.length,
          timestamp: new Date().toISOString(),
        },
      });
    } catch (error) {
      logger.error('Get root folders failed', { error });
      next(error);
    }
  }

  /**
   * GET /api/assets/folders/:id/path
   * Get folder path (breadcrumb)
   */
  static async getFolderPath(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;

      const path = await assetFolderService.getFolderPath(id);

      res.json({
        success: true,
        data: path,
        meta: {
          depth: path.length,
          timestamp: new Date().toISOString(),
        },
      });
    } catch (error) {
      logger.error('Get folder path failed', { error });
      next(error);
    }
  }

  /**
   * GET /api/assets/folders/tree
   * Get folder tree
   */
  static async getFolderTree(req: Request, res: Response, next: NextFunction): Promise<void> {
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

      const tree = await assetFolderService.getFolderTree(workspaceId);

      res.json({
        success: true,
        data: tree,
        meta: {
          timestamp: new Date().toISOString(),
        },
      });
    } catch (error) {
      logger.error('Get folder tree failed', { error });
      next(error);
    }
  }

  /**
   * POST /api/assets/folders/:id/move
   * Move folder to new parent
   */
  static async moveFolder(req: Request, res: Response, next: NextFunction): Promise<void> {
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

      const { newParentId } = req.body;

      const folder = await assetFolderService.moveFolder(
        id,
        newParentId || null,
        userId,
        workspaceId
      );

      res.json({
        success: true,
        data: folder,
        meta: {
          timestamp: new Date().toISOString(),
        },
      });
    } catch (error) {
      if (error instanceof Error) {
        if (error.message === 'Folder not found') {
          res.status(404).json({
            success: false,
            error: {
              code: 'NOT_FOUND',
              message: error.message,
            },
          });
          return;
        }
        if (error.message.includes('descendant')) {
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
      logger.error('Move folder failed', { error });
      next(error);
    }
  }

  /**
   * POST /api/assets/move-to-folder
   * Move assets to folder
   */
  static async moveAssetsToFolder(req: Request, res: Response, next: NextFunction): Promise<void> {
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

      const { assetIds, folderId } = req.body;

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

      const count = await assetFolderService.moveAssetsToFolder(
        assetIds,
        folderId || null,
        userId,
        workspaceId
      );

      res.json({
        success: true,
        data: { moved: count },
        meta: {
          timestamp: new Date().toISOString(),
        },
      });
    } catch (error) {
      if (error instanceof Error && error.message === 'Folder not found') {
        res.status(404).json({
          success: false,
          error: {
            code: 'NOT_FOUND',
            message: error.message,
          },
        });
        return;
      }
      logger.error('Move assets to folder failed', { error });
      next(error);
    }
  }

  /**
   * GET /api/assets/folders/:id/statistics
   * Get folder statistics
   */
  static async getFolderStatistics(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;

      const statistics = await assetFolderService.getFolderStatistics(id);

      res.json({
        success: true,
        data: statistics,
        meta: {
          timestamp: new Date().toISOString(),
        },
      });
    } catch (error) {
      if (error instanceof Error && error.message === 'Folder not found') {
        res.status(404).json({
          success: false,
          error: {
            code: 'NOT_FOUND',
            message: error.message,
          },
        });
        return;
      }
      logger.error('Get folder statistics failed', { error });
      next(error);
    }
  }
}