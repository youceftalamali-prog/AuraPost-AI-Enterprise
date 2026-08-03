/**
 * Project Share Service
 * Business logic for project sharing and collaboration
 * Phase: 5.3 Part 5
 */

import { projectRepository } from '../repositories/ProjectRepository';
import { projectShareRepository } from '../repositories/ProjectShareRepository';
import { ProjectShare, ProjectShareInsert, ShareType, SharePermission } from '../types';
import { PipelineLogger } from '../../core/logger/PipelineLogger';

const logger = new PipelineLogger('ProjectShareService');

export interface ShareWithUserInput {
  projectId: string;
  sharedBy: string;
  sharedWith: string;
  workspaceId: string;
  permission?: SharePermission;
}

export interface ShareWithWorkspaceInput {
  projectId: string;
  sharedBy: string;
  workspaceId: string;
  permission?: SharePermission;
}

export interface CreatePublicLinkInput {
  projectId: string;
  sharedBy: string;
  workspaceId: string;
  permission?: SharePermission;
  expiresInDays?: number;
}

export interface ShareLinkResponse {
  shareId: string;
  shareUrl: string;
  permission: SharePermission;
  expiresAt: Date | null;
}

export class ProjectShareService {
  /**
   * Share project with a specific user
   */
  async shareWithUser(input: ShareWithUserInput): Promise<ProjectShare> {
    logger.info('Sharing project with user', {
      projectId: input.projectId,
      sharedWith: input.sharedWith,
    });

    const project = await projectRepository.findById(input.projectId, input.workspaceId);

    if (!project) {
      throw new Error('Project not found');
    }

    // Cannot share trashed project
    if (project.isTrashed) {
      throw new Error('Cannot share a trashed project');
    }

    // Cannot share with self
    if (input.sharedBy === input.sharedWith) {
      throw new Error('Cannot share project with yourself');
    }

    // Cannot share with project owner
    if (project.userId === input.sharedWith) {
      throw new Error('Cannot share project with its owner');
    }

    // Check if already shared
    const existingShares = await projectShareRepository.findByProject(input.projectId);
    const alreadyShared = existingShares.some(s => s.sharedWith === input.sharedWith);

    if (alreadyShared) {
      throw new Error('Project already shared with this user');
    }

    // Check share limit
    if (existingShares.length >= 50) {
      throw new Error('Project share limit reached (max 50 shares)');
    }

    const shareData: ProjectShareInsert = {
      projectId: input.projectId,
      sharedBy: input.sharedBy,
      sharedWith: input.sharedWith,
      shareType: 'user',
      permission: input.permission || 'view',
    };

    const share = await projectShareRepository.create(shareData);

    logger.info('Project shared with user successfully', {
      projectId: input.projectId,
      shareId: share.id,
    });

    return share;
  }

  /**
   * Share project with entire workspace
   */
  async shareWithWorkspace(input: ShareWithWorkspaceInput): Promise<ProjectShare> {
    logger.info('Sharing project with workspace', {
      projectId: input.projectId,
      workspaceId: input.workspaceId,
    });

    const project = await projectRepository.findById(input.projectId, input.workspaceId);

    if (!project) {
      throw new Error('Project not found');
    }

    if (project.isTrashed) {
      throw new Error('Cannot share a trashed project');
    }

    // Update project visibility to workspace
    await projectRepository.update(input.projectId, { visibility: 'workspace' });

    const shareData: ProjectShareInsert = {
      projectId: input.projectId,
      sharedBy: input.sharedBy,
      sharedWith: input.workspaceId,
      shareType: 'workspace',
      permission: input.permission || 'view',
    };

    const share = await projectShareRepository.create(shareData);

    logger.info('Project shared with workspace successfully', {
      projectId: input.projectId,
      shareId: share.id,
    });

    return share;
  }

  /**
   * Create public share link
   */
  async createPublicLink(input: CreatePublicLinkInput): Promise<ShareLinkResponse> {
    logger.info('Creating public share link', {
      projectId: input.projectId,
      expiresInDays: input.expiresInDays,
    });

    const project = await projectRepository.findById(input.projectId, input.workspaceId);

    if (!project) {
      throw new Error('Project not found');
    }

    if (project.isTrashed) {
      throw new Error('Cannot share a trashed project');
    }

    // Update project visibility to public
    await projectRepository.update(input.projectId, { visibility: 'public' });

    const expiresAt = input.expiresInDays
      ? new Date(Date.now() + input.expiresInDays * 24 * 60 * 60 * 1000)
      : null;

    const shareData: ProjectShareInsert = {
      projectId: input.projectId,
      sharedBy: input.sharedBy,
      shareType: 'link',
      permission: input.permission || 'view',
      expiresAt,
    };

    const share = await projectShareRepository.create(shareData);

    const baseUrl = process.env.APP_URL || 'https://app.aurapost.ai';
    const shareUrl = `${baseUrl}/share/${share.token}`;

    logger.info('Public share link created successfully', {
      projectId: input.projectId,
      shareId: share.id,
      shareUrl,
    });

    return {
      shareId: share.id,
      shareUrl,
      permission: share.permission,
      expiresAt: share.expiresAt,
    };
  }

  /**
   * Validate share token and return project access info
   */
  async validateShareToken(token: string): Promise<{
    isValid: boolean;
    projectId: string | null;
    permission: SharePermission | null;
    reason?: string;
  }> {
    const share = await projectShareRepository.findByToken(token);

    if (!share) {
      return {
        isValid: false,
        projectId: null,
        permission: null,
        reason: 'Invalid or expired share link',
      };
    }

    const project = await projectRepository.findById(share.projectId);

    if (!project) {
      return {
        isValid: false,
        projectId: null,
        permission: null,
        reason: 'Project not found',
      };
    }

    if (project.isTrashed) {
      return {
        isValid: false,
        projectId: null,
        permission: null,
        reason: 'Project has been deleted',
      };
    }

    return {
      isValid: true,
      projectId: share.projectId,
      permission: share.permission,
    };
  }

  /**
   * Update share permission
   */
  async updatePermission(
    shareId: string,
    permission: SharePermission,
    userId: string,
    workspaceId: string
  ): Promise<ProjectShare> {
    logger.info('Updating share permission', { shareId, permission });

    const share = await projectShareRepository.findById(shareId);

    if (!share) {
      throw new Error('Share not found');
    }

    // Verify user is the sharer or project owner
    if (share.sharedBy !== userId) {
      const project = await projectRepository.findById(share.projectId, workspaceId);
      if (!project || project.userId !== userId) {
        throw new Error('Permission denied');
      }
    }

    const updated = await projectShareRepository.updatePermission(shareId, permission);

    if (!updated) {
      throw new Error('Failed to update share permission');
    }

    logger.info('Share permission updated successfully', { shareId });

    return updated;
  }

  /**
   * Update share expiration
   */
  async updateExpiration(
    shareId: string,
    expiresAt: Date | null,
    userId: string,
    workspaceId: string
  ): Promise<ProjectShare> {
    logger.info('Updating share expiration', { shareId, expiresAt });

    const share = await projectShareRepository.findById(shareId);

    if (!share) {
      throw new Error('Share not found');
    }

    // Verify user is the sharer or project owner
    if (share.sharedBy !== userId) {
      const project = await projectRepository.findById(share.projectId, workspaceId);
      if (!project || project.userId !== userId) {
        throw new Error('Permission denied');
      }
    }

    const updated = await projectShareRepository.updateExpiration(shareId, expiresAt);

    if (!updated) {
      throw new Error('Failed to update share expiration');
    }

    logger.info('Share expiration updated successfully', { shareId });

    return updated;
  }

  /**
   * Revoke share
   */
  async revokeShare(
    shareId: string,
    userId: string,
    workspaceId: string
  ): Promise<void> {
    logger.info('Revoking share', { shareId, userId });

    const share = await projectShareRepository.findById(shareId);

    if (!share) {
      throw new Error('Share not found');
    }

    // Verify user is the sharer or project owner
    if (share.sharedBy !== userId) {
      const project = await projectRepository.findById(share.projectId, workspaceId);
      if (!project || project.userId !== userId) {
        throw new Error('Permission denied');
      }
    }

    const result = await projectShareRepository.softDelete(shareId);

    if (!result) {
      throw new Error('Failed to revoke share');
    }

    logger.info('Share revoked successfully', { shareId });
  }

  /**
   * Get all shares for a project
   */
  async getProjectShares(
    projectId: string,
    userId: string,
    workspaceId: string
  ): Promise<ProjectShare[]> {
    const project = await projectRepository.findById(projectId, workspaceId);

    if (!project) {
      throw new Error('Project not found');
    }

    return projectShareRepository.findActiveByProject(projectId);
  }

  /**
   * Get shares for a user (projects shared with them)
   */
  async getUserShares(userId: string): Promise<ProjectShare[]> {
    return projectShareRepository.findBySharedWith(userId);
  }

  /**
   * Get shares created by a user
   */
  async getSharesCreatedBy(userId: string): Promise<ProjectShare[]> {
    return projectShareRepository.findBySharedBy(userId);
  }

  /**
   * Get share count for project
   */
  async getShareCount(projectId: string): Promise<number> {
    return projectShareRepository.countByProject(projectId);
  }

  /**
   * Cleanup expired shares
   */
  async cleanupExpiredShares(): Promise<number> {
    logger.info('Cleaning up expired shares');

    const count = await projectShareRepository.deleteExpired();

    logger.info('Expired shares cleaned up', { count });

    return count;
  }
}

export const projectShareService = new ProjectShareService();