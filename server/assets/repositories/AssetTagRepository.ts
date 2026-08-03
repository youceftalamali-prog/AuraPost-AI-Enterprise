/**
 * Asset Tag Repository
 * Data access layer for asset tag management
 * Phase: 5.3 Part 5
 */

import { db } from '../../database';
import { assetTags } from '../../database/schema/assets';
import { eq, and, desc, sql, like } from 'drizzle-orm';
import {
  AssetTag,
  AssetTagInsert,
} from '../types';

export class AssetTagRepository {
  /**
   * Create a new tag
   */
  async create(data: AssetTagInsert): Promise<AssetTag> {
    const result = await db
      .insert(assetTags)
      .values({
        workspaceId: data.workspaceId,
        name: data.name,
        color: data.color || null,
      } as any)
      .returning();

    return this.mapToTag(result[0]);
  }

  /**
   * Find tag by ID
   */
  async findById(tagId: string): Promise<AssetTag | null> {
    const result = await db
      .select()
      .from(assetTags)
      .where(eq(assetTags.id, tagId))
      .limit(1);

    return result.length > 0 ? this.mapToTag(result[0]) : null;
  }

  /**
   * Find tag by name
   */
  async findByName(workspaceId: string, name: string): Promise<AssetTag | null> {
    const result = await db
      .select()
      .from(assetTags)
      .where(
        and(
          eq(assetTags.workspaceId, workspaceId),
          eq(assetTags.name, name)
        )
      )
      .limit(1);

    return result.length > 0 ? this.mapToTag(result[0]) : null;
  }

  /**
   * Find or create tag
   */
  async findOrCreate(workspaceId: string, name: string, color?: string): Promise<AssetTag> {
    const existing = await this.findByName(workspaceId, name);
    if (existing) return existing;

    return this.create({
      workspaceId,
      name,
      color,
    });
  }

  /**
   * Find tags by workspace
   */
  async findByWorkspace(workspaceId: string): Promise<AssetTag[]> {
    const result = await db
      .select()
      .from(assetTags)
      .where(eq(assetTags.workspaceId, workspaceId))
      .orderBy(desc(assetTags.usageCount));

    return result.map(row => this.mapToTag(row));
  }

  /**
   * Find popular tags
   */
  async findPopular(workspaceId: string, limit: number = 20): Promise<AssetTag[]> {
    const result = await db
      .select()
      .from(assetTags)
      .where(
        and(
          eq(assetTags.workspaceId, workspaceId),
          sql`${assetTags.usageCount} > 0`
        )
      )
      .orderBy(desc(assetTags.usageCount))
      .limit(limit);

    return result.map(row => this.mapToTag(row));
  }

  /**
   * Search tags
   */
  async search(workspaceId: string, query: string, limit: number = 20): Promise<AssetTag[]> {
    const result = await db
      .select()
      .from(assetTags)
      .where(
        and(
          eq(assetTags.workspaceId, workspaceId),
          like(assetTags.name, `%${query}%`)
        )
      )
      .orderBy(desc(assetTags.usageCount))
      .limit(limit);

    return result.map(row => this.mapToTag(row));
  }

  /**
   * Update tag
   */
  async update(tagId: string, data: { name?: string; color?: string | null }): Promise<AssetTag | null> {
    const result = await db
      .update(assetTags)
      .set({
        ...data,
        updatedAt: new Date(),
      } as any)
      .where(eq(assetTags.id, tagId))
      .returning();

    return result.length > 0 ? this.mapToTag(result[0]) : null;
  }

  /**
   * Increment usage count
   */
  async incrementUsage(tagId: string): Promise<void> {
    await db
      .update(assetTags)
      .set({
        usageCount: sql`${assetTags.usageCount} + 1`,
        updatedAt: new Date(),
      } as any)
      .where(eq(assetTags.id, tagId));
  }

  /**
   * Decrement usage count
   */
  async decrementUsage(tagId: string): Promise<void> {
    await db
      .update(assetTags)
      .set({
        usageCount: sql`GREATEST(0, ${assetTags.usageCount} - 1)`,
        updatedAt: new Date(),
      } as any)
      .where(eq(assetTags.id, tagId));
  }

  /**
   * Bulk create tags
   */
  async bulkCreate(tags: AssetTagInsert[]): Promise<AssetTag[]> {
    if (tags.length === 0) return [];

    const result = await db
      .insert(assetTags)
      .values(tags)
      .returning();

    return result.map(row => this.mapToTag(row));
  }

  /**
   * Delete tag
   */
  async delete(tagId: string): Promise<boolean> {
    const result = await db
      .delete(assetTags)
      .where(eq(assetTags.id, tagId));

    return (result.rowCount || 0) > 0;
  }

  /**
   * Delete unused tags
   */
  async deleteUnused(workspaceId: string): Promise<number> {
    const result = await db
      .delete(assetTags)
      .where(
        and(
          eq(assetTags.workspaceId, workspaceId),
          eq(assetTags.usageCount, 0)
        )
      );

    return result.rowCount || 0;
  }

  /**
   * Count tags by workspace
   */
  async countByWorkspace(workspaceId: string): Promise<number> {
    const result = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(assetTags)
      .where(eq(assetTags.workspaceId, workspaceId));

    return result[0]?.count || 0;
  }

  // ============================================
  // PRIVATE HELPERS
  // ============================================

  private mapToTag(row: any): AssetTag {
    return {
      id: row.id,
      workspaceId: row.workspaceId,
      name: row.name,
      color: row.color,
      usageCount: row.usageCount,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
    };
  }
}

export const assetTagRepository = new AssetTagRepository();