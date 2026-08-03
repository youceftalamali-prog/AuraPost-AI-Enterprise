/**
 * Asset Collection Service
 * Business logic for asset collection management
 * Phase: 5.3 Part 5
 */

import { assetCollectionRepository } from '../repositories/AssetCollectionRepository';
import { assetRepository } from '../repositories/AssetRepository';
import { assetAuditRepository } from '../repositories/AssetAuditRepository';
import { AssetCollection, AssetCollectionInsert, AssetCollectionUpdate, Asset } from '../types';
import { PipelineLogger } from '../../core/logger/PipelineLogger';

const logger = new PipelineLogger('AssetCollectionService');

export interface CreateCollectionInput {
  workspaceId: string;
  userId: string;
  name: string;
  description?: string;
  coverAssetId?: string;
  isSmart?: boolean;
  smartQuery?: Record<string, any>;
  isPublic?: boolean;
  initialAssetIds?: string[];
}

export interface UpdateCollectionInput {
  collectionId: string;
  userId: string;
  workspaceId: string;
  name?: string;
  description?: string | null;
  coverAssetId?: string | null;
  smartQuery?: Record<string, any> | null;
  isPublic?: boolean;
}

export interface CollectionWithAssets extends AssetCollection {
  assets: Asset[];
  assetCount: number;
}

export class AssetCollectionService {
  /**
   * Create a new collection
   */
  async createCollection(input: CreateCollectionInput): Promise<AssetCollection> {
    logger.info('Creating collection', {
      workspaceId: input.workspaceId,
      userId: input.userId,
      name: input.name,
    });

    // Validate name
    if (!input.name || input.name.trim().length === 0) {
      throw new Error('Collection name is required');
    }

    if (input.name.length > 100) {
      throw new Error('Collection name must be at most 100 characters');
    }

    // Check if name exists
    const nameExists = await assetCollectionRepository.nameExists(
      input.name.trim(),
      input.workspaceId
    );

    if (nameExists) {
      throw new Error('A collection with this name already exists');
    }

    // Check collection limit
    const collectionCount = await assetCollectionRepository.countByWorkspace(input.workspaceId);
    if (collectionCount >= 500) {
      throw new Error('Workspace collection limit reached (max 500 collections)');
    }

    // Validate cover asset if provided
    if (input.coverAssetId) {
      const coverAsset = await assetRepository.findById(input.coverAssetId, input.workspaceId);
      if (!coverAsset) {
        throw new Error('Cover asset not found');
      }
    }

    // Create collection
    const collectionData: AssetCollectionInsert = {
      workspaceId: input.workspaceId,
      userId: input.userId,
      name: input.name.trim(),
      description: input.description?.trim() || null,
      coverAssetId: input.coverAssetId || null,
      isSmart: input.isSmart || false,
      smartQuery: input.smartQuery || null,
      isPublic: input.isPublic || false,
    };

    const collection = await assetCollectionRepository.create(collectionData);

    // Add initial assets if provided
    if (input.initialAssetIds && input.initialAssetIds.length > 0) {
      await this.addAssetsToCollection(
        collection.id,
        input.initialAssetIds,
        input.userId,
        input.workspaceId
      );
    }

    // Log audit
    await assetAuditRepository.logAction(
      collection.id,
      input.userId,
      input.workspaceId,
      'collection_create',
      { name: collection.name, isSmart: collection.isSmart }
    );

    logger.info('Collection created successfully', {
      collectionId: collection.id,
      workspaceId: collection.workspaceId,
    });

    return collection;
  }

  /**
   * Get collection by ID
   */
  async getCollection(
    collectionId: string,
    userId: string,
    workspaceId: string
  ): Promise<AssetCollection> {
    const collection = await assetCollectionRepository.findById(collectionId, workspaceId);

    if (!collection) {
      throw new Error('Collection not found');
    }

    return collection;
  }

  /**
   * Get collection with assets
   */
  async getCollectionWithAssets(
    collectionId: string,
    userId: string,
    workspaceId: string,
    limit: number = 50
  ): Promise<CollectionWithAssets> {
    const collection = await this.getCollection(collectionId, userId, workspaceId);

    const assets = await assetRepository.findByCollection(collectionId, limit);

    return {
      ...collection,
      assets,
      assetCount: assets.length,
    };
  }

  /**
   * Update collection
   */
  async updateCollection(input: UpdateCollectionInput): Promise<AssetCollection> {
    logger.info('Updating collection', {
      collectionId: input.collectionId,
      userId: input.userId,
    });

    const collection = await assetCollectionRepository.findById(
      input.collectionId,
      input.workspaceId
    );

    if (!collection) {
      throw new Error('Collection not found');
    }

    // Validate name if provided
    if (input.name !== undefined) {
      if (input.name.trim().length === 0) {
        throw new Error('Collection name cannot be empty');
      }
      if (input.name.length > 100) {
        throw new Error('Collection name must be at most 100 characters');
      }

      // Check if name exists (excluding current collection)
      const nameExists = await assetCollectionRepository.nameExists(
        input.name.trim(),
        input.workspaceId
      );

      if (nameExists && input.name.trim() !== collection.name) {
        throw new Error('A collection with this name already exists');
      }
    }

    // Validate cover asset if provided
    if (input.coverAssetId !== undefined && input.coverAssetId !== null) {
      const coverAsset = await assetRepository.findById(input.coverAssetId, input.workspaceId);
      if (!coverAsset) {
        throw new Error('Cover asset not found');
      }
    }

    // Build update data
    const updateData: AssetCollectionUpdate = {};
    if (input.name !== undefined) updateData.name = input.name.trim();
    if (input.description !== undefined) updateData.description = input.description;
    if (input.coverAssetId !== undefined) updateData.coverAssetId = input.coverAssetId;
    if (input.smartQuery !== undefined) updateData.smartQuery = input.smartQuery;
    if (input.isPublic !== undefined) updateData.isPublic = input.isPublic;

    const updated = await assetCollectionRepository.update(input.collectionId, updateData);

    if (!updated) {
      throw new Error('Failed to update collection');
    }

    // Log audit
    await assetAuditRepository.logAction(
      input.collectionId,
      input.userId,
      input.workspaceId,
      'collection_update',
      { changes: Object.keys(updateData) }
    );

    logger.info('Collection updated successfully', { collectionId: input.collectionId });

    return updated;
  }

  /**
   * Delete collection
   */
  async deleteCollection(
    collectionId: string,
    userId: string,
    workspaceId: string
  ): Promise<void> {
    logger.info('Deleting collection', { collectionId, userId });

    const collection = await assetCollectionRepository.findById(collectionId, workspaceId);

    if (!collection) {
      throw new Error('Collection not found');
    }

    const result = await assetCollectionRepository.softDelete(collectionId);

    if (!result) {
      throw new Error('Failed to delete collection');
    }

    // Log audit
    await assetAuditRepository.logAction(
      collectionId,
      userId,
      workspaceId,
      'collection_delete',
      { name: collection.name }
    );

    logger.info('Collection deleted successfully', { collectionId });
  }

  /**
   * Restore collection
   */
  async restoreCollection(
    collectionId: string,
    userId: string,
    workspaceId: string
  ): Promise<AssetCollection> {
    logger.info('Restoring collection', { collectionId, userId });

    const collection = await assetCollectionRepository.findById(collectionId, workspaceId);

    if (!collection) {
      throw new Error('Collection not found');
    }

    const restored = await assetCollectionRepository.restore(collectionId);

    if (!restored) {
      throw new Error('Failed to restore collection');
    }

    // Log audit
    await assetAuditRepository.logAction(
      collectionId,
      userId,
      workspaceId,
      'collection_restore',
      { name: restored.name }
    );

    logger.info('Collection restored successfully', { collectionId });

    return restored;
  }

  /**
   * Get collections by workspace
   */
  async getWorkspaceCollections(workspaceId: string): Promise<AssetCollection[]> {
    return assetCollectionRepository.findByWorkspace(workspaceId);
  }

  /**
   * Get public collections
   */
  async getPublicCollections(workspaceId: string): Promise<AssetCollection[]> {
    return assetCollectionRepository.findPublic(workspaceId);
  }

  /**
   * Get smart collections
   */
  async getSmartCollections(workspaceId: string): Promise<AssetCollection[]> {
    return assetCollectionRepository.findSmart(workspaceId);
  }

  /**
   * Add assets to collection
   */
  async addAssetsToCollection(
    collectionId: string,
    assetIds: string[],
    userId: string,
    workspaceId: string
  ): Promise<number> {
    logger.info('Adding assets to collection', {
      collectionId,
      assetCount: assetIds.length,
    });

    const collection = await assetCollectionRepository.findById(collectionId, workspaceId);

    if (!collection) {
      throw new Error('Collection not found');
    }

    let addedCount = 0;

    for (const assetId of assetIds) {
      const asset = await assetRepository.findById(assetId, workspaceId);

      if (!asset) {
        logger.warn('Asset not found, skipping', { assetId });
        continue;
      }

      // Add collection ID to asset's collectionIds
      const currentCollections = asset.collectionIds || [];
      if (!currentCollections.includes(collectionId)) {
        await assetRepository.update(assetId, {
          collectionIds: [...currentCollections, collectionId],
        });
        addedCount++;
      }
    }

    // Log audit
    await assetAuditRepository.logAction(
      collectionId,
      userId,
      workspaceId,
      'collection_add_assets',
      { assetCount: addedCount }
    );

    logger.info('Assets added to collection', {
      collectionId,
      addedCount,
    });

    return addedCount;
  }

  /**
   * Remove assets from collection
   */
  async removeAssetsFromCollection(
    collectionId: string,
    assetIds: string[],
    userId: string,
    workspaceId: string
  ): Promise<number> {
    logger.info('Removing assets from collection', {
      collectionId,
      assetCount: assetIds.length,
    });

    const collection = await assetCollectionRepository.findById(collectionId, workspaceId);

    if (!collection) {
      throw new Error('Collection not found');
    }

    let removedCount = 0;

    for (const assetId of assetIds) {
      const asset = await assetRepository.findById(assetId, workspaceId);

      if (!asset) {
        logger.warn('Asset not found, skipping', { assetId });
        continue;
      }

      // Remove collection ID from asset's collectionIds
      const currentCollections = asset.collectionIds || [];
      if (currentCollections.includes(collectionId)) {
        await assetRepository.update(assetId, {
          collectionIds: currentCollections.filter(id => id !== collectionId),
        });
        removedCount++;
      }
    }

    // Log audit
    await assetAuditRepository.logAction(
      collectionId,
      userId,
      workspaceId,
      'collection_remove_assets',
      { assetCount: removedCount }
    );

    logger.info('Assets removed from collection', {
      collectionId,
      removedCount,
    });

    return removedCount;
  }

  /**
   * Set collection cover
   */
  async setCollectionCover(
    collectionId: string,
    assetId: string,
    userId: string,
    workspaceId: string
  ): Promise<AssetCollection> {
    const asset = await assetRepository.findById(assetId, workspaceId);

    if (!asset) {
      throw new Error('Asset not found');
    }

    return this.updateCollection({
      collectionId,
      userId,
      workspaceId,
      coverAssetId: assetId,
    });
  }

  /**
   * Refresh smart collection
   */
  async refreshSmartCollection(
    collectionId: string,
    userId: string,
    workspaceId: string
  ): Promise<Asset[]> {
    logger.info('Refreshing smart collection', { collectionId });

    const collection = await assetCollectionRepository.findById(collectionId, workspaceId);

    if (!collection) {
      throw new Error('Collection not found');
    }

    if (!collection.isSmart || !collection.smartQuery) {
      throw new Error('Collection is not a smart collection');
    }

    // Execute smart query
    const assets = await assetRepository.findWithFilters(
      {
        workspaceId,
        ...collection.smartQuery,
      },
      {
        page: 1,
        limit: 1000,
        sortBy: 'createdAt',
        sortDirection: 'desc',
      }
    );

    logger.info('Smart collection refreshed', {
      collectionId,
      assetCount: assets.assets.length,
    });

    return assets.assets;
  }

  /**
   * Get collection statistics
   */
  async getCollectionStatistics(collectionId: string): Promise<{
    totalAssets: number;
    totalSize: number;
    assetTypes: Record<string, number>;
  }> {
    const collection = await assetCollectionRepository.findById(collectionId);

    if (!collection) {
      throw new Error('Collection not found');
    }

    const assets = await assetRepository.findByCollection(collectionId, 10000);

    const totalSize = assets.reduce((sum, asset) => sum + asset.fileSize, 0);

    const assetTypes: Record<string, number> = {};
    for (const asset of assets) {
      assetTypes[asset.type] = (assetTypes[asset.type] || 0) + 1;
    }

    return {
      totalAssets: assets.length,
      totalSize,
      assetTypes,
    };
  }

  /**
   * Check if collection exists
   */
  async collectionExists(collectionId: string): Promise<boolean> {
    const collection = await assetCollectionRepository.findById(collectionId);
    return collection !== null;
  }

  /**
   * Duplicate collection
   */
  async duplicateCollection(
    collectionId: string,
    newName: string,
    userId: string,
    workspaceId: string
  ): Promise<AssetCollection> {
    logger.info('Duplicating collection', { collectionId, newName });

    const sourceCollection = await assetCollectionRepository.findById(collectionId, workspaceId);

    if (!sourceCollection) {
      throw new Error('Collection not found');
    }

    // Create new collection
    const newCollection = await this.createCollection({
      workspaceId,
      userId,
      name: newName,
      description: sourceCollection.description,
      coverAssetId: sourceCollection.coverAssetId,
      isSmart: sourceCollection.isSmart,
      smartQuery: sourceCollection.smartQuery,
      isPublic: false, // New collection is private by default
    });

    // Copy assets
    const assets = await assetRepository.findByCollection(collectionId, 10000);
    const assetIds = assets.map(a => a.id);

    if (assetIds.length > 0) {
      await this.addAssetsToCollection(newCollection.id, assetIds, userId, workspaceId);
    }

    logger.info('Collection duplicated successfully', {
      sourceCollectionId: collectionId,
      newCollectionId: newCollection.id,
    });

    return newCollection;
  }
}

export const assetCollectionService = new AssetCollectionService();