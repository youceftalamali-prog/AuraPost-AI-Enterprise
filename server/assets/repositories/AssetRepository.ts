/**
 * Asset Repository
 * Data access layer for asset management
 * Phase: 5.3 Part 5
 */

import { db } from '../../database';
import { assets } from '../../database/schema/assets';
import { eq, and, or, desc, asc, like, gte, lte, isNull, sql, inArray } from 'drizzle-orm';
import {
  Asset,
  AssetInsert,
  AssetUpdate,
  AssetFilters,
  AssetPagination,
  AssetQueryResult,
  AssetType,
  WorkspaceAssetStats,
} from '../types';

export class AssetRepository {
  /**
   * Create a new asset
   */
  async create(data: AssetInsert): Promise<Asset> {
    const result = await db
      .insert(assets)
      .values({
        workspaceId: data.workspaceId,
        userId: data.userId,
        projectId: data.projectId || null,
        name: data.name,
        description: data.description || null,
        type: data.type,
        mimeType: data.mimeType,
        fileSize: data.fileSize,
        originalName: data.originalName || null,
        fileExtension: data.fileExtension || null,
        width: data.width || null,
        height: data.height || null,
        aspectRatio: data.aspectRatio || null,
        originalUrl: data.originalUrl,
        thumbnailUrl: data.thumbnailUrl || null,
        previewUrl: data.previewUrl || null,
        signedUrl: data.signedUrl || null,
        cdnUrl: data.cdnUrl || null,
        generationPrompt: data.generationPrompt || null,
        negativePrompt: data.negativePrompt || null,
        aiModel: data.aiModel || null,
        seed: data.seed || null,
        provider: data.provider || null,
        dominantColor: data.dominantColor || null,
        colorPalette: data.colorPalette || null,
        exifData: data.exifData || null,
        metadata: data.metadata || {},
        folderId: data.folderId || null,
        collectionIds: data.collectionIds || [],
        tags: data.tags || [],
        keywords: data.keywords || [],
        status: data.status || 'active',
        permissionLevel: data.permissionLevel || 'workspace',
        isFavorite: data.isFavorite || false,
        isPinned: data.isPinned || false,
        source: data.source || null,
        creator: data.creator || null,
        license: data.license || null,
      } as any)
      .returning();

    return this.mapToAsset(result[0]);
  }

  /**
   * Find asset by ID
   */
  async findById(assetId: string, workspaceId?: string): Promise<Asset | null> {
    const conditions = [
      eq(assets.id, assetId),
      isNull(assets.deletedAt),
    ];

    if (workspaceId) {
      conditions.push(eq(assets.workspaceId, workspaceId));
    }

    const result = await db
      .select()
      .from(assets)
      .where(and(...conditions))
      .limit(1);

    return result.length > 0 ? this.mapToAsset(result[0]) : null;
  }

  /**
   * Find assets with filters and pagination
   */
  async findWithFilters(
    filters: AssetFilters,
    pagination: AssetPagination
  ): Promise<AssetQueryResult> {
    const conditions: any[] = [
      eq(assets.workspaceId, filters.workspaceId),
      isNull(assets.deletedAt),
    ];

    // Type filter
    if (filters.type) {
      if (Array.isArray(filters.type)) {
        conditions.push(inArray(assets.type, filters.type));
      } else {
        conditions.push(eq(assets.type, filters.type));
      }
    }

    // Status filter
    if (filters.status) {
      conditions.push(eq(assets.status, filters.status));
    }

    // Folder filter
    if (filters.folderId !== undefined) {
      if (filters.folderId === null) {
        conditions.push(isNull(assets.folderId));
      } else {
        conditions.push(eq(assets.folderId, filters.folderId));
      }
    }

    // Collection filter
    if (filters.collectionId) {
      conditions.push(sql`${assets.collectionIds} @> ${JSON.stringify([filters.collectionId])}::jsonb`);
    }

    // Tags filter
    if (filters.tags && filters.tags.length > 0) {
      conditions.push(sql`${assets.tags} ?| ${filters.tags}`);
    }

    // Keywords filter
    if (filters.keywords && filters.keywords.length > 0) {
      conditions.push(sql`${assets.keywords} ?| ${filters.keywords}`);
    }

    // Boolean filters
    if (filters.isFavorite !== undefined) {
      conditions.push(eq(assets.isFavorite, filters.isFavorite));
    }

    if (filters.isPinned !== undefined) {
      conditions.push(eq(assets.isPinned, filters.isPinned));
    }

    // Project filter
    if (filters.projectId) {
      conditions.push(eq(assets.projectId, filters.projectId));
    }

    // User filter
    if (filters.userId) {
      conditions.push(eq(assets.userId, filters.userId));
    }

    // Date filters
    if (filters.dateFrom) {
      conditions.push(gte(assets.createdAt, filters.dateFrom));
    }

    if (filters.dateTo) {
      conditions.push(lte(assets.createdAt, filters.dateTo));
    }

    // File size filters
    if (filters.fileSizeMin !== undefined) {
      conditions.push(gte(assets.fileSize, filters.fileSizeMin));
    }

    if (filters.fileSizeMax !== undefined) {
      conditions.push(lte(assets.fileSize, filters.fileSizeMax));
    }

    // Dimension filters
    if (filters.widthMin !== undefined) {
      conditions.push(gte(assets.width, filters.widthMin));
    }

    if (filters.widthMax !== undefined) {
      conditions.push(lte(assets.width, filters.widthMax));
    }

    if (filters.heightMin !== undefined) {
      conditions.push(gte(assets.height, filters.heightMin));
    }

    if (filters.heightMax !== undefined) {
      conditions.push(lte(assets.height, filters.heightMax));
    }

    // Color filter
    if (filters.dominantColor) {
      conditions.push(eq(assets.dominantColor, filters.dominantColor));
    }

    // Search filter
    if (filters.search) {
      conditions.push(
        or(
          like(assets.name, `%${filters.search}%`),
          like(assets.description, `%${filters.search}%`),
          like(assets.originalName, `%${filters.search}%`)
        )
      );
    }

    // MIME type filter
    if (filters.mimeType) {
      conditions.push(like(assets.mimeType, `${filters.mimeType}%`));
    }

    // AI generated filter
    if (filters.aiGenerated !== undefined) {
      if (filters.aiGenerated) {
        conditions.push(eq(assets.type, 'ai_generated'));
      } else {
        conditions.push(sql`${assets.type} != 'ai_generated'`);
      }
    }

    // Get total count
    const countResult = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(assets)
      .where(and(...conditions));

    const total = countResult[0]?.count || 0;

    // Apply pagination
    const page = pagination.page || 1;
    const limit = pagination.limit || 20;
    const offset = (page - 1) * limit;

    // Apply sorting
    const sortBy = pagination.sortBy || 'createdAt';
    const sortDirection = pagination.sortDirection || 'desc';
    const sortColumn = this.getSortColumn(sortBy);
    const orderFn = sortDirection === 'asc' ? asc : desc;

    // Get assets
    const result = await db
      .select()
      .from(assets)
      .where(and(...conditions))
      .orderBy(orderFn(sortColumn))
      .limit(limit)
      .offset(offset);

    const assetList = result.map(row => this.mapToAsset(row));

    return {
      assets: assetList,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  /**
   * Find assets by workspace
   */
  async findByWorkspace(workspaceId: string, limit: number = 50): Promise<Asset[]> {
    const result = await db
      .select()
      .from(assets)
      .where(
        and(
          eq(assets.workspaceId, workspaceId),
          isNull(assets.deletedAt),
          eq(assets.status, 'active')
        )
      )
      .orderBy(desc(assets.createdAt))
      .limit(limit);

    return result.map(row => this.mapToAsset(row));
  }

  /**
   * Find assets by folder
   */
  async findByFolder(folderId: string, limit: number = 50): Promise<Asset[]> {
    const result = await db
      .select()
      .from(assets)
      .where(
        and(
          eq(assets.folderId, folderId),
          isNull(assets.deletedAt)
        )
      )
      .orderBy(desc(assets.createdAt))
      .limit(limit);

    return result.map(row => this.mapToAsset(row));
  }

  /**
   * Find assets by project
   */
  async findByProject(projectId: string, limit: number = 50): Promise<Asset[]> {
    const result = await db
      .select()
      .from(assets)
      .where(
        and(
          eq(assets.projectId, projectId),
          isNull(assets.deletedAt)
        )
      )
      .orderBy(desc(assets.createdAt))
      .limit(limit);

    return result.map(row => this.mapToAsset(row));
  }

  /**
   * Find assets by collection
   */
  async findByCollection(collectionId: string, limit: number = 50): Promise<Asset[]> {
    const result = await db
      .select()
      .from(assets)
      .where(
        and(
          sql`${assets.collectionIds} @> ${JSON.stringify([collectionId])}::jsonb`,
          isNull(assets.deletedAt)
        )
      )
      .orderBy(desc(assets.createdAt))
      .limit(limit);

    return result.map(row => this.mapToAsset(row));
  }

  /**
   * Find assets by tags
   */
  async findByTags(workspaceId: string, tags: string[], limit: number = 50): Promise<Asset[]> {
    const result = await db
      .select()
      .from(assets)
      .where(
        and(
          eq(assets.workspaceId, workspaceId),
          sql`${assets.tags} ?| ${tags}`,
          isNull(assets.deletedAt)
        )
      )
      .orderBy(desc(assets.createdAt))
      .limit(limit);

    return result.map(row => this.mapToAsset(row));
  }

  /**
   * Find favorite assets
   */
  async findFavorites(workspaceId: string, limit: number = 50): Promise<Asset[]> {
    const result = await db
      .select()
      .from(assets)
      .where(
        and(
          eq(assets.workspaceId, workspaceId),
          eq(assets.isFavorite, true),
          isNull(assets.deletedAt)
        )
      )
      .orderBy(desc(assets.createdAt))
      .limit(limit);

    return result.map(row => this.mapToAsset(row));
  }

  /**
   * Find pinned assets
   */
  async findPinned(workspaceId: string, limit: number = 50): Promise<Asset[]> {
    const result = await db
      .select()
      .from(assets)
      .where(
        and(
          eq(assets.workspaceId, workspaceId),
          eq(assets.isPinned, true),
          isNull(assets.deletedAt)
        )
      )
      .orderBy(desc(assets.createdAt))
      .limit(limit);

    return result.map(row => this.mapToAsset(row));
  }

  /**
   * Find recent assets
   */
  async findRecent(workspaceId: string, limit: number = 10): Promise<Asset[]> {
    const result = await db
      .select()
      .from(assets)
      .where(
        and(
          eq(assets.workspaceId, workspaceId),
          isNull(assets.deletedAt),
          eq(assets.status, 'active')
        )
      )
      .orderBy(desc(assets.createdAt))
      .limit(limit);

    return result.map(row => this.mapToAsset(row));
  }

  /**
   * Find most used assets
   */
  async findMostUsed(workspaceId: string, limit: number = 10): Promise<Asset[]> {
    const result = await db
      .select()
      .from(assets)
      .where(
        and(
          eq(assets.workspaceId, workspaceId),
          isNull(assets.deletedAt)
        )
      )
      .orderBy(desc(assets.usageCount))
      .limit(limit);

    return result.map(row => this.mapToAsset(row));
  }

  /**
   * Find trashed assets
   */
  async findTrashed(workspaceId: string, limit: number = 50): Promise<Asset[]> {
    const result = await db
      .select()
      .from(assets)
      .where(
        and(
          eq(assets.workspaceId, workspaceId),
          eq(assets.status, 'trashed')
        )
      )
      .orderBy(desc(assets.deletedAt))
      .limit(limit);

    return result.map(row => this.mapToAsset(row));
  }

  /**
   * Find archived assets
   */
  async findArchived(workspaceId: string, limit: number = 50): Promise<Asset[]> {
    const result = await db
      .select()
      .from(assets)
      .where(
        and(
          eq(assets.workspaceId, workspaceId),
          eq(assets.status, 'archived')
        )
      )
      .orderBy(desc(assets.archivedAt))
      .limit(limit);

    return result.map(row => this.mapToAsset(row));
  }

  /**
   * Find AI generated assets
   */
  async findAIGenerated(workspaceId: string, limit: number = 50): Promise<Asset[]> {
    const result = await db
      .select()
      .from(assets)
      .where(
        and(
          eq(assets.workspaceId, workspaceId),
          eq(assets.type, 'ai_generated'),
          isNull(assets.deletedAt)
        )
      )
      .orderBy(desc(assets.createdAt))
      .limit(limit);

    return result.map(row => this.mapToAsset(row));
  }

  /**
   * Find duplicates by file size
   */
  async findDuplicatesBySize(workspaceId: string, fileSize: number, limit: number = 10): Promise<Asset[]> {
    const result = await db
      .select()
      .from(assets)
      .where(
        and(
          eq(assets.workspaceId, workspaceId),
          eq(assets.fileSize, fileSize),
          isNull(assets.deletedAt)
        )
      )
      .orderBy(desc(assets.createdAt))
      .limit(limit);

    return result.map(row => this.mapToAsset(row));
  }

  /**
   * Update asset
   */
  async update(assetId: string, data: AssetUpdate): Promise<Asset | null> {
    const updateData: any = {
      ...data,
      updatedAt: new Date(),
    };

    const result = await db
      .update(assets)
      .set(updateData)
      .where(
        and(
          eq(assets.id, assetId),
          isNull(assets.deletedAt)
        )
      )
      .returning();

    return result.length > 0 ? this.mapToAsset(result[0]) : null;
  }

  /**
   * Soft delete asset
   */
  async softDelete(assetId: string): Promise<boolean> {
    const result = await db
      .update(assets)
      .set({
        deletedAt: new Date(),
        status: 'trashed',
      } as any)
      .where(eq(assets.id, assetId));

    return (result.rowCount || 0) > 0;
  }

  /**
   * Restore asset from trash
   */
  async restore(assetId: string): Promise<Asset | null> {
    const result = await db
      .update(assets)
      .set({
        deletedAt: null,
        status: 'active',
      } as any)
      .where(eq(assets.id, assetId))
      .returning();

    return result.length > 0 ? this.mapToAsset(result[0]) : null;
  }

  /**
   * Archive asset
   */
  async archive(assetId: string): Promise<Asset | null> {
    const result = await db
      .update(assets)
      .set({
        archivedAt: new Date(),
        status: 'archived',
      } as any)
      .where(eq(assets.id, assetId))
      .returning();

    return result.length > 0 ? this.mapToAsset(result[0]) : null;
  }

  /**
   * Unarchive asset
   */
  async unarchive(assetId: string): Promise<Asset | null> {
    const result = await db
      .update(assets)
      .set({
        archivedAt: null,
        status: 'active',
      } as any)
      .where(eq(assets.id, assetId))
      .returning();

    return result.length > 0 ? this.mapToAsset(result[0]) : null;
  }

  /**
   * Toggle favorite
   */
  async toggleFavorite(assetId: string): Promise<Asset | null> {
    const asset = await this.findById(assetId);
    if (!asset) return null;

    const result = await db
      .update(assets)
      .set({ isFavorite: !asset.isFavorite } as any)
      .where(eq(assets.id, assetId))
      .returning();

    return result.length > 0 ? this.mapToAsset(result[0]) : null;
  }

  /**
   * Toggle pin
   */
  async togglePin(assetId: string): Promise<Asset | null> {
    const asset = await this.findById(assetId);
    if (!asset) return null;

    const result = await db
      .update(assets)
      .set({ isPinned: !asset.isPinned } as any)
      .where(eq(assets.id, assetId))
      .returning();

    return result.length > 0 ? this.mapToAsset(result[0]) : null;
  }

  /**
   * Increment usage count
   */
  async incrementUsage(assetId: string): Promise<void> {
    await db
      .update(assets)
      .set({
        usageCount: sql`${assets.usageCount} + 1`,
        lastUsedAt: new Date(),
      } as any)
      .where(eq(assets.id, assetId));
  }

  /**
   * Increment views count
   */
  async incrementViews(assetId: string): Promise<void> {
    await db
      .update(assets)
      .set({
        viewsCount: sql`${assets.viewsCount} + 1`,
      } as any)
      .where(eq(assets.id, assetId));
  }

  /**
   * Increment downloads count
   */
  async incrementDownloads(assetId: string): Promise<void> {
    await db
      .update(assets)
      .set({
        downloadsCount: sql`${assets.downloadsCount} + 1`,
      } as any)
      .where(eq(assets.id, assetId));
  }

  /**
   * Bulk update assets
   */
  async bulkUpdate(assetIds: string[], data: AssetUpdate): Promise<number> {
    const updateData: any = {
      ...data,
      updatedAt: new Date(),
    };

    const result = await db
      .update(assets)
      .set(updateData)
      .where(inArray(assets.id, assetIds));

    return result.rowCount || 0;
  }

  /**
   * Bulk delete assets
   */
  async bulkDelete(assetIds: string[]): Promise<number> {
    const result = await db
      .update(assets)
      .set({
        deletedAt: new Date(),
        status: 'trashed',
      } as any)
      .where(inArray(assets.id, assetIds));

    return result.rowCount || 0;
  }

  /**
   * Bulk restore assets
   */
  async bulkRestore(assetIds: string[]): Promise<number> {
    const result = await db
      .update(assets)
      .set({
        deletedAt: null,
        status: 'active',
      } as any)
      .where(inArray(assets.id, assetIds));

    return result.rowCount || 0;
  }

  /**
   * Bulk archive assets
   */
  async bulkArchive(assetIds: string[]): Promise<number> {
    const result = await db
      .update(assets)
      .set({
        archivedAt: new Date(),
        status: 'archived',
      } as any)
      .where(inArray(assets.id, assetIds));

    return result.rowCount || 0;
  }

  /**
   * Check if asset exists
   */
  async exists(assetId: string): Promise<boolean> {
    const result = await db
      .select({ id: assets.id })
      .from(assets)
      .where(
        and(
          eq(assets.id, assetId),
          isNull(assets.deletedAt)
        )
      )
      .limit(1);

    return result.length > 0;
  }

  /**
   * Count assets by workspace
   */
  async countByWorkspace(workspaceId: string): Promise<number> {
    const result = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(assets)
      .where(
        and(
          eq(assets.workspaceId, workspaceId),
          isNull(assets.deletedAt)
        )
      );

    return result[0]?.count || 0;
  }

  /**
   * Get workspace statistics
   */
  async getWorkspaceStats(workspaceId: string): Promise<WorkspaceAssetStats> {
    const result = await db
      .select({
        totalAssets: sql<number>`count(*)::int`,
        totalSizeBytes: sql<number>`coalesce(sum(${assets.fileSize}), 0)::bigint`,
        imageCount: sql<number>`count(case when ${assets.type} = 'image' then 1 end)::int`,
        videoCount: sql<number>`count(case when ${assets.type} = 'video' then 1 end)::int`,
        aiGeneratedCount: sql<number>`count(case when ${assets.type} = 'ai_generated' then 1 end)::int`,
        favoriteCount: sql<number>`count(case when ${assets.isFavorite} = true then 1 end)::int`,
        pinnedCount: sql<number>`count(case when ${assets.isPinned} = true then 1 end)::int`,
      })
      .from(assets)
      .where(
        and(
          eq(assets.workspaceId, workspaceId),
          isNull(assets.deletedAt)
        )
      );

    const stats = result[0];

    return {
      workspaceId,
      totalAssets: stats?.totalAssets || 0,
      totalSizeBytes: Number(stats?.totalSizeBytes || 0),
      imageCount: stats?.imageCount || 0,
      videoCount: stats?.videoCount || 0,
      aiGeneratedCount: stats?.aiGeneratedCount || 0,
      favoriteCount: stats?.favoriteCount || 0,
      pinnedCount: stats?.pinnedCount || 0,
      folderCount: 0, // Will be populated by service layer
      collectionCount: 0, // Will be populated by service layer
    };
  }

  /**
   * Permanent delete (use with caution)
   */
  async permanentDelete(assetId: string): Promise<boolean> {
    const result = await db
      .delete(assets)
      .where(eq(assets.id, assetId));

    return (result.rowCount || 0) > 0;
  }

  /**
   * Permanent bulk delete (use with caution)
   */
  async permanentBulkDelete(assetIds: string[]): Promise<number> {
    const result = await db
      .delete(assets)
      .where(inArray(assets.id, assetIds));

    return result.rowCount || 0;
  }

  // ============================================
  // PRIVATE HELPERS
  // ============================================

  private mapToAsset(row: any): Asset {
    return {
      id: row.id,
      workspaceId: row.workspaceId,
      userId: row.userId,
      projectId: row.projectId,
      name: row.name,
      description: row.description,
      type: row.type,
      mimeType: row.mimeType,
      fileSize: Number(row.fileSize),
      originalName: row.originalName,
      fileExtension: row.fileExtension,
      width: row.width,
      height: row.height,
      aspectRatio: row.aspectRatio ? Number(row.aspectRatio) : null,
      originalUrl: row.originalUrl,
      thumbnailUrl: row.thumbnailUrl,
      previewUrl: row.previewUrl,
      signedUrl: row.signedUrl,
      cdnUrl: row.cdnUrl,
      generationPrompt: row.generationPrompt,
      negativePrompt: row.negativePrompt,
      aiModel: row.aiModel,
      seed: row.seed ? Number(row.seed) : null,
      provider: row.provider,
      dominantColor: row.dominantColor,
      colorPalette: row.colorPalette,
      exifData: row.exifData,
      metadata: row.metadata || {},
      folderId: row.folderId,
      collectionIds: row.collectionIds || [],
      tags: row.tags || [],
      keywords: row.keywords || [],
      status: row.status,
      permissionLevel: row.permissionLevel,
      isFavorite: row.isFavorite,
      isPinned: row.isPinned,
      usageCount: row.usageCount,
      lastUsedAt: row.lastUsedAt,
      viewsCount: row.viewsCount,
      downloadsCount: row.downloadsCount,
      source: row.source,
      creator: row.creator,
      license: row.license,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
      deletedAt: row.deletedAt,
      archivedAt: row.archivedAt,
    };
  }

  private getSortColumn(sortBy: string): any {
    const columnMap: Record<string, any> = {
      createdAt: assets.createdAt,
      updatedAt: assets.updatedAt,
      name: assets.name,
      fileSize: assets.fileSize,
      usageCount: assets.usageCount,
    };
    return columnMap[sortBy] || assets.createdAt;
  }
}

export const assetRepository = new AssetRepository();