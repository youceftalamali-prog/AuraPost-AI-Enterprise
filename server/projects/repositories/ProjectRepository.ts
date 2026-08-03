/**
 * Project Repository
 * Data access layer for project management
 * Phase: 5.3 Part 5
 */

import { db } from '../../database';
import { projects } from '../../database/schema/projects';
import { eq, and, or, desc, asc, like, gte, lte, isNull, sql, inArray } from 'drizzle-orm';
import {
  Project,
  ProjectInsert,
  ProjectUpdate,
  ProjectFilters,
  ProjectPagination,
  ProjectQueryResult,
  ProjectStatus,
} from '../types';

export class ProjectRepository {
  /**
   * Create a new project
   */
  async create(data: ProjectInsert): Promise<Project> {
    const result = await db
      .insert(projects)
      .values({
        workspaceId: data.workspaceId,
        userId: data.userId,
        name: data.name,
        slug: data.slug || this.generateSlug(data.name),
        description: data.description || null,
        type: data.type || 'design',
        status: data.status || 'draft',
        visibility: data.visibility || 'private',
        canvasWidth: data.canvasWidth || 1920,
        canvasHeight: data.canvasHeight || 1080,
        coverImageUrl: data.coverImageUrl || null,
        brandKitId: data.brandKitId || null,
        metadata: data.metadata || {},
        tags: data.tags || [],
        isFavorite: data.isFavorite || false,
      } as any)
      .returning();

    return this.mapToProject(result[0]);
  }

  /**
   * Find project by ID
   */
  async findById(id: string, workspaceId?: string): Promise<Project | null> {
    const conditions = [
      eq(projects.id, id),
      isNull(projects.deletedAt),
    ];

    if (workspaceId) {
      conditions.push(eq(projects.workspaceId, workspaceId));
    }

    const result = await db
      .select()
      .from(projects)
      .where(and(...conditions))
      .limit(1);

    return result.length > 0 ? this.mapToProject(result[0]) : null;
  }

  /**
   * Find project by slug
   */
  async findBySlug(slug: string, workspaceId: string): Promise<Project | null> {
    const result = await db
      .select()
      .from(projects)
      .where(
        and(
          eq(projects.slug, slug),
          eq(projects.workspaceId, workspaceId),
          isNull(projects.deletedAt)
        )
      )
      .limit(1);

    return result.length > 0 ? this.mapToProject(result[0]) : null;
  }

  /**
   * Find projects with filters and pagination
   */
  async findWithFilters(
    filters: ProjectFilters,
    pagination: ProjectPagination
  ): Promise<ProjectQueryResult> {
    const conditions: any[] = [
      eq(projects.workspaceId, filters.workspaceId),
      isNull(projects.deletedAt),
    ];

    // Apply filters
    if (filters.status) {
      conditions.push(eq(projects.status, filters.status));
    }

    if (filters.visibility) {
      conditions.push(eq(projects.visibility, filters.visibility));
    }

    if (filters.type) {
      conditions.push(eq(projects.type, filters.type));
    }

    if (filters.isFavorite !== undefined) {
      conditions.push(eq(projects.isFavorite, filters.isFavorite));
    }

    if (filters.isArchived !== undefined) {
      conditions.push(eq(projects.isArchived, filters.isArchived));
    }

    if (filters.isTrashed !== undefined) {
      conditions.push(eq(projects.isTrashed, filters.isTrashed));
    }

    if (filters.isPublished !== undefined) {
      conditions.push(eq(projects.isPublished, filters.isPublished));
    }

    if (filters.userId) {
      conditions.push(eq(projects.userId, filters.userId));
    }

    if (filters.search) {
      conditions.push(
        or(
          like(projects.name, `%${filters.search}%`),
          like(projects.description, `%${filters.search}%`)
        )
      );
    }

    if (filters.tags && filters.tags.length > 0) {
      conditions.push(sql`${projects.tags} ?| ${filters.tags}`);
    }

    if (filters.dateFrom) {
      conditions.push(gte(projects.createdAt, filters.dateFrom));
    }

    if (filters.dateTo) {
      conditions.push(lte(projects.createdAt, filters.dateTo));
    }

    // Get total count
    const countResult = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(projects)
      .where(and(...conditions));

    const total = countResult[0]?.count || 0;

    // Apply pagination
    const page = pagination.page || 1;
    const limit = pagination.limit || 20;
    const offset = (page - 1) * limit;

    // Apply sorting
    const sortBy = pagination.sortBy || 'updatedAt';
    const sortDirection = pagination.sortDirection || 'desc';
    const sortColumn = this.getSortColumn(sortBy);
    const orderFn = sortDirection === 'asc' ? asc : desc;

    // Get projects
    const result = await db
      .select()
      .from(projects)
      .where(and(...conditions))
      .orderBy(orderFn(sortColumn))
      .limit(limit)
      .offset(offset);

    const projectList = result.map(row => this.mapToProject(row));

    return {
      projects: projectList,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  /**
   * Find projects by workspace
   */
  async findByWorkspace(workspaceId: string, limit: number = 50): Promise<Project[]> {
    const result = await db
      .select()
      .from(projects)
      .where(
        and(
          eq(projects.workspaceId, workspaceId),
          isNull(projects.deletedAt),
          eq(projects.isTrashed, false)
        )
      )
      .orderBy(desc(projects.updatedAt))
      .limit(limit);

    return result.map(row => this.mapToProject(row));
  }

  /**
   * Find projects by user
   */
  async findByUser(userId: string, workspaceId?: string, limit: number = 50): Promise<Project[]> {
    const conditions = [
      eq(projects.userId, userId),
      isNull(projects.deletedAt),
    ];

    if (workspaceId) {
      conditions.push(eq(projects.workspaceId, workspaceId));
    }

    const result = await db
      .select()
      .from(projects)
      .where(and(...conditions))
      .orderBy(desc(projects.updatedAt))
      .limit(limit);

    return result.map(row => this.mapToProject(row));
  }

  /**
   * Find favorite projects
   */
  async findFavorites(workspaceId: string, userId: string): Promise<Project[]> {
    const result = await db
      .select()
      .from(projects)
      .where(
        and(
          eq(projects.workspaceId, workspaceId),
          eq(projects.userId, userId),
          eq(projects.isFavorite, true),
          isNull(projects.deletedAt)
        )
      )
      .orderBy(desc(projects.updatedAt));

    return result.map(row => this.mapToProject(row));
  }

  /**
   * Find archived projects
   */
  async findArchived(workspaceId: string): Promise<Project[]> {
    const result = await db
      .select()
      .from(projects)
      .where(
        and(
          eq(projects.workspaceId, workspaceId),
          eq(projects.isArchived, true),
          isNull(projects.deletedAt)
        )
      )
      .orderBy(desc(projects.archivedAt));

    return result.map(row => this.mapToProject(row));
  }

  /**
   * Find trashed projects
   */
  async findTrashed(workspaceId: string): Promise<Project[]> {
    const result = await db
      .select()
      .from(projects)
      .where(
        and(
          eq(projects.workspaceId, workspaceId),
          eq(projects.isTrashed, true),
          isNull(projects.deletedAt)
        )
      )
      .orderBy(desc(projects.trashedAt));

    return result.map(row => this.mapToProject(row));
  }

  /**
   * Find recent projects
   */
  async findRecent(workspaceId: string, userId: string, limit: number = 10): Promise<Project[]> {
    const result = await db
      .select()
      .from(projects)
      .where(
        and(
          eq(projects.workspaceId, workspaceId),
          eq(projects.userId, userId),
          isNull(projects.deletedAt),
          eq(projects.isTrashed, false)
        )
      )
      .orderBy(desc(sql`COALESCE(${projects.lastOpenedAt}, ${projects.updatedAt})`))
      .limit(limit);

    return result.map(row => this.mapToProject(row));
  }

  /**
   * Update project
   */
  async update(id: string, data: ProjectUpdate): Promise<Project | null> {
    const updateData: any = {
      ...data,
      updatedAt: new Date(),
    };

    const result = await db
      .update(projects)
      .set(updateData)
      .where(
        and(
          eq(projects.id, id),
          isNull(projects.deletedAt)
        )
      )
      .returning();

    return result.length > 0 ? this.mapToProject(result[0]) : null;
  }

  /**
   * Soft delete project
   */
  async softDelete(id: string): Promise<boolean> {
    const result = await db
      .update(projects)
      .set({
        deletedAt: new Date(),
        isTrashed: true,
        trashedAt: new Date(),
      } as any)
      .where(eq(projects.id, id));

    return (result.rowCount || 0) > 0;
  }

  /**
   * Restore project from trash
   */
  async restore(id: string): Promise<Project | null> {
    const result = await db
      .update(projects)
      .set({
        deletedAt: null,
        isTrashed: false,
        trashedAt: null,
      } as any)
      .where(eq(projects.id, id))
      .returning();

    return result.length > 0 ? this.mapToProject(result[0]) : null;
  }

  /**
   * Archive project
   */
  async archive(id: string): Promise<Project | null> {
    const result = await db
      .update(projects)
      .set({
        isArchived: true,
        archivedAt: new Date(),
        status: 'archived',
      } as any)
      .where(eq(projects.id, id))
      .returning();

    return result.length > 0 ? this.mapToProject(result[0]) : null;
  }

  /**
   * Unarchive project
   */
  async unarchive(id: string): Promise<Project | null> {
    const result = await db
      .update(projects)
      .set({
        isArchived: false,
        archivedAt: null,
        status: 'active',
      } as any)
      .where(eq(projects.id, id))
      .returning();

    return result.length > 0 ? this.mapToProject(result[0]) : null;
  }

  /**
   * Publish project
   */
  async publish(id: string): Promise<Project | null> {
    const result = await db
      .update(projects)
      .set({
        isPublished: true,
        publishedAt: new Date(),
        status: 'published',
      } as any)
      .where(eq(projects.id, id))
      .returning();

    return result.length > 0 ? this.mapToProject(result[0]) : null;
  }

  /**
   * Toggle favorite
   */
  async toggleFavorite(id: string): Promise<Project | null> {
    const project = await this.findById(id);
    if (!project) return null;

    const result = await db
      .update(projects)
      .set({ isFavorite: !project.isFavorite } as any)
      .where(eq(projects.id, id))
      .returning();

    return result.length > 0 ? this.mapToProject(result[0]) : null;
  }

  /**
   * Toggle lock
   */
  async toggleLock(id: string): Promise<Project | null> {
    const project = await this.findById(id);
    if (!project) return null;

    const result = await db
      .update(projects)
      .set({ isLocked: !project.isLocked } as any)
      .where(eq(projects.id, id))
      .returning();

    return result.length > 0 ? this.mapToProject(result[0]) : null;
  }

  /**
   * Update last opened timestamp
   */
  async updateLastOpened(id: string): Promise<void> {
    await db
      .update(projects)
      .set({ lastOpenedAt: new Date() } as any)
      .where(eq(projects.id, id));
  }

  /**
   * Check if project exists
   */
  async exists(id: string): Promise<boolean> {
    const result = await db
      .select({ id: projects.id })
      .from(projects)
      .where(
        and(
          eq(projects.id, id),
          isNull(projects.deletedAt)
        )
      )
      .limit(1);

    return result.length > 0;
  }

  /**
   * Check if slug is available
   */
  async isSlugAvailable(slug: string, workspaceId: string): Promise<boolean> {
    const result = await db
      .select({ id: projects.id })
      .from(projects)
      .where(
        and(
          eq(projects.slug, slug),
          eq(projects.workspaceId, workspaceId),
          isNull(projects.deletedAt)
        )
      )
      .limit(1);

    return result.length === 0;
  }

  /**
   * Count projects by workspace
   */
  async countByWorkspace(workspaceId: string): Promise<number> {
    const result = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(projects)
      .where(
        and(
          eq(projects.workspaceId, workspaceId),
          isNull(projects.deletedAt),
          eq(projects.isTrashed, false)
        )
      );

    return result[0]?.count || 0;
  }

  /**
   * Get workspace statistics
   */
  async getWorkspaceStats(workspaceId: string): Promise<{
    totalProjects: number;
    draftCount: number;
    activeCount: number;
    publishedCount: number;
    archivedCount: number;
    trashedCount: number;
    favoriteCount: number;
  }> {
    const result = await db
      .select({
        totalProjects: sql<number>`count(*)::int`,
        draftCount: sql<number>`count(case when ${projects.status} = 'draft' then 1 end)::int`,
        activeCount: sql<number>`count(case when ${projects.status} = 'active' then 1 end)::int`,
        publishedCount: sql<number>`count(case when ${projects.isPublished} = true then 1 end)::int`,
        archivedCount: sql<number>`count(case when ${projects.isArchived} = true then 1 end)::int`,
        trashedCount: sql<number>`count(case when ${projects.isTrashed} = true then 1 end)::int`,
        favoriteCount: sql<number>`count(case when ${projects.isFavorite} = true then 1 end)::int`,
      })
      .from(projects)
      .where(
        and(
          eq(projects.workspaceId, workspaceId),
          isNull(projects.deletedAt)
        )
      );

    return result[0];
  }

  /**
   * Permanent delete (use with caution)
   */
  async permanentDelete(id: string): Promise<boolean> {
    const result = await db
      .delete(projects)
      .where(eq(projects.id, id));

    return (result.rowCount || 0) > 0;
  }

  // ============================================
  // PRIVATE HELPERS
  // ============================================

  private mapToProject(row: any): Project {
    return {
      id: row.id,
      workspaceId: row.workspaceId,
      userId: row.userId,
      name: row.name,
      slug: row.slug,
      description: row.description,
      type: row.type,
      status: row.status,
      visibility: row.visibility,
      canvasWidth: row.canvasWidth,
      canvasHeight: row.canvasHeight,
      coverImageUrl: row.coverImageUrl,
      thumbnailUrl: row.thumbnailUrl,
      brandKitId: row.brandKitId,
      metadata: row.metadata || {},
      tags: row.tags || [],
      isFavorite: row.isFavorite,
      isLocked: row.isLocked,
      isArchived: row.isArchived,
      isTrashed: row.isTrashed,
      isPublished: row.isPublished,
      archivedAt: row.archivedAt,
      trashedAt: row.trashedAt,
      publishedAt: row.publishedAt,
      lastOpenedAt: row.lastOpenedAt,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
      deletedAt: row.deletedAt,
    };
  }

  private getSortColumn(sortBy: string): any {
    const columnMap: Record<string, any> = {
      createdAt: projects.createdAt,
      updatedAt: projects.updatedAt,
      name: projects.name,
      lastOpenedAt: projects.lastOpenedAt,
    };
    return columnMap[sortBy] || projects.updatedAt;
  }

  private generateSlug(name: string): string {
    const base = name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .substring(0, 50);
    const suffix = Math.random().toString(36).substring(2, 8);
    return `${base}-${suffix}`;
  }
}

export const projectRepository = new ProjectRepository();