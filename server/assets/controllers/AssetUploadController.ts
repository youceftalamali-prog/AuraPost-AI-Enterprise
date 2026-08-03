/**
 * Asset Upload Controller
 * REST API endpoints for asset upload and processing
 * Phase: 5.3 Part 5
 */

import { Request, Response, NextFunction } from 'express';
import { assetUploadService, UploadFile } from '../services/AssetUploadService';
import { PipelineLogger } from '../../core/logger/PipelineLogger';

const logger = new PipelineLogger('AssetUploadController');

export class AssetUploadController {
  /**
   * POST /api/assets/upload
   * Upload a single file
   */
  static async uploadFile(req: Request, res: Response, next: NextFunction): Promise<void> {
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

      if (!req.file) {
        res.status(400).json({
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'File is required',
          },
        });
        return;
      }

      const {
        name,
        description,
        projectId,
        folderId,
        tags,
        keywords,
        collectionIds,
        permissionLevel,
        generateThumbnail,
        generatePreview,
      } = req.body;

      const file: UploadFile = {
        buffer: req.file.buffer,
        originalName: req.file.originalname,
        mimeType: req.file.mimetype,
        size: req.file.size,
      };

      const result = await assetUploadService.uploadFile(file, {
        workspaceId,
        userId,
        name,
        description,
        projectId,
        folderId,
        tags: tags ? tags.split(',') : undefined,
        keywords: keywords ? keywords.split(',') : undefined,
        collectionIds: collectionIds ? collectionIds.split(',') : undefined,
        permissionLevel,
        generateThumbnail: generateThumbnail !== 'false',
        generatePreview: generatePreview !== 'false',
      });

      res.status(201).json({
        success: true,
        data: result,
        meta: {
          processingTimeMs: result.processingTimeMs,
          timestamp: new Date().toISOString(),
        },
      });
    } catch (error) {
      if (error instanceof Error) {
        if (error.message.includes('File size exceeds')) {
          res.status(413).json({
            success: false,
            error: {
              code: 'FILE_TOO_LARGE',
              message: error.message,
            },
          });
          return;
        }
        if (error.message.includes('not allowed')) {
          res.status(415).json({
            success: false,
            error: {
              code: 'UNSUPPORTED_FILE_TYPE',
              message: error.message,
            },
          });
          return;
        }
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
      logger.error('Upload file failed', { error });
      next(error);
    }
  }

  /**
   * POST /api/assets/upload-multiple
   * Upload multiple files
   */
  static async uploadMultipleFiles(req: Request, res: Response, next: NextFunction): Promise<void> {
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

      if (!req.files || !Array.isArray(req.files) || req.files.length === 0) {
        res.status(400).json({
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Files are required',
          },
        });
        return;
      }

      const {
        name,
        description,
        projectId,
        folderId,
        tags,
        keywords,
        collectionIds,
        permissionLevel,
        generateThumbnail,
        generatePreview,
      } = req.body;

      const files: UploadFile[] = req.files.map((file: any) => ({
        buffer: file.buffer,
        originalName: file.originalname,
        mimeType: file.mimetype,
        size: file.size,
      }));

      const results = await assetUploadService.uploadMultipleFiles(files, {
        workspaceId,
        userId,
        name,
        description,
        projectId,
        folderId,
        tags: tags ? tags.split(',') : undefined,
        keywords: keywords ? keywords.split(',') : undefined,
        collectionIds: collectionIds ? collectionIds.split(',') : undefined,
        permissionLevel,
        generateThumbnail: generateThumbnail !== 'false',
        generatePreview: generatePreview !== 'false',
      });

      res.status(201).json({
        success: true,
        data: results,
        meta: {
          uploaded: results.length,
          total: files.length,
          timestamp: new Date().toISOString(),
        },
      });
    } catch (error) {
      logger.error('Upload multiple files failed', { error });
      next(error);
    }
  }

  /**
   * POST /api/assets/upload/base64
   * Upload file from base64 string
   */
  static async uploadBase64(req: Request, res: Response, next: NextFunction): Promise<void> {
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
        data,
        fileName,
        mimeType,
        name,
        description,
        projectId,
        folderId,
        tags,
        keywords,
        collectionIds,
        permissionLevel,
      } = req.body;

      if (!data || !fileName || !mimeType) {
        res.status(400).json({
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'data, fileName, and mimeType are required',
          },
        });
        return;
      }

      // Decode base64
      const buffer = Buffer.from(data, 'base64');

      const file: UploadFile = {
        buffer,
        originalName: fileName,
        mimeType,
        size: buffer.length,
      };

      const result = await assetUploadService.uploadFile(file, {
        workspaceId,
        userId,
        name: name || fileName,
        description,
        projectId,
        folderId,
        tags,
        keywords,
        collectionIds,
        permissionLevel,
      });

      res.status(201).json({
        success: true,
        data: result,
        meta: {
          timestamp: new Date().toISOString(),
        },
      });
    } catch (error) {
      if (error instanceof Error) {
        if (error.message.includes('File size exceeds')) {
          res.status(413).json({
            success: false,
            error: {
              code: 'FILE_TOO_LARGE',
              message: error.message,
            },
          });
          return;
        }
        if (error.message.includes('not allowed')) {
          res.status(415).json({
            success: false,
            error: {
              code: 'UNSUPPORTED_FILE_TYPE',
              message: error.message,
            },
          });
          return;
        }
      }
      logger.error('Upload base64 failed', { error });
      next(error);
    }
  }

  /**
   * POST /api/assets/upload/url
   * Upload file from URL
   */
  static async uploadFromUrl(req: Request, res: Response, next: NextFunction): Promise<void> {
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
        url,
        name,
        description,
        projectId,
        folderId,
        tags,
        keywords,
        collectionIds,
        permissionLevel,
      } = req.body;

      if (!url) {
        res.status(400).json({
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'url is required',
          },
        });
        return;
      }

      // Fetch file from URL
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error('Failed to fetch file from URL');
      }

      const buffer = Buffer.from(await response.arrayBuffer());
      const mimeType = response.headers.get('content-type') || 'application/octet-stream';
      const fileName = url.split('/').pop() || 'file';

      const file: UploadFile = {
        buffer,
        originalName: fileName,
        mimeType,
        size: buffer.length,
      };

      const result = await assetUploadService.uploadFile(file, {
        workspaceId,
        userId,
        name: name || fileName,
        description,
        projectId,
        folderId,
        tags,
        keywords,
        collectionIds,
        permissionLevel,
      });

      res.status(201).json({
        success: true,
        data: result,
        meta: {
          timestamp: new Date().toISOString(),
        },
      });
    } catch (error) {
      logger.error('Upload from URL failed', { error });
      next(error);
    }
  }
}