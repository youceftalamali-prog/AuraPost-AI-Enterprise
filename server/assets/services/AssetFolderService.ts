/**
 * Asset Folder Service
 * Business logic for asset folder management
 * Phase: 5.3 Part 5
 */

import { assetFolderRepository } from '../repositories/AssetFolderRepository';
import { assetRepository } from '../repositories/AssetRepository';
import { assetAuditRepository } from '../repositories/AssetAuditRepository';
import { AssetFolder, AssetFolderInsert, AssetFolderUpdate } from '../types';
import { PipelineLogger } from '../../core/logger/PipelineLogger';

const logger = new PipelineLogger('AssetFolderService');

export interface CreateFolderInput {
  workspaceId: string;
  userId: string;
  name: string;
  parentId?: string | null;
  color?: string;
  icon?: string;
  description?: string;
}

export interface UpdateFolderInput {
  folderId: string;
  userId: string;
  workspaceId: string;
  name?: string;
  color?: string | null;
  icon?: string | null;
  description?: string | null;
  parentId?: string | null;
}

export interface FolderTree {
  folder: AssetFolder;
  children: FolderTree[];
  assetCount: number;
}

export class AssetFolderService {
  /**
   * Create a new folder
   */
  async createFolder(input: CreateFolderInput): Promise<AssetFolder> {
    logger.info('Creating folder', {
      workspaceId: input.workspaceId,
      userId: input.userId,
      name: input.name,
    });

    // Validate name
    if (!input.name || input.name.trim().length === 0) {
      throw new Error('Folder name is required');
    }

    if (input.name.length > 100) {
      throw new Error('Folder name must be at most 100 characters');
    }

    // Check if name exists in parent
    const nameExists = await assetFolderRepository.nameExistsInParent(
      input.name.trim(),
      input.parentId || null,
      input.workspaceId
    );

    if (nameExists) {
      throw new Error('A folder with this name already exists in this location');
    }

    // Check folder limit
    const folderCount = await assetFolderRepository.countByWorkspace(input.workspaceId);
    if (folderCount >= 1000) {
      throw new Error('Workspace folder limit reached (max 1000 folders)');
    }

    // Validate parent exists if provided
    if (input.parentId) {
      const parent = await assetFolderRepository.findById(input.parentId, input.workspaceId);
      if (!parent) {
        throw new Error('Parent folder not found');
      }
    }

    // Create folder
    const folderData: AssetFolderInsert = {
      workspaceId: input.workspaceId,
      userId: input.userId,
      name: input.name.trim(),
      parentId: input.parentId || null,
      color: input.color || null,
      icon: input.icon || null,
      description: input.description?.trim() || null,
    };

    const folder = await assetFolderRepository.create(folderData);

    // Log audit
    await assetAuditRepository.logAction(
      folder.id,
      input.userId,
      input.workspaceId,
      'folder_create',
      { name: folder.name, parentId: folder.parentId }
    );

    logger.info('Folder created successfully', {
      folderId: folder.id,
      workspaceId: folder.workspaceId,
    });

    return folder;
  }

  /**
   * Get folder by ID
   */
  async getFolder(folderId: string, userId: string, workspaceId: string): Promise<AssetFolder> {
    const folder = await assetFolderRepository.findById(folderId, workspaceId);

    if (!folder) {
      throw new Error('Folder not found');
    }

    return folder;
  }

  /**
   * Update folder
   */
  async updateFolder(input: UpdateFolderInput): Promise<AssetFolder> {
    logger.info('Updating folder', {
      folderId: input.folderId,
      userId: input.userId,
    });

    const folder = await assetFolderRepository.findById(input.folderId, input.workspaceId);

    if (!folder) {
      throw new Error('Folder not found');
    }

    // Validate name if provided
    if (input.name !== undefined) {
      if (input.name.trim().length === 0) {
        throw new Error('Folder name cannot be empty');
      }
      if (input.name.length > 100) {
        throw new Error('Folder name must be at most 100 characters');
      }

      // Check if name exists in parent
      const parentId = input.parentId !== undefined ? input.parentId : folder.parentId;
      const nameExists = await assetFolderRepository.nameExistsInParent(
        input.name.trim(),
        parentId,
        input.workspaceId
      );

      if (nameExists && input.name.trim() !== folder.name) {
        throw new Error('A folder with this name already exists in this location');
      }
    }

    // Validate parent if provided
    if (input.parentId !== undefined && input.parentId !== null) {
      // Prevent circular reference
      const descendants = await assetFolderRepository.getDescendantIds(input.folderId);
      if (descendants.includes(input.parentId)) {
        throw new Error('Cannot move folder into its own descendant');
      }

      const parent = await assetFolderRepository.findById(input.parentId, input.workspaceId);
      if (!parent) {
        throw new Error('Parent folder not found');
      }
    }

    // Build update data
    const updateData: AssetFolderUpdate = {};
    if (input.name !== undefined) updateData.name = input.name.trim();
    if (input.color !== undefined) updateData.color = input.color;
    if (input.icon !== undefined) updateData.icon = input.icon;
    if (input.description !== undefined) updateData.description = input.description?.trim() || null;
    if (input.parentId !== undefined) updateData.parentId = input.parentId;

    const updated = await assetFolderRepository.update(input.folderId, updateData);

    if (!updated) {
      throw new Error('Failed to update folder');
    }

    // Log audit
    await assetAuditRepository.logAction(
      input.folderId,
      input.userId,
      input.workspaceId,
      'folder_update',
      { changes: Object.keys(updateData) }
    );

    logger.info('Folder updated successfully', { folderId: input.folderId });

    return updated;
  }

  /**
   * Delete folder
   */
  async deleteFolder(folderId: string, userId: string, workspaceId: string): Promise<void> {
    logger.info('Deleting folder', { folderId, userId });

    const folder = await assetFolderRepository.findById(folderId, workspaceId);

    if (!folder) {
      throw new Error('Folder not found');
    }

    // Check if folder has subfolders
    const subfolderCount = await assetFolderRepository.getSubfolderCount(folderId);
    if (subfolderCount > 0) {
      throw new Error('Cannot delete folder with subfolders. Delete subfolders first.');
    }

    // Check if folder has assets
    const assets = await assetRepository.findByFolder(folderId, 1);
    if (assets.length > 0) {
      throw new Error('Cannot delete folder with assets. Move assets first.');
    }

    const result = await assetFolderRepository.softDelete(folderId);

    if (!result) {
      throw new Error('Failed to delete folder');
    }

    // Log audit
    await assetAuditRepository.logAction(
      folderId,
      userId,
      workspaceId,
      'folder_delete',
      { name: folder.name }
    );

    logger.info('Folder deleted successfully', { folderId });
  }

  /**
   * Restore folder
   */
  async restoreFolder(folderId: string, userId: string, workspaceId: string): Promise<AssetFolder> {
    logger.info('Restoring folder', { folderId, userId });

    const folder = await assetFolderRepository.findById(folderId, workspaceId);

    if (!folder) {
      throw new Error('Folder not found');
    }

    const restored = await assetFolderRepository.restore(folderId);

    if (!restored) {
      throw new Error('Failed to restore folder');
    }

    // Log audit
    await assetAuditRepository.logAction(
      folderId,
      userId,
      workspaceId,
      'folder_restore',
      { name: restored.name }
    );

    logger.info('Folder restored successfully', { folderId });

    return restored;
  }

  /**
   * Get folders by workspace
   */
  async getWorkspaceFolders(workspaceId: string): Promise<AssetFolder[]> {
    return assetFolderRepository.findByWorkspace(workspaceId);
  }

  /**
   * Get subfolders
   */
  async getSubfolders(parentId: string | null, workspaceId: string): Promise<AssetFolder[]> {
    return assetFolderRepository.findByParent(parentId, workspaceId);
  }

  /**
   * Get root folders
   */
  async getRootFolders(workspaceId: string): Promise<AssetFolder[]> {
    return assetFolderRepository.findRootFolders(workspaceId);
  }

  /**
   * Get folder path (breadcrumb)
   */
  async getFolderPath(folderId: string): Promise<AssetFolder[]> {
    return assetFolderRepository.getFolderPath(folderId);
  }

  /**
   * Get folder tree
   */
  async getFolderTree(workspaceId: string): Promise<FolderTree[]> {
    const rootFolders = await this.getRootFolders(workspaceId);
    const tree: FolderTree[] = [];

    for (const folder of rootFolders) {
      const folderTree = await this.buildFolderTree(folder.id, workspaceId);
      tree.push(folderTree);
    }

    return tree;
  }

  /**
   * Build folder tree recursively
   */
  private async buildFolderTree(folderId: string, workspaceId: string): Promise<FolderTree> {
    const folder = await assetFolderRepository.findById(folderId, workspaceId);

    if (!folder) {
      throw new Error('Folder not found');
    }

    const subfolders = await assetFolderRepository.findByParent(folderId, workspaceId);
    const assets = await assetRepository.findByFolder(folderId, 1000);

    const children: FolderTree[] = [];
    for (const subfolder of subfolders) {
      const childTree = await this.buildFolderTree(subfolder.id, workspaceId);
      children.push(childTree);
    }

    return {
      folder,
      children,
      assetCount: assets.length,
    };
  }

  /**
   * Move folder to new parent
   */
  async moveFolder(
    folderId: string,
    newParentId: string | null,
    userId: string,
    workspaceId: string
  ): Promise<AssetFolder> {
    logger.info('Moving folder', { folderId, newParentId, userId });

    return this.updateFolder({
      folderId,
      userId,
      workspaceId,
      parentId: newParentId,
    });
  }

  /**
   * Move assets to folder
   */
  async moveAssetsToFolder(
    assetIds: string[],
    folderId: string | null,
    userId: string,
    workspaceId: string
  ): Promise<number> {
    logger.info('Moving assets to folder', {
      assetCount: assetIds.length,
      folderId,
      userId,
    });

    // Validate folder exists if provided
    if (folderId) {
      const folder = await assetFolderRepository.findById(folderId, workspaceId);
      if (!folder) {
        throw new Error('Folder not found');
      }
    }

    // Update assets
    const count = await assetRepository.bulkUpdate(assetIds, { folderId });

    logger.info('Assets moved successfully', { count });

    return count;
  }

  /**
   * Get folder statistics
   */
  async getFolderStatistics(folderId: string): Promise<{
    totalAssets: number;
    totalSubfolders: number;
    totalSize: number;
  }> {
    const folder = await assetFolderRepository.findById(folderId);

    if (!folder) {
      throw new Error('Folder not found');
    }

    const assets = await assetRepository.findByFolder(folderId, 10000);
    const subfolderCount = await assetFolderRepository.getSubfolderCount(folderId);

    const totalSize = assets.reduce((sum, asset) => sum + asset.fileSize, 0);

    return {
      totalAssets: assets.length,
      totalSubfolders: subfolderCount,
      totalSize,
    };
  }

  /**
   * Check if folder exists
   */
  async folderExists(folderId: string): Promise<boolean> {
    const folder = await assetFolderRepository.findById(folderId);
    return folder !== null;
  }
}

export const assetFolderService = new AssetFolderService();