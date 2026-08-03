/**
 * Asset Version Service
 * Business logic for asset version history management
 * Phase: 5.3 Part 5
 */

import { assetVersionRepository } from '../repositories/AssetVersionRepository';
import { assetRepository } from '../repositories/AssetRepository';
import { assetAuditRepository } from '../repositories/AssetAuditRepository';
import { AssetVersion, AssetVersionInsert } from '../types';
import { PipelineLogger } from '../../core/logger/PipelineLogger';

const logger = new PipelineLogger('AssetVersionService');

export interface CreateVersionInput {
  assetId: string;
  userId: string;
  workspaceId: string;
  fileUrl: string;
  fileSize: number;
  metadata?: Record<string, any>;
  notes?: string;
}

export interface RestoreVersionInput {
  assetId: string;
  versionId: string;
  userId: string;
  workspaceId: string;
  createNewVersionBeforeRestore?: boolean;
}

export interface VersionComparison {
  version1: AssetVersion;
  version2: AssetVersion;
  differences: {
    fileSizeDiff: number;
    metadataChanged: boolean;
  };
}

export class AssetVersionService {
  /**
   * Create a new version
   */
  async createVersion(input: CreateVersionInput): Promise<AssetVersion> {
    logger.info('Creating asset version', {
      assetId: input.assetId,
      userId: input.userId,
    });

    const asset = await assetRepository.findById(input.assetId, input.workspaceId);

    if (!asset) {
      throw new Error('Asset not found');
    }

    // Check version limit
    const versionCount = await assetVersionRepository.countByAsset(input.assetId);
    if (versionCount >= 100) {
      throw new Error('Asset version limit reached (max 100 versions)');
    }

    // Get next version number
    const nextVersionNumber = await assetVersionRepository.getNextVersionNumber(input.assetId);

    const versionData: AssetVersionInsert = {
      assetId: input.assetId,
      versionNumber: nextVersionNumber,
      fileUrl: input.fileUrl,
      fileSize: input.fileSize,
      metadata: input.metadata || null,
      notes: input.notes || null,
      createdBy: input.userId,
    };

    const version = await assetVersionRepository.create(versionData);

    // Log audit
    await assetAuditRepository.logAction(
      input.assetId,
      input.userId,
      input.workspaceId,
      'version_create',
      { versionNumber: version.versionNumber }
    );

    logger.info('Asset version created successfully', {
      assetId: input.assetId,
      versionId: version.id,
      versionNumber: version.versionNumber,
    });

    return version;
  }

  /**
   * Create automatic version (called by system after significant changes)
   */
  async createAutoVersion(
    assetId: string,
    userId: string,
    workspaceId: string,
    fileUrl: string,
    fileSize: number,
    trigger: string
  ): Promise<AssetVersion> {
    logger.debug('Creating auto version', { assetId, trigger });

    return this.createVersion({
      assetId,
      userId,
      workspaceId,
      fileUrl,
      fileSize,
      notes: `Auto-save (${trigger})`,
    });
  }

  /**
   * Restore a version
   */
  async restoreVersion(input: RestoreVersionInput): Promise<AssetVersion> {
    logger.info('Restoring asset version', {
      assetId: input.assetId,
      versionId: input.versionId,
      userId: input.userId,
    });

    const asset = await assetRepository.findById(input.assetId, input.workspaceId);

    if (!asset) {
      throw new Error('Asset not found');
    }

    const version = await assetVersionRepository.findById(input.versionId, input.assetId);

    if (!version) {
      throw new Error('Version not found');
    }

    // Optionally create a version of current state before restoring
    if (input.createNewVersionBeforeRestore !== false) {
      await this.createAutoVersion(
        input.assetId,
        input.userId,
        input.workspaceId,
        asset.originalUrl,
        asset.fileSize,
        'pre-restore'
      );
    }

    // Update asset with version data
    await assetRepository.update(input.assetId, {
      originalUrl: version.fileUrl,
      fileSize: version.fileSize,
      metadata: version.metadata || asset.metadata,
    });

    // Log audit
    await assetAuditRepository.logAction(
      input.assetId,
      input.userId,
      input.workspaceId,
      'version_restore',
      { versionNumber: version.versionNumber }
    );

    logger.info('Asset version restored successfully', {
      assetId: input.assetId,
      versionId: version.id,
      versionNumber: version.versionNumber,
    });

    return version;
  }

  /**
   * Get version history
   */
  async getVersionHistory(
    assetId: string,
    userId: string,
    workspaceId: string,
    limit: number = 50,
    offset: number = 0
  ): Promise<AssetVersion[]> {
    const asset = await assetRepository.findById(assetId, workspaceId);

    if (!asset) {
      throw new Error('Asset not found');
    }

    return assetVersionRepository.findByAsset(assetId, limit, offset);
  }

  /**
   * Get specific version
   */
  async getVersion(
    assetId: string,
    versionId: string,
    userId: string,
    workspaceId: string
  ): Promise<AssetVersion> {
    const asset = await assetRepository.findById(assetId, workspaceId);

    if (!asset) {
      throw new Error('Asset not found');
    }

    const version = await assetVersionRepository.findById(versionId, assetId);

    if (!version) {
      throw new Error('Version not found');
    }

    return version;
  }

  /**
   * Get latest version
   */
  async getLatestVersion(assetId: string): Promise<AssetVersion | null> {
    return assetVersionRepository.findLatest(assetId);
  }

  /**
   * Compare two versions
   */
  async compareVersions(
    assetId: string,
    versionId1: string,
    versionId2: string,
    userId: string,
    workspaceId: string
  ): Promise<VersionComparison> {
    const asset = await assetRepository.findById(assetId, workspaceId);

    if (!asset) {
      throw new Error('Asset not found');
    }

    const version1 = await assetVersionRepository.findById(versionId1, assetId);
    const version2 = await assetVersionRepository.findById(versionId2, assetId);

    if (!version1 || !version2) {
      throw new Error('One or both versions not found');
    }

    const meta1 = JSON.stringify(version1.metadata || {});
    const meta2 = JSON.stringify(version2.metadata || {});

    return {
      version1,
      version2,
      differences: {
        fileSizeDiff: version2.fileSize - version1.fileSize,
        metadataChanged: meta1 !== meta2,
      },
    };
  }

  /**
   * Delete a version
   */
  async deleteVersion(
    assetId: string,
    versionId: string,
    userId: string,
    workspaceId: string
  ): Promise<void> {
    logger.info('Deleting asset version', { assetId, versionId });

    const asset = await assetRepository.findById(assetId, workspaceId);

    if (!asset) {
      throw new Error('Asset not found');
    }

    const version = await assetVersionRepository.findById(versionId, assetId);

    if (!version) {
      throw new Error('Version not found');
    }

    // Check if this is the only version
    const versionCount = await assetVersionRepository.countByAsset(assetId);
    if (versionCount <= 1) {
      throw new Error('Cannot delete the only version of an asset');
    }

    const result = await assetVersionRepository.delete(versionId);

    if (!result) {
      throw new Error('Failed to delete version');
    }

    // Log audit
    await assetAuditRepository.logAction(
      assetId,
      userId,
      workspaceId,
      'version_delete',
      { versionNumber: version.versionNumber }
    );

    logger.info('Asset version deleted successfully', { versionId });
  }

  /**
   * Delete all versions for an asset
   */
  async deleteAllVersions(
    assetId: string,
    userId: string,
    workspaceId: string
  ): Promise<number> {
    logger.warn('Deleting all asset versions', { assetId, userId });

    const asset = await assetRepository.findById(assetId, workspaceId);

    if (!asset) {
      throw new Error('Asset not found');
    }

    const count = await assetVersionRepository.deleteByAsset(assetId);

    // Log audit
    await assetAuditRepository.logAction(
      assetId,
      userId,
      workspaceId,
      'versions_delete_all',
      { count }
    );

    logger.warn('All asset versions deleted', { assetId, count });

    return count;
  }

  /**
   * Delete old versions (keep last N)
   */
  async deleteOldVersions(
    assetId: string,
    keepCount: number,
    userId: string,
    workspaceId: string
  ): Promise<number> {
    logger.info('Deleting old asset versions', { assetId, keepCount });

    const asset = await assetRepository.findById(assetId, workspaceId);

    if (!asset) {
      throw new Error('Asset not found');
    }

    const count = await assetVersionRepository.deleteOldVersions(assetId, keepCount);

    // Log audit
    await assetAuditRepository.logAction(
      assetId,
      userId,
      workspaceId,
      'versions_cleanup',
      { deletedCount: count, keepCount }
    );

    logger.info('Old asset versions deleted', { assetId, count });

    return count;
  }

  /**
   * Get version count
   */
  async getVersionCount(assetId: string): Promise<number> {
    return assetVersionRepository.countByAsset(assetId);
  }

  /**
   * Check if version exists
   */
  async versionExists(versionId: string): Promise<boolean> {
    const version = await assetVersionRepository.findById(versionId);
    return version !== null;
  }
}

export const assetVersionService = new AssetVersionService();