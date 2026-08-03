/**
 * Asset Usage Repository
 * Data access layer for asset usage tracking
 * Phase: 5.3 Part 5
 */

import { db } from '../../database';
import { assetUsage } from '../../database/schema/assets';
import { eq, and, desc, sql } from 'drizzle-orm';
import {
  AssetUsage,
  AssetUsageInsert,
} from '../types';

export class AssetUsageRepository {
  /**
   * Record asset usage
   */
  async create(data: AssetUsageInsert): Promise<AssetUsage> {
    const result = await db
      .insert(assetUsage)
      .values({
        assetId: data.assetId,
        projectId: data.projectId || null,
        pageId: data.pageId || null,
        layerId: data.layerId || null,
        usedBy: data.usedBy,
      } as any)
      .returning();

    return this.mapToUsage(result[0]);
  }

  /**
   * Find usage by ID
   */
  async findById(usageId: string): Promise<AssetUsage | null> {
    const result = await db
      .select()
      .from(assetUsage)
      .where(eq(assetUsage.id, usageId))
      .limit(1);

    return result.length > 0 ? this.mapToUsage(result[0]) : null;
  }

  /**
   * Find usage records by asset
   */
  async findByAsset(assetId: string, limit: number = 50): Promise<AssetUsage[]> {
    const result = await db
      .select()
      .from(assetUsage)
      .where(eq(assetUsage.assetId, assetId))
      .orderBy(desc(assetUsage.usedAt))
      .limit(limit);

    return result.map(row => this.mapToUsage(row));
  }

  /**
   * Find usage records by project
   */
  async findByProject(projectId: string, limit: number = 50): Promise<AssetUsage[]> {
    const result = await db
      .select()
      .from(assetUsage)
      .where(eq(assetUsage.projectId, projectId))
      .orderBy(desc(assetUsage.usedAt))
      .limit(limit);

    return result.map(row => this.mapToUsage(row));
  }

  /**
   * Find usage records by user
   */
  async findByUser(userId: string, limit: number = 50): Promise<AssetUsage[]> {
    const result = await db
      .select()
      .from(assetUsage)
      .where(eq(assetUsage.usedBy, userId))
      .orderBy(desc(assetUsage.usedAt))
      .limit(limit);

    return result.map(row => this.mapToUsage(row));
  }

  /**
   * Get unique projects using asset
   */
  async getProjectsUsingAsset(assetId: string): Promise<string[]> {
    const result = await db
      .select({ projectId: assetUsage.projectId })
      .from(assetUsage)
      .where(
        and(
          eq(assetUsage.assetId, assetId),
          sql`${assetUsage.projectId} IS NOT NULL`
        )
      )
      .groupBy(assetUsage.projectId);

    return result.map(row => row.projectId!).filter(Boolean);
  }

  /**
   * Get unique pages using asset
   */
  async getPagesUsingAsset(assetId: string): Promise<string[]> {
    const result = await db
      .select({ pageId: assetUsage.pageId })
      .from(assetUsage)
      .where(
        and(
          eq(assetUsage.assetId, assetId),
          sql`${assetUsage.pageId} IS NOT NULL`
        )
      )
      .groupBy(assetUsage.pageId);

    return result.map(row => row.pageId!).filter(Boolean);
  }

  /**
   * Get unique layers using asset
   */
  async getLayersUsingAsset(assetId: string): Promise<string[]> {
    const result = await db
      .select({ layerId: assetUsage.layerId })
      .from(assetUsage)
      .where(
        and(
          eq(assetUsage.assetId, assetId),
          sql`${assetUsage.layerId} IS NOT NULL`
        )
      )
      .groupBy(assetUsage.layerId);

    return result.map(row => row.layerId!).filter(Boolean);
  }

  /**
   * Count usage records by asset
   */
  async countByAsset(assetId: string): Promise<number> {
    const result = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(assetUsage)
      .where(eq(assetUsage.assetId, assetId));

    return result[0]?.count || 0;
  }

  /**
   * Count unique projects using asset
   */
  async countProjectsUsingAsset(assetId: string): Promise<number> {
    const result = await db
      .select({ count: sql<number>`count(distinct ${assetUsage.projectId})::int` })
      .from(assetUsage)
      .where(
        and(
          eq(assetUsage.assetId, assetId),
          sql`${assetUsage.projectId} IS NOT NULL`
        )
      );

    return result[0]?.count || 0;
  }

  /**
   * Count unique pages using asset
   */
  async countPagesUsingAsset(assetId: string): Promise<number> {
    const result = await db
      .select({ count: sql<number>`count(distinct ${assetUsage.pageId})::int` })
      .from(assetUsage)
      .where(
        and(
          eq(assetUsage.assetId, assetId),
          sql`${assetUsage.pageId} IS NOT NULL`
        )
      );

    return result[0]?.count || 0;
  }

  /**
   * Count unique layers using asset
   */
  async countLayersUsingAsset(assetId: string): Promise<number> {
    const result = await db
      .select({ count: sql<number>`count(distinct ${assetUsage.layerId})::int` })
      .from(assetUsage)
      .where(
        and(
          eq(assetUsage.assetId, assetId),
          sql`${assetUsage.layerId} IS NOT NULL`
        )
      );

    return result[0]?.count || 0;
  }

  /**
   * Check if asset is used in project
   */
  async isUsedInProject(assetId: string, projectId: string): Promise<boolean> {
    const result = await db
      .select({ id: assetUsage.id })
      .from(assetUsage)
      .where(
        and(
          eq(assetUsage.assetId, assetId),
          eq(assetUsage.projectId, projectId)
        )
      )
      .limit(1);

    return result.length > 0;
  }

  /**
   * Check if asset is used anywhere
   */
  async isUsedAnywhere(assetId: string): Promise<boolean> {
    const result = await db
      .select({ id: assetUsage.id })
      .from(assetUsage)
      .where(eq(assetUsage.assetId, assetId))
      .limit(1);

    return result.length > 0;
  }

  /**
   * Delete usage record
   */
  async delete(usageId: string): Promise<boolean> {
    const result = await db
      .delete(assetUsage)
      .where(eq(assetUsage.id, usageId));

    return (result.rowCount || 0) > 0;
  }

  /**
   * Delete usage records by asset
   */
  async deleteByAsset(assetId: string): Promise<number> {
    const result = await db
      .delete(assetUsage)
      .where(eq(assetUsage.assetId, assetId));

    return result.rowCount || 0;
  }

  /**
   * Delete usage records by project
   */
  async deleteByProject(projectId: string): Promise<number> {
    const result = await db
      .delete(assetUsage)
      .where(eq(assetUsage.projectId, projectId));

    return result.rowCount || 0;
  }

  /**
   * Get usage statistics for asset
   */
  async getUsageStats(assetId: string): Promise<{
    totalUsage: number;
    uniqueProjects: number;
    uniquePages: number;
    uniqueLayers: number;
    lastUsedAt: Date | null;
  }> {
    const [usageCount, projectCount, pageCount, layerCount, lastUsage] = await Promise.all([
      this.countByAsset(assetId),
      this.countProjectsUsingAsset(assetId),
      this.countPagesUsingAsset(assetId),
      this.countLayersUsingAsset(assetId),
      this.findLatestUsage(assetId),
    ]);

    return {
      totalUsage: usageCount,
      uniqueProjects: projectCount,
      uniquePages: pageCount,
      uniqueLayers: layerCount,
      lastUsedAt: lastUsage?.usedAt || null,
    };
  }

  /**
   * Find latest usage record for asset
   */
  async findLatestUsage(assetId: string): Promise<AssetUsage | null> {
    const result = await db
      .select()
      .from(assetUsage)
      .where(eq(assetUsage.assetId, assetId))
      .orderBy(desc(assetUsage.usedAt))
      .limit(1);

    return result.length > 0 ? this.mapToUsage(result[0]) : null;
  }

  // ============================================
  // PRIVATE HELPERS
  // ============================================

  private mapToUsage(row: any): AssetUsage {
    return {
      id: row.id,
      assetId: row.assetId,
      projectId: row.projectId,
      pageId: row.pageId,
      layerId: row.layerId,
      usedBy: row.usedBy,
      usedAt: row.usedAt,
    };
  }
}

export const assetUsageRepository = new AssetUsageRepository();