/**
 * Project Share Repository
 * Data access layer for project sharing
 * Phase: 5.3 Part 5
 */

import { db } from '../../database';
import { projectShares } from '../../database/schema/projects';
import { eq, and, isNull, sql } from 'drizzle-orm';
import {
  ProjectShare,
  ProjectShareInsert,
  ProjectShareUpdate,
  ShareType,
  SharePermission,
} from '../types';
import { randomBytes } from 'crypto';

export class ProjectShareRepository {
  /**
   * Create a new share
   */
  async create(data: ProjectShareInsert): Promise<ProjectShare> {
    const token = data.shareType === 'link' || data.shareType === 'public'
      ? data.token || this.generateToken()
      : null;

    const result = await db
      .insert(projectShares)
      .values({
        projectId: data.projectId,
        sharedBy: data.sharedBy,
        sharedWith: data.sharedWith || null,
        shareType: data.shareType,
        permission: data.permission || 'view',
        token,
        expiresAt: data.expiresAt || null,
      } as any)
      .returning();

    return this.mapToShare(result[0]);
  }

  /**
   * Find share by ID
   */
  async findById(id: string, projectId?: string): Promise<ProjectShare | null> {
    const conditions = [
      eq(projectShares.id, id),
      isNull(projectShares.deletedAt),
    ];

    if (projectId) {
      conditions.push(eq(projectShares.projectId, projectId));
    }

    const result = await db
      .select()
      .from(projectShares)
      .where(and(...conditions))
      .limit(1);

    return result.length > 0 ? this.mapToShare(result[0]) : null;
  }

  /**
   * Find share by token
   */
  async findByToken(token: string): Promise<ProjectShare | null> {
    const result = await db
      .select()
      .from(projectShares)
      .where(
        and(
          eq(projectShares.token, token),
          isNull(projectShares.deletedAt),
          sql`(${projectShares.expiresAt} IS NULL OR ${projectShares.expiresAt} > NOW())`
        )
      )
      .limit(1);

    return result.length > 0 ? this.mapToShare(result[0]) : null;
  }

  /**
   * Find shares by project
   */
  async findByProject(projectId: string): Promise<ProjectShare[]> {
    const result = await db
      .select()
      .from(projectShares)
      .where(
        and(
          eq(projectShares.projectId, projectId),
          isNull(projectShares.deletedAt)
        )
      );

    return result.map(row => this.mapToShare(row));
  }

  /**
   * Find active shares by project
   */
  async findActiveByProject(projectId: string): Promise<ProjectShare[]> {
    const result = await db
      .select()
      .from(projectShares)
      .where(
        and(
          eq(projectShares.projectId, projectId),
          isNull(projectShares.deletedAt),
          sql`(${projectShares.expiresAt} IS NULL OR ${projectShares.expiresAt} > NOW())`
        )
      );

    return result.map(row => this.mapToShare(row));
  }

  /**
   * Find shares by user (shared with)
   */
  async findBySharedWith(userId: string): Promise<ProjectShare[]> {
    const result = await db
      .select()
      .from(projectShares)
      .where(
        and(
          eq(projectShares.sharedWith, userId),
          isNull(projectShares.deletedAt),
          sql`(${projectShares.expiresAt} IS NULL OR ${projectShares.expiresAt} > NOW())`
        )
      );

    return result.map(row => this.mapToShare(row));
  }

  /**
   * Find shares by sharer
   */
  async findBySharedBy(userId: string): Promise<ProjectShare[]> {
    const result = await db
      .select()
      .from(projectShares)
      .where(
        and(
          eq(projectShares.sharedBy, userId),
          isNull(projectShares.deletedAt)
        )
      );

    return result.map(row => this.mapToShare(row));
  }

  /**
   * Update share
   */
  async update(id: string, data: ProjectShareUpdate): Promise<ProjectShare | null> {
    const result = await db
      .update(projectShares)
      .set({
        permission: data.permission,
        expiresAt: data.expiresAt,
      } as any)
      .where(
        and(
          eq(projectShares.id, id),
          isNull(projectShares.deletedAt)
        )
      )
      .returning();

    return result.length > 0 ? this.mapToShare(result[0]) : null;
  }

  /**
   * Update permission
   */
  async updatePermission(id: string, permission: SharePermission): Promise<ProjectShare | null> {
    const result = await db
      .update(projectShares)
      .set({ permission } as any)
      .where(
        and(
          eq(projectShares.id, id),
          isNull(projectShares.deletedAt)
        )
      )
      .returning();

    return result.length > 0 ? this.mapToShare(result[0]) : null;
  }

  /**
   * Update expiration
   */
  async updateExpiration(id: string, expiresAt: Date | null): Promise<ProjectShare | null> {
    const result = await db
      .update(projectShares)
      .set({ expiresAt } as any)
      .where(
        and(
          eq(projectShares.id, id),
          isNull(projectShares.deletedAt)
        )
      )
      .returning();

    return result.length > 0 ? this.mapToShare(result[0]) : null;
  }

  /**
   * Soft delete share
   */
  async softDelete(id: string): Promise<boolean> {
    const result = await db
      .update(projectShares)
      .set({ deletedAt: new Date() } as any)
      .where(eq(projectShares.id, id));

    return (result.rowCount || 0) > 0;
  }

  /**
   * Restore share
   */
  async restore(id: string): Promise<ProjectShare | null> {
    const result = await db
      .update(projectShares)
      .set({ deletedAt: null } as any)
      .where(eq(projectShares.id, id))
      .returning();

    return result.length > 0 ? this.mapToShare(result[0]) : null;
  }

  /**
   * Count shares by project
   */
  async countByProject(projectId: string): Promise<number> {
    const result = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(projectShares)
      .where(
        and(
          eq(projectShares.projectId, projectId),
          isNull(projectShares.deletedAt)
        )
      );

    return result[0]?.count || 0;
  }

  /**
   * Check if token exists
   */
  async tokenExists(token: string): Promise<boolean> {
    const result = await db
      .select({ id: projectShares.id })
      .from(projectShares)
      .where(
        and(
          eq(projectShares.token, token),
          isNull(projectShares.deletedAt)
        )
      )
      .limit(1);

    return result.length > 0;
  }

  /**
   * Delete expired shares
   */
  async deleteExpired(): Promise<number> {
    const result = await db
      .delete(projectShares)
      .where(
        and(
          sql`${projectShares.expiresAt} < NOW()`,
          isNull(projectShares.deletedAt)
        )
      );

    return result.rowCount || 0;
  }

  // ============================================
  // PRIVATE HELPERS
  // ============================================

  private mapToShare(row: any): ProjectShare {
    return {
      id: row.id,
      projectId: row.projectId,
      sharedBy: row.sharedBy,
      sharedWith: row.sharedWith,
      shareType: row.shareType,
      permission: row.permission,
      token: row.token,
      expiresAt: row.expiresAt,
      createdAt: row.createdAt,
      deletedAt: row.deletedAt,
    };
  }

  private generateToken(): string {
    return randomBytes(32).toString('hex');
  }
}

export const projectShareRepository = new ProjectShareRepository();