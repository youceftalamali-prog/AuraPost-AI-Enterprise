/**
 * Asset Folder Repository
 * Data access layer for asset folder management
 * Phase: 5.3 Part 5
 */

import { db } from '../../database';
import { assetFolders } from '../../database/schema/assets';
import { eq, and, isNull, sql } from 'drizzle-orm';
import {
  AssetFolder,
  AssetFolderInsert,
  AssetFolderUpdate,
} from '../types';

export class AssetFolderRepository {
  /**
   * Create a new folder
   */
  async create(data: AssetFolderInsert): Promise<AssetFolder> {
    const result = await db
      .insert(assetFolders)
      .values({
        workspaceId: data.workspaceId,
        userId: data.userId,
        name: data.name,
        parentId: data.parentId || null,
        color: data.color || null,
        icon: data.icon || null,
        description: data.description || null,
        isSystem: data.isSystem || false,
      } as any)
      .returning();

    return this.mapToFolder(result[0]);
  }

  /**
   * Find folder by ID
   */
  async findById(folderId: string, workspaceId?: string): Promise<AssetFolder | null> {
    const conditions = [
      eq(assetFolders.id, folderId),
      isNull(assetFolders.deletedAt),
    ];

    if (workspaceId) {
      conditions.push(eq(assetFolders.workspaceId, workspaceId));
    }

    const result = await db
      .select()
      .from(assetFolders)
      .where(and(...conditions))
      .limit(1);

    return result.length > 0 ? this.mapToFolder(result[0]) : null;
  }

  /**
   * Find folders by workspace
   */
  async findByWorkspace(workspaceId: string): Promise<AssetFolder[]> {
    const result = await db
      .select()
      .from(assetFolders)
      .where(
        and(
          eq(assetFolders.workspaceId, workspaceId),
          isNull(assetFolders.deletedAt)
        )
      )
      .orderBy(assetFolders.name);

    return result.map(row => this.mapToFolder(row));
  }

  /**
   * Find folders by parent
   */
  async findByParent(parentId: string | null, workspaceId: string): Promise<AssetFolder[]> {
    const conditions = [
      eq(assetFolders.workspaceId, workspaceId),
      isNull(assetFolders.deletedAt),
    ];

    if (parentId) {
      conditions.push(eq(assetFolders.parentId, parentId));
    } else {
      conditions.push(isNull(assetFolders.parentId));
    }

    const result = await db
      .select()
      .from(assetFolders)
      .where(and(...conditions))
      .orderBy(assetFolders.name);

    return result.map(row => this.mapToFolder(row));
  }

  /**
   * Find root folders (no parent)
   */
  async findRootFolders(workspaceId: string): Promise<AssetFolder[]> {
    return this.findByParent(null, workspaceId);
  }

  /**
   * Get folder path (breadcrumb)
   */
  async getFolderPath(folderId: string): Promise<AssetFolder[]> {
    const path: AssetFolder[] = [];
    let currentId: string | null = folderId;

    while (currentId) {
      const folder = await this.findById(currentId);
      if (!folder) break;

      path.unshift(folder);
      currentId = folder.parentId;
    }

    return path;
  }

  /**
   * Get subfolder count
   */
  async getSubfolderCount(folderId: string): Promise<number> {
    const result = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(assetFolders)
      .where(
        and(
          eq(assetFolders.parentId, folderId),
          isNull(assetFolders.deletedAt)
        )
      );

    return result[0]?.count || 0;
  }

  /**
   * Get all descendant folder IDs
   */
  async getDescendantIds(folderId: string): Promise<string[]> {
    const ids: string[] = [];
    const queue: string[] = [folderId];

    while (queue.length > 0) {
      const currentId = queue.shift()!;
      const children = await this.findByParent(currentId, '');

      for (const child of children) {
        ids.push(child.id);
        queue.push(child.id);
      }
    }

    return ids;
  }

  /**
   * Update folder
   */
  async update(folderId: string, data: AssetFolderUpdate): Promise<AssetFolder | null> {
    const updateData: any = {
      ...data,
      updatedAt: new Date(),
    };

    const result = await db
      .update(assetFolders)
      .set(updateData)
      .where(
        and(
          eq(assetFolders.id, folderId),
          isNull(assetFolders.deletedAt)
        )
      )
      .returning();

    return result.length > 0 ? this.mapToFolder(result[0]) : null;
  }

  /**
   * Move folder to new parent
   */
  async moveToParent(folderId: string, newParentId: string | null): Promise<AssetFolder | null> {
    // Prevent circular reference
    if (newParentId) {
      const descendants = await this.getDescendantIds(folderId);
      if (descendants.includes(newParentId)) {
        throw new Error('Cannot move folder into its own descendant');
      }
    }

    return this.update(folderId, { parentId: newParentId });
  }

  /**
   * Soft delete folder
   */
  async softDelete(folderId: string): Promise<boolean> {
    const result = await db
      .update(assetFolders)
      .set({ deletedAt: new Date() } as any)
      .where(eq(assetFolders.id, folderId));

    return (result.rowCount || 0) > 0;
  }

  /**
   * Restore folder
   */
  async restore(folderId: string): Promise<AssetFolder | null> {
    const result = await db
      .update(assetFolders)
      .set({ deletedAt: null } as any)
      .where(eq(assetFolders.id, folderId))
      .returning();

    return result.length > 0 ? this.mapToFolder(result[0]) : null;
  }

  /**
   * Check if name exists in parent
   */
  async nameExistsInParent(name: string, parentId: string | null, workspaceId: string): Promise<boolean> {
    const conditions = [
      eq(assetFolders.workspaceId, workspaceId),
      eq(assetFolders.name, name),
      isNull(assetFolders.deletedAt),
    ];

    if (parentId) {
      conditions.push(eq(assetFolders.parentId, parentId));
    } else {
      conditions.push(isNull(assetFolders.parentId));
    }

    const result = await db
      .select({ id: assetFolders.id })
      .from(assetFolders)
      .where(and(...conditions))
      .limit(1);

    return result.length > 0;
  }

  /**
   * Count folders by workspace
   */
  async countByWorkspace(workspaceId: string): Promise<number> {
    const result = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(assetFolders)
      .where(
        and(
          eq(assetFolders.workspaceId, workspaceId),
          isNull(assetFolders.deletedAt)
        )
      );

    return result[0]?.count || 0;
  }

  /**
   * Permanent delete (use with caution)
   */
  async permanentDelete(folderId: string): Promise<boolean> {
    const result = await db
      .delete(assetFolders)
      .where(eq(assetFolders.id, folderId));

    return (result.rowCount || 0) > 0;
  }

  // ============================================
  // PRIVATE HELPERS
  // ============================================

  private mapToFolder(row: any): AssetFolder {
    return {
      id: row.id,
      workspaceId: row.workspaceId,
      userId: row.userId,
      name: row.name,
      parentId: row.parentId,
      color: row.color,
      icon: row.icon,
      description: row.description,
      isSystem: row.isSystem,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
      deletedAt: row.deletedAt,
    };
  }
}

export const assetFolderRepository = new AssetFolderRepository();