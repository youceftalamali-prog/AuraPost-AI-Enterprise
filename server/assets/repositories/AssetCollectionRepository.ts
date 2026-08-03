/**
 * Asset Collection Repository
 * Data access layer for asset collection management
 * Phase: 5.3 Part 5
 */

import { db } from '../../database';
import { assetCollections } from '../../database/schema/assets';
import { eq, and, isNull, sql } from 'drizzle-orm';
import {
  AssetCollection,
  AssetCollectionInsert,
  AssetCollectionUpdate,
} from '../types';

export class AssetCollectionRepository {
  /**
   * Create a new collection
   */
  async create(data: AssetCollectionInsert): Promise<AssetCollection> {
    const result = await db
      .insert(assetCollections)
      .values({
        workspaceId: data.workspaceId,
        userId: data.userId,
        name: data.name,
        description: data.description || null,
        coverAssetId: data.coverAssetId || null,
        isSmart: data.isSmart || false,
        smartQuery: data.smartQuery || null,
        isPublic: data.isPublic || false,
      } as any)
      .returning();

    return this.mapToCollection(result[0]);
  }

  /**
   * Find collection by ID
   */
  async findById(collectionId: string, workspaceId?: string): Promise<AssetCollection | null> {
    const conditions = [
      eq(assetCollections.id, collectionId),
      isNull(assetCollections.deletedAt),
    ];

    if (workspaceId) {
      conditions.push(eq(assetCollections.workspaceId, workspaceId));
    }

    const result = await db
      .select()
      .from(assetCollections)
      .where(and(...conditions))
      .limit(1);

    return result.length > 0 ? this.mapToCollection(result[0]) : null;
  }

  /**
   * Find collections by workspace
   */
  async findByWorkspace(workspaceId: string): Promise<AssetCollection[]> {
    const result = await db
      .select()
      .from(assetCollections)
      .where(
        and(
          eq(assetCollections.workspaceId, workspaceId),
          isNull(assetCollections.deletedAt)
        )
      )
      .orderBy(assetCollections.name);

    return result.map(row => this.mapToCollection(row));
  }

  /**
   * Find public collections
   */
  async findPublic(workspaceId: string): Promise<AssetCollection[]> {
    const result = await db
      .select()
      .from(assetCollections)
      .where(
        and(
          eq(assetCollections.workspaceId, workspaceId),
          eq(assetCollections.isPublic, true),
          isNull(assetCollections.deletedAt)
        )
      )
      .orderBy(assetCollections.name);

    return result.map(row => this.mapToCollection(row));
  }

  /**
   * Find smart collections
   */
  async findSmart(workspaceId: string): Promise<AssetCollection[]> {
    const result = await db
      .select()
      .from(assetCollections)
      .where(
        and(
          eq(assetCollections.workspaceId, workspaceId),
          eq(assetCollections.isSmart, true),
          isNull(assetCollections.deletedAt)
        )
      )
      .orderBy(assetCollections.name);

    return result.map(row => this.mapToCollection(row));
  }

  /**
   * Update collection
   */
  async update(collectionId: string, data: AssetCollectionUpdate): Promise<AssetCollection | null> {
    const updateData: any = {
      ...data,
      updatedAt: new Date(),
    };

    const result = await db
      .update(assetCollections)
      .set(updateData)
      .where(
        and(
          eq(assetCollections.id, collectionId),
          isNull(assetCollections.deletedAt)
        )
      )
      .returning();

    return result.length > 0 ? this.mapToCollection(result[0]) : null;
  }

  /**
   * Update cover asset
   */
  async updateCover(collectionId: string, coverAssetId: string | null): Promise<AssetCollection | null> {
    return this.update(collectionId, { coverAssetId });
  }

  /**
   * Soft delete collection
   */
  async softDelete(collectionId: string): Promise<boolean> {
    const result = await db
      .update(assetCollections)
      .set({ deletedAt: new Date() } as any)
      .where(eq(assetCollections.id, collectionId));

    return (result.rowCount || 0) > 0;
  }

  /**
   * Restore collection
   */
  async restore(collectionId: string): Promise<AssetCollection | null> {
    const result = await db
      .update(assetCollections)
      .set({ deletedAt: null } as any)
      .where(eq(assetCollections.id, collectionId))
      .returning();

    return result.length > 0 ? this.mapToCollection(result[0]) : null;
  }

  /**
   * Check if name exists
   */
  async nameExists(name: string, workspaceId: string): Promise<boolean> {
    const result = await db
      .select({ id: assetCollections.id })
      .from(assetCollections)
      .where(
        and(
          eq(assetCollections.workspaceId, workspaceId),
          eq(assetCollections.name, name),
          isNull(assetCollections.deletedAt)
        )
      )
      .limit(1);

    return result.length > 0;
  }

  /**
   * Count collections by workspace
   */
  async countByWorkspace(workspaceId: string): Promise<number> {
    const result = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(assetCollections)
      .where(
        and(
          eq(assetCollections.workspaceId, workspaceId),
          isNull(assetCollections.deletedAt)
        )
      );

    return result[0]?.count || 0;
  }

  /**
   * Permanent delete
   */
  async permanentDelete(collectionId: string): Promise<boolean> {
    const result = await db
      .delete(assetCollections)
      .where(eq(assetCollections.id, collectionId));

    return (result.rowCount || 0) > 0;
  }

  // ============================================
  // PRIVATE HELPERS
  // ============================================

  private mapToCollection(row: any): AssetCollection {
    return {
      id: row.id,
      workspaceId: row.workspaceId,
      userId: row.userId,
      name: row.name,
      description: row.description,
      coverAssetId: row.coverAssetId,
      isSmart: row.isSmart,
      smartQuery: row.smartQuery,
      isPublic: row.isPublic,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
      deletedAt: row.deletedAt,
    };
  }
}

export const assetCollectionRepository = new AssetCollectionRepository();