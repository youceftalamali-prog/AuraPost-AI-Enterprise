/**
 * Asset Upload Service
 * Business logic for asset upload and processing
 * Phase: 5.3 Part 5
 */

import { assetService, CreateAssetInput } from './AssetService';
import { Asset, AssetUploadRequest, AssetUploadResult, AssetType, ThumbnailConfig, DEFAULT_THUMBNAIL_CONFIG } from '../types';
import { PipelineLogger } from '../../core/logger/PipelineLogger';
import { getStorageProvider } from '../../storage/index';
import sharp from 'sharp';
import { randomUUID } from 'crypto';

const logger = new PipelineLogger('AssetUploadService');

// Signed URL lifetime for originals/thumbnails/previews. Assets are
// typically re-fetched via the API (which re-signs), so this only needs to
// outlive a single client session comfortably.
const SIGNED_URL_TTL_SECONDS = 60 * 60 * 24; // 24 hours

// File size limits
const MAX_FILE_SIZE = 100 * 1024 * 1024; // 100MB
const MAX_IMAGE_DIMENSION = 10000; // 10000px

// Allowed MIME types
const ALLOWED_MIME_TYPES = [
  'image/jpeg',
  'image/png',
  'image/gif',
  'image/webp',
  'image/svg+xml',
  'image/tiff',
  'video/mp4',
  'video/quicktime',
  'video/webm',
  'audio/mpeg',
  'audio/wav',
  'audio/ogg',
  'application/pdf',
  'font/woff',
  'font/woff2',
  'font/ttf',
  'font/otf',
];

export interface UploadFile {
  buffer: Buffer;
  originalName: string;
  mimeType: string;
  size: number;
}

export interface UploadOptions {
  workspaceId: string;
  userId: string;
  projectId?: string;
  folderId?: string;
  name?: string;
  description?: string;
  tags?: string[];
  keywords?: string[];
  collectionIds?: string[];
  permissionLevel?: 'private' | 'workspace' | 'public';
  generateThumbnail?: boolean;
  generatePreview?: boolean;
}

export class AssetUploadService {
  /**
   * Upload a single file
   */
  async uploadFile(file: UploadFile, options: UploadOptions): Promise<AssetUploadResult> {
    const startTime = Date.now();

    logger.info('Uploading file', {
      workspaceId: options.workspaceId,
      userId: options.userId,
      fileName: file.originalName,
      fileSize: file.size,
    });

    // Validate file
    this.validateFile(file);

    // Determine asset type
    const assetType = this.determineAssetType(file.mimeType);

    // Extract metadata
    const metadata = await this.extractMetadata(file);

    // Generate file name
    const fileName = options.name || this.generateFileName(file.originalName);

    // Upload to storage
    const storageResult = await this.uploadToStorage(file, fileName, options.workspaceId);

    // Generate thumbnail if image
    let thumbnailUrl: string | undefined;
    let previewUrl: string | undefined;
    let thumbnailKey: string | undefined;
    let previewKey: string | undefined;

    if (assetType === 'image' && options.generateThumbnail !== false) {
      const thumb = await this.generateThumbnailWithKey(file, options.workspaceId);
      thumbnailUrl = thumb.url;
      thumbnailKey = thumb.key;
    }

    if (assetType === 'image' && options.generatePreview !== false) {
      const preview = await this.generatePreviewWithKey(file, options.workspaceId);
      previewUrl = preview.url;
      previewKey = preview.key;
    }

    // Create asset record
    const assetInput: CreateAssetInput = {
      workspaceId: options.workspaceId,
      userId: options.userId,
      name: fileName,
      description: options.description,
      type: assetType,
      mimeType: file.mimeType,
      fileSize: file.size,
      originalName: file.originalName,
      fileExtension: this.getFileExtension(file.originalName),
      width: metadata.width,
      height: metadata.height,
      originalUrl: storageResult.url,
      thumbnailUrl,
      previewUrl,
      projectId: options.projectId,
      folderId: options.folderId,
      collectionIds: options.collectionIds,
      tags: options.tags,
      keywords: options.keywords,
      dominantColor: metadata.dominantColor,
      colorPalette: metadata.colorPalette,
      exifData: metadata.exifData,
      metadata: {
        ...metadata.metadata,
        // Storage keys (as opposed to the signed URLs above, which expire)
        // are the durable handle back to the underlying object — required
        // by permanentDeleteAsset() to actually remove the file, and by any
        // future re-signing once the URLs above expire. There's no
        // dedicated column for these (see AUDIT_REPORT.md follow-ups), so
        // they live in metadata alongside the rest of the extracted data.
        storageKeys: {
          original: storageResult.key,
          thumbnail: thumbnailKey,
          preview: previewKey,
        },
      },
      permissionLevel: options.permissionLevel,
    };

    const asset = await assetService.createAsset(assetInput);

    logger.info('File uploaded successfully', {
      assetId: asset.id,
      processingTimeMs: Date.now() - startTime,
    });

    return {
      asset,
      thumbnailUrl,
      previewUrl,
      processingTimeMs: Date.now() - startTime,
    };
  }

  /**
   * Upload multiple files
   */
  async uploadMultipleFiles(files: UploadFile[], options: UploadOptions): Promise<AssetUploadResult[]> {
    logger.info('Uploading multiple files', {
      count: files.length,
      workspaceId: options.workspaceId,
    });

    const results: AssetUploadResult[] = [];

    for (const file of files) {
      try {
        const result = await this.uploadFile(file, options);
        results.push(result);
      } catch (error) {
        logger.error('Failed to upload file', {
          fileName: file.originalName,
          error: error instanceof Error ? error.message : 'Unknown',
        });
        // Continue with other files
      }
    }

    logger.info('Multiple files uploaded', {
      requested: files.length,
      successful: results.length,
    });

    return results;
  }

  /**
   * Validate file
   */
  private validateFile(file: UploadFile): void {
    // Check file size
    if (file.size > MAX_FILE_SIZE) {
      throw new Error(`File size exceeds maximum limit of ${MAX_FILE_SIZE / 1024 / 1024}MB`);
    }

    if (file.size === 0) {
      throw new Error('File is empty');
    }

    // Check MIME type
    if (!ALLOWED_MIME_TYPES.includes(file.mimeType)) {
      throw new Error(`File type ${file.mimeType} is not allowed`);
    }

    // Check original name
    if (!file.originalName || file.originalName.trim().length === 0) {
      throw new Error('File name is required');
    }
  }

  /**
   * Determine asset type from MIME type
   */
  private determineAssetType(mimeType: string): AssetType {
    if (mimeType.startsWith('image/')) {
      if (mimeType === 'image/svg+xml') return 'svg';
      return 'image';
    }
    if (mimeType.startsWith('video/')) return 'video';
    if (mimeType.startsWith('audio/')) return 'audio';
    if (mimeType === 'application/pdf') return 'pdf';
    if (mimeType.startsWith('font/')) return 'font';
    return 'document';
  }

  /**
   * Extract metadata from file
   */
  private async extractMetadata(file: UploadFile): Promise<{
    width?: number;
    height?: number;
    dominantColor?: string;
    colorPalette?: string[];
    exifData?: Record<string, any>;
    metadata?: Record<string, any>;
  }> {
    const result: any = {
      metadata: {},
    };

    // Extract image metadata
    if (file.mimeType.startsWith('image/') && file.mimeType !== 'image/svg+xml') {
      try {
        const image = sharp(file.buffer);
        const metadata = await image.metadata();

        result.width = metadata.width;
        result.height = metadata.height;

        // Validate dimensions
        if (result.width && result.width > MAX_IMAGE_DIMENSION) {
          throw new Error(`Image width exceeds maximum of ${MAX_IMAGE_DIMENSION}px`);
        }
        if (result.height && result.height > MAX_IMAGE_DIMENSION) {
          throw new Error(`Image height exceeds maximum of ${MAX_IMAGE_DIMENSION}px`);
        }

        // Extract dominant color
        try {
          const stats = await image.stats();
          result.dominantColor = this.rgbToHex(
            stats.dominant.r,
            stats.dominant.g,
            stats.dominant.b
          );
          // Note: sharp's stats().dominant is a single {r,g,b} value, not a
          // palette — sharp has no built-in palette-extraction API. A real
          // multi-color palette would need a separate library (e.g.
          // node-vibrant); leaving colorPalette unset rather than calling a
          // method that doesn't exist (this was calling `.palette` on the
          // dominant-color object, which sharp never returns).
        } catch (error) {
          logger.debug('Failed to extract color palette', { error });
        }

        // Extract EXIF data. sharp has no `.exif()` method — EXIF is
        // exposed as a raw (undecoded) Buffer on metadata().exif. Storing
        // it base64-encoded here since decoding requires a dedicated EXIF
        // parser this project doesn't depend on.
        if (metadata.exif) {
          result.exifData = { raw: metadata.exif.toString('base64') };
        }
      } catch (error) {
        logger.error('Failed to extract image metadata', { error });
      }
    }

    // Add file metadata
    result.metadata = {
      ...result.metadata,
      uploadedAt: new Date().toISOString(),
      fileSize: file.size,
      mimeType: file.mimeType,
    };

    return result;
  }

  /**
   * Upload file to storage.
   *
   * Goes through the Storage Abstraction Layer only (server/storage) — no
   * vendor SDK is referenced here. The active backend (local disk, S3, R2,
   * GCS, Azure, or MinIO) is selected entirely by the STORAGE_PROVIDER env
   * var; this method is identical regardless of which one is configured.
   */
  private async uploadToStorage(
    file: UploadFile,
    fileName: string,
    workspaceId: string
  ): Promise<{ url: string; key: string }> {
    const timestamp = Date.now();
    const uuid = randomUUID();
    const extension = this.getFileExtension(file.originalName);
    const key = `assets/${workspaceId}/${timestamp}-${uuid}.${extension}`;

    const storage = await getStorageProvider();
    await storage.upload(key, file.buffer, {
      contentType: file.mimeType,
      cacheControl: 'public, max-age=31536000, immutable',
    });
    const url = await storage.getSignedUrl(key, { expiresInSeconds: SIGNED_URL_TTL_SECONDS });

    return { url, key };
  }

  /**
   * Generate thumbnail. Returns just the URL — kept for any existing caller
   * that only needs display purposes. Prefer generateThumbnailWithKey for
   * anything that needs to later manage the underlying object (delete,
   * re-sign).
   */
  private async generateThumbnail(file: UploadFile, workspaceId: string): Promise<string> {
    return (await this.generateThumbnailWithKey(file, workspaceId)).url;
  }

  private async generateThumbnailWithKey(file: UploadFile, workspaceId: string): Promise<{ url: string; key: string }> {
    try {
      const config = DEFAULT_THUMBNAIL_CONFIG;

      const thumbnail = await sharp(file.buffer)
        .resize(config.width, config.height, {
          fit: config.fit,
          withoutEnlargement: true,
        })
        .jpeg({ quality: config.quality })
        .toBuffer();

      const uuid = randomUUID();
      const key = `thumbnails/${workspaceId}/${uuid}.jpg`;

      const storage = await getStorageProvider();
      await storage.upload(key, thumbnail, {
        contentType: 'image/jpeg',
        cacheControl: 'public, max-age=31536000, immutable',
      });
      const url = await storage.getSignedUrl(key, { expiresInSeconds: SIGNED_URL_TTL_SECONDS });
      return { url, key };
    } catch (error) {
      logger.error('Failed to generate thumbnail', { error });
      return { url: '', key: '' };
    }
  }

  /**
   * Generate preview. Returns just the URL — see generateThumbnail note above.
   */
  private async generatePreview(file: UploadFile, workspaceId: string): Promise<string> {
    return (await this.generatePreviewWithKey(file, workspaceId)).url;
  }

  private async generatePreviewWithKey(file: UploadFile, workspaceId: string): Promise<{ url: string; key: string }> {
    try {
      const preview = await sharp(file.buffer)
        .resize(1024, 1024, {
          fit: 'inside',
          withoutEnlargement: true,
        })
        .jpeg({ quality: 85 })
        .toBuffer();

      const uuid = randomUUID();
      const key = `previews/${workspaceId}/${uuid}.jpg`;

      const storage = await getStorageProvider();
      await storage.upload(key, preview, {
        contentType: 'image/jpeg',
        cacheControl: 'public, max-age=31536000, immutable',
      });
      const url = await storage.getSignedUrl(key, { expiresInSeconds: SIGNED_URL_TTL_SECONDS });
      return { url, key };
    } catch (error) {
      logger.error('Failed to generate preview', { error });
      return { url: '', key: '' };
    }
  }

  /**
   * Generate file name
   */
  private generateFileName(originalName: string): string {
    const extension = this.getFileExtension(originalName);
    const baseName = originalName.replace(/\.[^/.]+$/, '');
    const timestamp = Date.now();
    return `${baseName}-${timestamp}.${extension}`;
  }

  /**
   * Get file extension
   */
  private getFileExtension(fileName: string): string {
    const match = fileName.match(/\.([^.]+)$/);
    return match ? match[1].toLowerCase() : 'bin';
  }

  /**
   * Convert RGB to hex
   */
  private rgbToHex(r: number, g: number, b: number): string {
    return '#' + [r, g, b]
      .map(x => Math.round(x).toString(16).padStart(2, '0'))
      .join('');
  }
}

export const assetUploadService = new AssetUploadService();