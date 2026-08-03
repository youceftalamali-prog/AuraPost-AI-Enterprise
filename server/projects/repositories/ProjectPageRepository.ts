/**
 * Project Page Repository
 * Data access layer for project pages
 * Phase: 5.3 Part 5
 */

import { db } from '../../database';
import { projectPages } from '../../database/schema/projects';
import { eq, and, asc, isNull, sql } from 'drizzle-orm';
import {
  ProjectPage,
  ProjectPageInsert,
  ProjectPageUpdate,
} from '../types';

export class ProjectPageRepository {
  /**
   * Create a new page
   */
  async create(data: ProjectPageInsert): Promise<ProjectPage> {
    const pageIndex = data.pageIndex ?? await this.getNextPageIndex(data.projectId);

    const result = await db
      .insert(projectPages)
      .values({
        projectId: data.projectId,
        name: data.name,
        pageIndex,
        canvasData: data.canvasData || {},
        layersSnapshot: data.layersSnapshot || [],
        thumbnailUrl: data.thumbnailUrl || null,
        width: data.width || 1920,
        height: data.height || 1080,
      } as any)
      .returning();

    return this.mapToPage(result[0]);
  }

  /**
   * Find page by ID
   */
  async findById(id: string, projectId?: string): Promise<ProjectPage | null> {
    const conditions = [
      eq(projectPages.id, id),
      isNull(projectPages.deletedAt),
    ];

    if (projectId) {
      conditions.push(eq(projectPages.projectId, projectId));
    }

    const result = await db
      .select()
      .from(projectPages)
      .where(and(...conditions))
      .limit(1);

    return result.length > 0 ? this.mapToPage(result[0]) : null;
  }

  /**
   * Find pages by project
   */
  async findByProject(projectId: string): Promise<ProjectPage[]> {
    const result = await db
      .select()
      .from(projectPages)
      .where(
        and(
          eq(projectPages.projectId, projectId),
          isNull(projectPages.deletedAt)
        )
      )
      .orderBy(asc(projectPages.pageIndex));

    return result.map(row => this.mapToPage(row));
  }

  /**
   * Find page by index
   */
  async findByIndex(projectId: string, pageIndex: number): Promise<ProjectPage | null> {
    const result = await db
      .select()
      .from(projectPages)
      .where(
        and(
          eq(projectPages.projectId, projectId),
          eq(projectPages.pageIndex, pageIndex),
          isNull(projectPages.deletedAt)
        )
      )
      .limit(1);

    return result.length > 0 ? this.mapToPage(result[0]) : null;
  }

  /**
   * Get next page index
   */
  async getNextPageIndex(projectId: string): Promise<number> {
    const result = await db
      .select({ maxIndex: sql<number>`max(${projectPages.pageIndex})` })
      .from(projectPages)
      .where(
        and(
          eq(projectPages.projectId, projectId),
          isNull(projectPages.deletedAt)
        )
      );

    return (result[0]?.maxIndex ?? -1) + 1;
  }

  /**
   * Update page
   */
  async update(id: string, data: ProjectPageUpdate): Promise<ProjectPage | null> {
    const updateData: any = {
      ...data,
      updatedAt: new Date(),
    };

    const result = await db
      .update(projectPages)
      .set(updateData)
      .where(
        and(
          eq(projectPages.id, id),
          isNull(projectPages.deletedAt)
        )
      )
      .returning();

    return result.length > 0 ? this.mapToPage(result[0]) : null;
  }

  /**
   * Update canvas data
   */
  async updateCanvasData(id: string, canvasData: Record<string, any>): Promise<void> {
    await db
      .update(projectPages)
      .set({
        canvasData,
        updatedAt: new Date(),
      } as any)
      .where(eq(projectPages.id, id));
  }

  /**
   * Update layers snapshot
   */
  async updateLayersSnapshot(id: string, layersSnapshot: any[]): Promise<void> {
    await db
      .update(projectPages)
      .set({
        layersSnapshot,
        updatedAt: new Date(),
      } as any)
      .where(eq(projectPages.id, id));
  }

  /**
   * Update thumbnail
   */
  async updateThumbnail(id: string, thumbnailUrl: string): Promise<void> {
    await db
      .update(projectPages)
      .set({
        thumbnailUrl,
        updatedAt: new Date(),
      } as any)
      .where(eq(projectPages.id, id));
  }

  /**
   * Reorder pages
   */
  async reorderPages(projectId: string, pageIds: string[]): Promise<void> {
    await db.transaction(async (tx) => {
      for (let i = 0; i < pageIds.length; i++) {
        await tx
          .update(projectPages)
          .set({ pageIndex: i, updatedAt: new Date() } as any)
          .where(
            and(
              eq(projectPages.id, pageIds[i]),
              eq(projectPages.projectId, projectId)
            )
          );
      }
    });
  }

  /**
   * Soft delete page
   */
  async softDelete(id: string): Promise<boolean> {
    const result = await db
      .update(projectPages)
      .set({ deletedAt: new Date() } as any)
      .where(eq(projectPages.id, id));

    return (result.rowCount || 0) > 0;
  }

  /**
   * Restore page
   */
  async restore(id: string): Promise<ProjectPage | null> {
    const result = await db
      .update(projectPages)
      .set({ deletedAt: null } as any)
      .where(eq(projectPages.id, id))
      .returning();

    return result.length > 0 ? this.mapToPage(result[0]) : null;
  }

  /**
   * Count pages by project
   */
  async countByProject(projectId: string): Promise<number> {
    const result = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(projectPages)
      .where(
        and(
          eq(projectPages.projectId, projectId),
          isNull(projectPages.deletedAt)
        )
      );

    return result[0]?.count || 0;
  }

  /**
   * Delete all pages for project
   */
  async deleteByProject(projectId: string): Promise<number> {
    const result = await db
      .delete(projectPages)
      .where(eq(projectPages.projectId, projectId));

    return result.rowCount || 0;
  }

  /**
   * Duplicate page
   */
  async duplicate(id: string): Promise<ProjectPage | null> {
    const page = await this.findById(id);
    if (!page) return null;

    const newIndex = await this.getNextPageIndex(page.projectId);

    const result = await db
      .insert(projectPages)
      .values({
        projectId: page.projectId,
        name: `${page.name} (copy)`,
        pageIndex: newIndex,
        canvasData: page.canvasData,
        layersSnapshot: page.layersSnapshot,
        thumbnailUrl: page.thumbnailUrl,
        width: page.width,
        height: page.height,
      } as any)
      .returning();

    return result.length > 0 ? this.mapToPage(result[0]) : null;
  }

  // ============================================
  // PRIVATE HELPERS
  // ============================================

  private mapToPage(row: any): ProjectPage {
    return {
      id: row.id,
      projectId: row.projectId,
      name: row.name,
      pageIndex: row.pageIndex,
      canvasData: row.canvasData || {},
      layersSnapshot: row.layersSnapshot || [],
      thumbnailUrl: row.thumbnailUrl,
      width: row.width,
      height: row.height,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
      deletedAt: row.deletedAt,
    };
  }
}

export const projectPageRepository = new ProjectPageRepository();