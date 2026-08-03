/**
 * Asset Service
 * Core business logic for asset management
 * Phase: 5.3 Part 5
 */

import { assetRepository } from '../repositories/AssetRepository';
import { assetFolderRepository } from '../repositories/AssetFolderRepository';
import { assetCollectionRepository } from '../repositories/AssetCollectionRepository';
import { assetTagRepository } from '../repositories/AssetTagRepository';
import { assetUsageRepository } from '../repositories/AssetUsageRepository';
import { assetAuditRepository } from '../repositories/AssetAuditRepository';
import { getStorageProvider } from '../../storage/index';
import {
  Asset,
  AssetInsert,
  AssetUpdate,
  AssetFilters,
  AssetPagination,
  AssetQueryResult,
  AssetBulkActionRequest,
  AssetBulkActionResult,
  WorkspaceAssetStats,
  AssetStatistics,
  AssetType,
} from '../types';
import { PipelineLogger } from '../../core/logger/PipelineLogger';

const logger = new PipelineLogger('AssetService');

export interface CreateAssetInput {
  workspaceId: string;
  userId: string;
  name: string;
  description?: string;
  type: AssetType;
  mimeType: string;
  fileSize: number;
  originalUrl: string;
  originalName?: string;
  fileExtension?: string;
  width?: number;
  height?: number;
  thumbnailUrl?: string;
  previewUrl?: string;
  projectId?: string;
  folderId?: string;
  collectionIds?: string[];
  tags?: string[];
  keywords?: string[];
  dominantColor?: string;
  colorPalette?: string[];
  exifData?: Record<string, any>;
  metadata?: Record<string, any>;
  generationPrompt?: string;
  negativePrompt?: string;
  aiModel?: string;
  seed?: number;
  provider?: string;
  source?: string;
  creator?: string;
  license?: string;
  permissionLevel?: 'private' | 'workspace' | 'public';
}

export interface UpdateAssetInput {
  assetId: string;
  userId: string;
  workspaceId: string;
  name?: string;
  description?: string;
  folderId?: string | null;
  collectionIds?: string[];
  tags?: string[];
  keywords?: string[];
  projectId?: string | null;
  thumbnailUrl?: string;
  previewUrl?: string;
  dominantColor?: string;
  colorPalette?: string[];
  metadata?: Record<string, any>;
}

export class AssetService {
  /**
   * Create a new asset
   */
  async createAsset(input: CreateAssetInput): Promise<Asset> {
    logger.info('Creating asset', {
      workspaceId: input.workspaceId,
      userId: input.userId,
      name: input.name,
      type: input.type,
    });

    // Validate input
    if (!input.name || input.name.trim().length === 0) {
      throw new Error('Asset name is required');
    }

    if (input.name.length > 255) {
      throw new Error('Asset name must be at most 255 characters');
    }

    if (input.fileSize <= 0) {
      throw new Error('File size must be positive');
    }

    // Check workspace storage quota
    const stats = await assetRepository.getWorkspaceStats(input.workspaceId);
    const quotaLimit = 10 * 1024 * 1024 * 1024; // 10GB default
    if (stats.totalSizeBytes + input.fileSize > quotaLimit) {
      throw new Error('Workspace storage quota exceeded');
    }

    // Create asset
    const assetData: AssetInsert = {
      workspaceId: input.workspaceId,
      userId: input.userId,
      projectId: input.projectId || null,
      name: input.name.trim(),
      description: input.description?.trim() || null,
      type: input.type,
      mimeType: input.mimeType,
      fileSize: input.fileSize,
      originalName: input.originalName || null,
      fileExtension: input.fileExtension || null,
      width: input.width || null,
      height: input.height || null,
      aspectRatio: input.width && input.height ? input.width / input.height : null,
      originalUrl: input.originalUrl,
      thumbnailUrl: input.thumbnailUrl || null,
      previewUrl: input.previewUrl || null,
      generationPrompt: input.generationPrompt || null,
      negativePrompt: input.negativePrompt || null,
      aiModel: input.aiModel || null,
      seed: input.seed || null,
      provider: input.provider || null,
      dominantColor: input.dominantColor || null,
      colorPalette: input.colorPalette || null,
      exifData: input.exifData || null,
      metadata: input.metadata || {},
      folderId: input.folderId || null,
      collectionIds: input.collectionIds || [],
      tags: input.tags || [],
      keywords: input.keywords || [],
      source: input.source || null,
      creator: input.creator || null,
      license: input.license || null,
      permissionLevel: input.permissionLevel || 'workspace',
    };

    const asset = await assetRepository.create(assetData);

    // Create or update tags
    if (input.tags && input.tags.length > 0) {
      for (const tagName of input.tags) {
        const tag = await assetTagRepository.findOrCreate(input.workspaceId, tagName);
        await assetTagRepository.incrementUsage(tag.id);
      }
    }

    // Log audit
    await assetAuditRepository.logAction(
      asset.id,
      input.userId,
      input.workspaceId,
      'create',
      { type: asset.type, name: asset.name }
    );

    logger.info('Asset created successfully', {
      assetId: asset.id,
      workspaceId: asset.workspaceId,
    });

    return asset;
  }

  /**
   * Get asset by ID
   */
  async getAsset(assetId: string, userId: string, workspaceId: string): Promise<Asset> {
    const asset = await assetRepository.findById(assetId, workspaceId);

    if (!asset) {
      throw new Error('Asset not found');
    }

    // Increment views
    await assetRepository.incrementViews(assetId);

    return asset;
  }

  /**
   * Update asset
   */
  async updateAsset(input: UpdateAssetInput): Promise<Asset> {
    logger.info('Updating asset', {
      assetId: input.assetId,
      userId: input.userId,
    });

    const asset = await assetRepository.findById(input.assetId, input.workspaceId);

    if (!asset) {
      throw new Error('Asset not found');
    }

    // Validate name if provided
    if (input.name !== undefined) {
      if (input.name.trim().length === 0) {
        throw new Error('Asset name cannot be empty');
      }
      if (input.name.length > 255) {
        throw new Error('Asset name must be at most 255 characters');
      }
    }

    // Build update data
    const updateData: AssetUpdate = {};
    if (input.name !== undefined) updateData.name = input.name.trim();
    if (input.description !== undefined) updateData.description = input.description?.trim() || null;
    if (input.folderId !== undefined) updateData.folderId = input.folderId;
    if (input.collectionIds !== undefined) updateData.collectionIds = input.collectionIds;
    if (input.tags !== undefined) updateData.tags = input.tags;
    if (input.keywords !== undefined) updateData.keywords = input.keywords;
    if (input.projectId !== undefined) updateData.projectId = input.projectId;
    if (input.thumbnailUrl !== undefined) updateData.thumbnailUrl = input.thumbnailUrl;
    if (input.previewUrl !== undefined) updateData.previewUrl = input.previewUrl;
    if (input.dominantColor !== undefined) updateData.dominantColor = input.dominantColor;
    if (input.colorPalette !== undefined) updateData.colorPalette = input.colorPalette;
    if (input.metadata !== undefined) updateData.metadata = input.metadata;

    const updated = await assetRepository.update(input.assetId, updateData);

    if (!updated) {
      throw new Error('Failed to update asset');
    }

    // Log audit
    await assetAuditRepository.logAction(
      input.assetId,
      input.userId,
      input.workspaceId,
      'update',
      { changes: Object.keys(updateData) }
    );

    logger.info('Asset updated successfully', { assetId: input.assetId });

    return updated;
  }

  /**
   * Delete asset (soft delete - move to trash)
   */
  async deleteAsset(assetId: string, userId: string, workspaceId: string): Promise<void> {
    logger.info('Deleting asset', { assetId, userId });

    const asset = await assetRepository.findById(assetId, workspaceId);

    if (!asset) {
      throw new Error('Asset not found');
    }

    const result = await assetRepository.softDelete(assetId);

    if (!result) {
      throw new Error('Failed to delete asset');
    }

    // Log audit
    await assetAuditRepository.logAction(
      assetId,
      userId,
      workspaceId,
      'delete',
      { name: asset.name }
    );

    logger.info('Asset deleted successfully', { assetId });
  }

  /**
   * Restore asset from trash
   */
  async restoreAsset(assetId: string, userId: string, workspaceId: string): Promise<Asset> {
    logger.info('Restoring asset', { assetId, userId });

    const asset = await assetRepository.findById(assetId, workspaceId);

    if (!asset) {
      throw new Error('Asset not found');
    }

    const restored = await assetRepository.restore(assetId);

    if (!restored) {
      throw new Error('Failed to restore asset');
    }

    // Log audit
    await assetAuditRepository.logAction(
      assetId,
      userId,
      workspaceId,
      'restore',
      { name: restored.name }
    );

    logger.info('Asset restored successfully', { assetId });

    return restored;
  }

  /**
   * Archive asset
   */
  async archiveAsset(assetId: string, userId: string, workspaceId: string): Promise<Asset> {
    logger.info('Archiving asset', { assetId, userId });

    const asset = await assetRepository.findById(assetId, workspaceId);

    if (!asset) {
      throw new Error('Asset not found');
    }

    const archived = await assetRepository.archive(assetId);

    if (!archived) {
      throw new Error('Failed to archive asset');
    }

    // Log audit
    await assetAuditRepository.logAction(
      assetId,
      userId,
      workspaceId,
      'archive',
      { name: archived.name }
    );

    logger.info('Asset archived successfully', { assetId });

    return archived;
  }

  /**
   * Toggle favorite
   */
  async toggleFavorite(assetId: string, userId: string, workspaceId: string): Promise<Asset> {
    const asset = await assetRepository.findById(assetId, workspaceId);

    if (!asset) {
      throw new Error('Asset not found');
    }

    const updated = await assetRepository.toggleFavorite(assetId);

    if (!updated) {
      throw new Error('Failed to toggle favorite');
    }

    return updated;
  }

  /**
   * Toggle pin
   */
  async togglePin(assetId: string, userId: string, workspaceId: string): Promise<Asset> {
    const asset = await assetRepository.findById(assetId, workspaceId);

    if (!asset) {
      throw new Error('Asset not found');
    }

    const updated = await assetRepository.togglePin(assetId);

    if (!updated) {
      throw new Error('Failed to toggle pin');
    }

    return updated;
  }

  /**
   * List assets with filters and pagination
   */
  async listAssets(
    workspaceId: string,
    filters: Partial<AssetFilters>,
    pagination: AssetPagination
  ): Promise<AssetQueryResult> {
    const fullFilters: AssetFilters = {
      workspaceId,
      ...filters,
    };

    return assetRepository.findWithFilters(fullFilters, pagination);
  }

  /**
   * Get assets by folder
   */
  async getAssetsByFolder(folderId: string, limit: number = 50): Promise<Asset[]> {
    return assetRepository.findByFolder(folderId, limit);
  }

  /**
   * Get assets by collection
   */
  async getAssetsByCollection(collectionId: string, limit: number = 50): Promise<Asset[]> {
    return assetRepository.findByCollection(collectionId, limit);
  }

  /**
   * Get assets by project
   */
  async getAssetsByProject(projectId: string, limit: number = 50): Promise<Asset[]> {
    return assetRepository.findByProject(projectId, limit);
  }

  /**
   * Get favorite assets
   */
  async getFavoriteAssets(workspaceId: string, limit: number = 50): Promise<Asset[]> {
    return assetRepository.findFavorites(workspaceId, limit);
  }

  /**
   * Get pinned assets
   */
  async getPinnedAssets(workspaceId: string, limit: number = 50): Promise<Asset[]> {
    return assetRepository.findPinned(workspaceId, limit);
  }

  /**
   * Get recent assets
   */
  async getRecentAssets(workspaceId: string, limit: number = 10): Promise<Asset[]> {
    return assetRepository.findRecent(workspaceId, limit);
  }

  /**
   * Get most used assets
   */
  async getMostUsedAssets(workspaceId: string, limit: number = 10): Promise<Asset[]> {
    return assetRepository.findMostUsed(workspaceId, limit);
  }

  /**
   * Get AI generated assets
   */
  async getAIGeneratedAssets(workspaceId: string, limit: number = 50): Promise<Asset[]> {
    return assetRepository.findAIGenerated(workspaceId, limit);
  }

  /**
   * Get trashed assets
   */
  async getTrashedAssets(workspaceId: string, limit: number = 50): Promise<Asset[]> {
    return assetRepository.findTrashed(workspaceId, limit);
  }

  /**
   * Get archived assets
   */
  async getArchivedAssets(workspaceId: string, limit: number = 50): Promise<Asset[]> {
    return assetRepository.findArchived(workspaceId, limit);
  }

  /**
   * Get asset statistics
   */
  async getAssetStatistics(assetId: string): Promise<AssetStatistics> {
    const asset = await assetRepository.findById(assetId);

    if (!asset) {
      throw new Error('Asset not found');
    }

    const usageStats = await assetUsageRepository.getUsageStats(assetId);

    return {
      assetId,
      usageCount: asset.usageCount,
      viewsCount: asset.viewsCount,
      downloadsCount: asset.downloadsCount,
      lastUsedAt: asset.lastUsedAt,
      projectsUsing: usageStats.uniqueProjects,
      pagesUsing: usageStats.uniquePages,
      layersUsing: usageStats.uniqueLayers,
    };
  }

  /**
   * Get workspace statistics
   */
  async getWorkspaceStatistics(workspaceId: string): Promise<WorkspaceAssetStats> {
    const stats = await assetRepository.getWorkspaceStats(workspaceId);

    // Get folder and collection counts
    const folderCount = await assetFolderRepository.countByWorkspace(workspaceId);
    const collectionCount = await assetCollectionRepository.countByWorkspace(workspaceId);

    return {
      ...stats,
      folderCount,
      collectionCount,
    };
  }

  /**
   * Record asset usage
   */
  async recordAssetUsage(
    assetId: string,
    userId: string,
    projectId?: string,
    pageId?: string,
    layerId?: string
  ): Promise<void> {
    await assetUsageRepository.create({
      assetId,
      projectId: projectId || null,
      pageId: pageId || null,
      layerId: layerId || null,
      usedBy: userId,
    });

    await assetRepository.incrementUsage(assetId);
  }

  /**
   * Execute bulk action
   */
  async executeBulkAction(
    request: AssetBulkActionRequest,
    userId: string,
    workspaceId: string
  ): Promise<AssetBulkActionResult> {
    logger.info('Executing bulk action', {
      action: request.action,
      assetCount: request.assetIds.length,
      userId,
    });

    let successful = 0;
    let failed = 0;
    const errors: Array<{ assetId: string; error: string }> = [];

    for (const assetId of request.assetIds) {
      try {
        switch (request.action) {
          case 'delete':
            await this.deleteAsset(assetId, userId, workspaceId);
            break;
          case 'archive':
            await this.archiveAsset(assetId, userId, workspaceId);
            break;
          case 'restore':
            await this.restoreAsset(assetId, userId, workspaceId);
            break;
          case 'favorite':
            await this.toggleFavorite(assetId, userId, workspaceId);
            break;
          case 'pin':
            await this.togglePin(assetId, userId, workspaceId);
            break;
          case 'tag':
            if (request.data?.tags) {
              await this.updateAsset({
                assetId,
                userId,
                workspaceId,
                tags: request.data.tags,
              });
            }
            break;
          case 'move':
            if (request.data?.folderId !== undefined) {
              await this.updateAsset({
                assetId,
                userId,
                workspaceId,
                folderId: request.data.folderId,
              });
            }
            break;
          default:
            throw new Error(`Unsupported bulk action: ${request.action}`);
        }
        successful++;
      } catch (error) {
        failed++;
        errors.push({
          assetId,
          error: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    }

    logger.info('Bulk action completed', {
      action: request.action,
      successful,
      failed,
    });

    return {
      total: request.assetIds.length,
      successful,
      failed,
      errors,
    };
  }

  /**
   * Find duplicate assets
   */
  async findDuplicateAssets(workspaceId: string): Promise<Asset[]> {
    // Get all assets and group by file size
    const allAssets = await assetRepository.findByWorkspace(workspaceId, 1000);
    const sizeMap = new Map<number, Asset[]>();

    for (const asset of allAssets) {
      const existing = sizeMap.get(asset.fileSize) || [];
      existing.push(asset);
      sizeMap.set(asset.fileSize, existing);
    }

    // Return assets with same file size
    const duplicates: Asset[] = [];
    for (const [size, assets] of sizeMap) {
      if (assets.length > 1) {
        duplicates.push(...assets);
      }
    }

    return duplicates;
  }

  /**
   * Check if asset exists
   */
  async assetExists(assetId: string): Promise<boolean> {
    return assetRepository.exists(assetId);
  }

  /**
   * Permanently delete asset (use with caution)
   */
  async permanentDeleteAsset(assetId: string, userId: string, workspaceId: string): Promise<void> {
    logger.warn('Permanently deleting asset', { assetId, userId });

    const asset = await assetRepository.findById(assetId, workspaceId);

    if (!asset) {
      throw new Error('Asset not found');
    }

    // Delete the underlying storage objects (original/thumbnail/preview)
    // before removing the DB row — otherwise these are orphaned forever
    // (nothing else references them once the row is gone). Storage keys
    // were persisted at upload time precisely for this (see
    // AssetUploadService.uploadFile); best-effort per key so a missing/
    // already-gone object never blocks deleting the record itself.
    const storageKeys = (asset.metadata as Record<string, any> | null)?.storageKeys as
      | { original?: string; thumbnail?: string; preview?: string }
      | undefined;
    if (storageKeys) {
      const storage = await getStorageProvider();
      for (const key of [storageKeys.original, storageKeys.thumbnail, storageKeys.preview]) {
        if (!key) continue;
        try {
          await storage.delete(key);
        } catch (error) {
          logger.warn('Failed to delete storage object during permanent asset delete', { assetId, key, error });
        }
      }
    }

    // Delete usage records
    await assetUsageRepository.deleteByAsset(assetId);

    // Delete asset
    await assetRepository.permanentDelete(assetId);

    // Log audit
    await assetAuditRepository.logAction(
      assetId,
      userId,
      workspaceId,
      'permanent_delete',
      { name: asset.name }
    );

    logger.warn('Asset permanently deleted', { assetId });
  }
}

export const assetService = new AssetService();