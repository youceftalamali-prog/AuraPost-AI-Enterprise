/**
 * Asset Audit Repository
 * Data access layer for asset audit logging
 * Phase: 5.3 Part 5
 */

import { db } from '../../database';
import { assetAuditLogs } from '../../database/schema/assets';
import { eq, and, desc, sql, gte, lte } from 'drizzle-orm';
import {
  AssetAuditLog,
  AssetAuditLogInsert,
} from '../types';

export class AssetAuditRepository {
  /**
   * Create audit log entry
   */
  async create(data: AssetAuditLogInsert): Promise<AssetAuditLog> {
    const result = await db
      .insert(assetAuditLogs)
      .values({
        assetId: data.assetId,
        userId: data.userId,
        workspaceId: data.workspaceId,
        action: data.action,
        details: data.details || null,
        ipAddress: data.ipAddress || null,
        userAgent: data.userAgent || null,
      } as any)
      .returning();

    return this.mapToAuditLog(result[0]);
  }

  /**
   * Log asset action
   */
  async logAction(
    assetId: string,
    userId: string,
    workspaceId: string,
    action: string,
    details?: Record<string, any>,
    ipAddress?: string,
    userAgent?: string
  ): Promise<AssetAuditLog> {
    return this.create({
      assetId,
      userId,
      workspaceId,
      action,
      details,
      ipAddress,
      userAgent,
    });
  }

  /**
   * Find audit log by ID
   */
  async findById(logId: string): Promise<AssetAuditLog | null> {
    const result = await db
      .select()
      .from(assetAuditLogs)
      .where(eq(assetAuditLogs.id, logId))
      .limit(1);

    return result.length > 0 ? this.mapToAuditLog(result[0]) : null;
  }

  /**
   * Find audit logs by asset
   */
  async findByAsset(assetId: string, limit: number = 50, offset: number = 0): Promise<AssetAuditLog[]> {
    const result = await db
      .select()
      .from(assetAuditLogs)
      .where(eq(assetAuditLogs.assetId, assetId))
      .orderBy(desc(assetAuditLogs.createdAt))
      .limit(limit)
      .offset(offset);

    return result.map(row => this.mapToAuditLog(row));
  }

  /**
   * Find audit logs by workspace
   */
  async findByWorkspace(workspaceId: string, limit: number = 50, offset: number = 0): Promise<AssetAuditLog[]> {
    const result = await db
      .select()
      .from(assetAuditLogs)
      .where(eq(assetAuditLogs.workspaceId, workspaceId))
      .orderBy(desc(assetAuditLogs.createdAt))
      .limit(limit)
      .offset(offset);

    return result.map(row => this.mapToAuditLog(row));
  }

  /**
   * Find audit logs by user
   */
  async findByUser(userId: string, limit: number = 50, offset: number = 0): Promise<AssetAuditLog[]> {
    const result = await db
      .select()
      .from(assetAuditLogs)
      .where(eq(assetAuditLogs.userId, userId))
      .orderBy(desc(assetAuditLogs.createdAt))
      .limit(limit)
      .offset(offset);

    return result.map(row => this.mapToAuditLog(row));
  }

  /**
   * Find audit logs by action type
   */
  async findByAction(
    workspaceId: string,
    action: string,
    limit: number = 50,
    offset: number = 0
  ): Promise<AssetAuditLog[]> {
    const result = await db
      .select()
      .from(assetAuditLogs)
      .where(
        and(
          eq(assetAuditLogs.workspaceId, workspaceId),
          eq(assetAuditLogs.action, action)
        )
      )
      .orderBy(desc(assetAuditLogs.createdAt))
      .limit(limit)
      .offset(offset);

    return result.map(row => this.mapToAuditLog(row));
  }

  /**
   * Find audit logs by date range
   */
  async findByDateRange(
    workspaceId: string,
    dateFrom: Date,
    dateTo: Date,
    limit: number = 50
  ): Promise<AssetAuditLog[]> {
    const result = await db
      .select()
      .from(assetAuditLogs)
      .where(
        and(
          eq(assetAuditLogs.workspaceId, workspaceId),
          gte(assetAuditLogs.createdAt, dateFrom),
          lte(assetAuditLogs.createdAt, dateTo)
        )
      )
      .orderBy(desc(assetAuditLogs.createdAt))
      .limit(limit);

    return result.map(row => this.mapToAuditLog(row));
  }

  /**
   * Count audit logs by asset
   */
  async countByAsset(assetId: string): Promise<number> {
    const result = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(assetAuditLogs)
      .where(eq(assetAuditLogs.assetId, assetId));

    return result[0]?.count || 0;
  }

  /**
   * Count audit logs by workspace
   */
  async countByWorkspace(workspaceId: string): Promise<number> {
    const result = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(assetAuditLogs)
      .where(eq(assetAuditLogs.workspaceId, workspaceId));

    return result[0]?.count || 0;
  }

  /**
   * Count audit logs by user
   */
  async countByUser(userId: string): Promise<number> {
    const result = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(assetAuditLogs)
      .where(eq(assetAuditLogs.userId, userId));

    return result[0]?.count || 0;
  }

  /**
   * Count audit logs by action type
   */
  async countByAction(workspaceId: string, action: string): Promise<number> {
    const result = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(assetAuditLogs)
      .where(
        and(
          eq(assetAuditLogs.workspaceId, workspaceId),
          eq(assetAuditLogs.action, action)
        )
      );

    return result[0]?.count || 0;
  }

  /**
   * Get action distribution for workspace
   */
  async getActionDistribution(workspaceId: string): Promise<Array<{ action: string; count: number }>> {
    const result = await db
      .select({
        action: assetAuditLogs.action,
        count: sql<number>`count(*)::int`,
      })
      .from(assetAuditLogs)
      .where(eq(assetAuditLogs.workspaceId, workspaceId))
      .groupBy(assetAuditLogs.action)
      .orderBy(desc(sql`count(*)`));

    return result;
  }

  /**
   * Get most active users in workspace
   */
  async getMostActiveUsers(workspaceId: string, limit: number = 10): Promise<Array<{ userId: string; count: number }>> {
    const result = await db
      .select({
        userId: assetAuditLogs.userId,
        count: sql<number>`count(*)::int`,
      })
      .from(assetAuditLogs)
      .where(eq(assetAuditLogs.workspaceId, workspaceId))
      .groupBy(assetAuditLogs.userId)
      .orderBy(desc(sql`count(*)`))
      .limit(limit);

    return result;
  }

  /**
   * Get most accessed assets in workspace
   */
  async getMostAccessedAssets(workspaceId: string, limit: number = 10): Promise<Array<{ assetId: string; count: number }>> {
    const result = await db
      .select({
        assetId: assetAuditLogs.assetId,
        count: sql<number>`count(*)::int`,
      })
      .from(assetAuditLogs)
      .where(eq(assetAuditLogs.workspaceId, workspaceId))
      .groupBy(assetAuditLogs.assetId)
      .orderBy(desc(sql`count(*)`))
      .limit(limit);

    return result;
  }

  /**
   * Delete old audit logs (retention policy)
   */
  async deleteOlderThan(workspaceId: string, retentionDate: Date): Promise<number> {
    const result = await db
      .delete(assetAuditLogs)
      .where(
        and(
          eq(assetAuditLogs.workspaceId, workspaceId),
          sql`${assetAuditLogs.createdAt} < ${retentionDate}`
        )
      );

    return result.rowCount || 0;
  }

  /**
   * Delete audit logs by asset
   */
  async deleteByAsset(assetId: string): Promise<number> {
    const result = await db
      .delete(assetAuditLogs)
      .where(eq(assetAuditLogs.assetId, assetId));

    return result.rowCount || 0;
  }

  /**
   * Get recent activity feed for workspace
   */
  async getRecentActivity(workspaceId: string, limit: number = 20): Promise<AssetAuditLog[]> {
    const result = await db
      .select()
      .from(assetAuditLogs)
      .where(eq(assetAuditLogs.workspaceId, workspaceId))
      .orderBy(desc(assetAuditLogs.createdAt))
      .limit(limit);

    return result.map(row => this.mapToAuditLog(row));
  }

  /**
   * Get recent activity for asset
   */
  async getAssetActivity(assetId: string, limit: number = 20): Promise<AssetAuditLog[]> {
    return this.findByAsset(assetId, limit, 0);
  }

  /**
   * Get recent activity for user
   */
  async getUserActivity(userId: string, limit: number = 20): Promise<AssetAuditLog[]> {
    return this.findByUser(userId, limit, 0);
  }

  // ============================================
  // PRIVATE HELPERS
  // ============================================

  private mapToAuditLog(row: any): AssetAuditLog {
    return {
      id: row.id,
      assetId: row.assetId,
      userId: row.userId,
      workspaceId: row.workspaceId,
      action: row.action,
      details: row.details,
      ipAddress: row.ipAddress,
      userAgent: row.userAgent,
      createdAt: row.createdAt,
    };
  }
}

export const assetAuditRepository = new AssetAuditRepository();