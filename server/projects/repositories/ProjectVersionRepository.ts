/**
 * Project Version Repository
 * Data access layer for project version history
 * Phase: 5.3 Part 5
 */

import { db } from '../../database';
import { projectVersions } from '../../database/schema/projects';
import { eq, and, desc, isNull, sql } from 'drizzle-orm';
import {
  ProjectVersion,
  ProjectVersionInsert,
} from '../types';

export class ProjectVersionRepository {
  /**
   * Create a new version
   */
  async create(data: ProjectVersionInsert): Promise<ProjectVersion> {
    const result = await db
      .insert(projectVersions)
      .values({
        projectId: data.projectId,
        versionNumber: data.versionNumber,
        name: data.name || null,
        description: data.description || null,
        snapshot: data.snapshot || {},
        layersSnapshot: data.layersSnapshot || [],
        canvasData: data.canvasData || {},
        thumbnailUrl: data.thumbnailUrl || null,
        createdBy: data.createdBy,
      } as any)
      .returning();

    return this.mapToVersion(result[0]);
  }

  /**
   * Find version by ID
   */
  async findById(id: string, projectId?: string): Promise<ProjectVersion | null> {
    const conditions = [eq(projectVersions.id, id)];

    if (projectId) {
      conditions.push(eq(projectVersions.projectId, projectId));
    }

    const result = await db
      .select()
      .from(projectVersions)
      .where(and(...conditions))
      .limit(1);

    return result.length > 0 ? this.mapToVersion(result[0]) : null;
  }

  /**
   * Find versions by project
   */
  async findByProject(projectId: string, limit: number = 50, offset: number = 0): Promise<ProjectVersion[]> {
    const result = await db
      .select()
      .from(projectVersions)
      .where(eq(projectVersions.projectId, projectId))
      .orderBy(desc(projectVersions.versionNumber))
      .limit(limit)
      .offset(offset);

    return result.map(row => this.mapToVersion(row));
  }

  /**
   * Find latest version
   */
  async findLatest(projectId: string): Promise<ProjectVersion | null> {
    const result = await db
      .select()
      .from(projectVersions)
      .where(eq(projectVersions.projectId, projectId))
      .orderBy(desc(projectVersions.versionNumber))
      .limit(1);

    return result.length > 0 ? this.mapToVersion(result[0]) : null;
  }

  /**
   * Find version by number
   */
  async findByVersionNumber(projectId: string, versionNumber: number): Promise<ProjectVersion | null> {
    const result = await db
      .select()
      .from(projectVersions)
      .where(
        and(
          eq(projectVersions.projectId, projectId),
          eq(projectVersions.versionNumber, versionNumber)
        )
      )
      .limit(1);

    return result.length > 0 ? this.mapToVersion(result[0]) : null;
  }

  /**
   * Get next version number
   */
  async getNextVersionNumber(projectId: string): Promise<number> {
    const latest = await this.findLatest(projectId);
    return latest ? latest.versionNumber + 1 : 1;
  }

  /**
   * Count versions by project
   */
  async countByProject(projectId: string): Promise<number> {
    const result = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(projectVersions)
      .where(eq(projectVersions.projectId, projectId));

    return result[0]?.count || 0;
  }

  /**
   * Delete version
   */
  async delete(id: string): Promise<boolean> {
    const result = await db
      .delete(projectVersions)
      .where(eq(projectVersions.id, id));

    return (result.rowCount || 0) > 0;
  }

  /**
   * Delete all versions for project
   */
  async deleteByProject(projectId: string): Promise<number> {
    const result = await db
      .delete(projectVersions)
      .where(eq(projectVersions.projectId, projectId));

    return result.rowCount || 0;
  }

  // ============================================
  // PRIVATE HELPERS
  // ============================================

  private mapToVersion(row: any): ProjectVersion {
    return {
      id: row.id,
      projectId: row.projectId,
      versionNumber: row.versionNumber,
      name: row.name,
      description: row.description,
      snapshot: row.snapshot || {},
      layersSnapshot: row.layersSnapshot || [],
      canvasData: row.canvasData || {},
      thumbnailUrl: row.thumbnailUrl,
      createdBy: row.createdBy,
      createdAt: row.createdAt,
    };
  }
}

export const projectVersionRepository = new ProjectVersionRepository();