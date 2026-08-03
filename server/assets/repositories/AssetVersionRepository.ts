/**
 * Asset Version Repository
 * Data access layer for asset version history
 * Phase: 5.3 Part 5
 */

import { db } from '../../database';
import { assetVersions } from '../../database/schema/assets';
import { eq, and, desc, sql } from 'drizzle-orm';
import {
  AssetVersion,
  AssetVersionInsert,
} from '../types';

export class AssetVersionRepository {
  /**
   * Create a new version
   */
  async create(data: AssetVersionInsert): Promise<AssetVersion> {
    const result = await db
      .insert(assetVersions)
      .values({
        assetId: data.assetId,
        versionNumber: data.versionNumber,
        fileUrl: data.fileUrl,
        fileSize: data.fileSize,
        metadata: data.metadata || null,
        notes: data.notes || null,
        createdBy: data.createdBy,
      } as any)
      .returning();

    return this.mapToVersion(result[0]);
  }

  /**
   * Find version by ID
   */
  async findById(versionId: string, assetId?: string): Promise<AssetVersion | null> {
    const conditions = [eq(assetVersions.id, versionId)];

    if (assetId) {
      conditions.push(eq(assetVersions.assetId, assetId));
    }

    const result = await db
      .select()
      .from(assetVersions)
      .where(and(...conditions))
      .limit(1);

    return result.length > 0 ? this.mapToVersion(result[0]) : null;
  }

  /**
   * Find versions by asset
   */
  async findByAsset(assetId: string, limit: number = 50, offset: number = 0): Promise<AssetVersion[]> {
    const result = await db
      .select()
      .from(assetVersions)
      .where(eq(assetVersions.assetId, assetId))
      .orderBy(desc(assetVersions.versionNumber))
      .limit(limit)
      .offset(offset);

    return result.map(row => this.mapToVersion(row));
  }

  /**
   * Find latest version
   */
  async findLatest(assetId: string): Promise<AssetVersion | null> {
    const result = await db
      .select()
      .from(assetVersions)
      .where(eq(assetVersions.assetId, assetId))
      .orderBy(desc(assetVersions.versionNumber))
      .limit(1);

    return result.length > 0 ? this.mapToVersion(result[0]) : null;
  }

  /**
   * Find version by number
   */
  async findByVersionNumber(assetId: string, versionNumber: number): Promise<AssetVersion | null> {
    const result = await db
      .select()
      .from(assetVersions)
      .where(
        and(
          eq(assetVersions.assetId, assetId),
          eq(assetVersions.versionNumber, versionNumber)
        )
      )
      .limit(1);

    return result.length > 0 ? this.mapToVersion(result[0]) : null;
  }

  /**
   * Get next version number
   */
  async getNextVersionNumber(assetId: string): Promise<number> {
    const latest = await this.findLatest(assetId);
    return latest ? latest.versionNumber + 1 : 1;
  }

  /**
   * Count versions by asset
   */
  async countByAsset(assetId: string): Promise<number> {
    const result = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(assetVersions)
      .where(eq(assetVersions.assetId, assetId));

    return result[0]?.count || 0;
  }

  /**
   * Delete version
   */
  async delete(versionId: string): Promise<boolean> {
    const result = await db
      .delete(assetVersions)
      .where(eq(assetVersions.id, versionId));

    return (result.rowCount || 0) > 0;
  }

  /**
   * Delete all versions for asset
   */
  async deleteByAsset(assetId: string): Promise<number> {
    const result = await db
      .delete(assetVersions)
      .where(eq(assetVersions.assetId, assetId));

    return result.rowCount || 0;
  }

  /**
   * Delete old versions (keep last N)
   */
  async deleteOldVersions(assetId: string, keepCount: number): Promise<number> {
    const versions = await this.findByAsset(assetId, 1000, 0);

    if (versions.length <= keepCount) return 0;

    const toDelete = versions.slice(keepCount);
    let deletedCount = 0;

    for (const version of toDelete) {
      const deleted = await this.delete(version.id);
      if (deleted) deletedCount++;
    }

    return deletedCount;
  }

  // ============================================
  // PRIVATE HELPERS
  // ============================================

  private mapToVersion(row: any): AssetVersion {
    return {
      id: row.id,
      assetId: row.assetId,
      versionNumber: row.versionNumber,
      fileUrl: row.fileUrl,
      fileSize: Number(row.fileSize),
      metadata: row.metadata,
      notes: row.notes,
      createdBy: row.createdBy,
      createdAt: row.createdAt,
    };
  }
}

export const assetVersionRepository = new AssetVersionRepository();