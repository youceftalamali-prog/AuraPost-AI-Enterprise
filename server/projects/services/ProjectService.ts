/**
 * Project Service
 * Core business logic for project lifecycle management
 * Phase: 5.3 Part 5
 */

import { projectRepository } from '../repositories/ProjectRepository';
import { projectPageRepository } from '../repositories/ProjectPageRepository';
import { projectVersionRepository } from '../repositories/ProjectVersionRepository';
import { projectShareRepository } from '../repositories/ProjectShareRepository';
import { Project, ProjectInsert, ProjectUpdate, ProjectFilters, ProjectPagination, ProjectQueryResult, ProjectStatistics, WorkspaceProjectStats } from '../types';
import { PipelineLogger } from '../../core/logger/PipelineLogger';
import { randomUUID } from 'crypto';

const logger = new PipelineLogger('ProjectService');

export interface CreateProjectInput {
  workspaceId: string;
  userId: string;
  name: string;
  description?: string;
  type?: string;
  canvasWidth?: number;
  canvasHeight?: number;
  coverImageUrl?: string;
  brandKitId?: string;
  tags?: string[];
  visibility?: string;
}

export interface UpdateProjectInput {
  projectId: string;
  userId: string;
  workspaceId: string;
  name?: string;
  description?: string;
  type?: string;
  canvasWidth?: number;
  canvasHeight?: number;
  coverImageUrl?: string;
  thumbnailUrl?: string;
  brandKitId?: string;
  tags?: string[];
  visibility?: string;
  metadata?: Record<string, any>;
}

export class ProjectService {
  /**
   * Create a new project with default page
   */
  async createProject(input: CreateProjectInput): Promise<Project> {
    logger.info('Creating project', {
      workspaceId: input.workspaceId,
      userId: input.userId,
      name: input.name,
    });

    // Validate input
    if (!input.name || input.name.trim().length < 2) {
      throw new Error('Project name must be at least 2 characters');
    }

    if (input.name.length > 200) {
      throw new Error('Project name must be at most 200 characters');
    }

    // Check workspace quota
    const workspaceStats = await projectRepository.getWorkspaceStats(input.workspaceId);
    if (workspaceStats.totalProjects >= 1000) {
      throw new Error('Workspace project limit reached');
    }

    // Create project
    const projectData: ProjectInsert = {
      workspaceId: input.workspaceId,
      userId: input.userId,
      name: input.name.trim(),
      description: input.description?.trim() || null,
      type: (input.type as any) || 'design',
      canvasWidth: input.canvasWidth || 1920,
      canvasHeight: input.canvasHeight || 1080,
      coverImageUrl: input.coverImageUrl || null,
      brandKitId: input.brandKitId || null,
      tags: input.tags || [],
      visibility: (input.visibility as any) || 'private',
    };

    const project = await projectRepository.create(projectData);

    // Create default first page
    await projectPageRepository.create({
      projectId: project.id,
      name: 'Page 1',
      pageIndex: 0,
      canvasData: {
        width: project.canvasWidth,
        height: project.canvasHeight,
        backgroundColor: '#ffffff',
      },
      layersSnapshot: [],
      width: project.canvasWidth,
      height: project.canvasHeight,
    });

    // Create initial version
    await projectVersionRepository.create({
      projectId: project.id,
      versionNumber: 1,
      name: 'Initial version',
      description: 'Project created',
      snapshot: { project, pages: [] },
      layersSnapshot: [],
      canvasData: {},
      createdBy: input.userId,
    });

    logger.info('Project created successfully', {
      projectId: project.id,
      workspaceId: project.workspaceId,
    });

    return project;
  }

  /**
   * Get project by ID with permission check
   */
  async getProject(
    projectId: string,
    userId: string,
    workspaceId: string
  ): Promise<Project> {
    const project = await projectRepository.findById(projectId, workspaceId);

    if (!project) {
      throw new Error('Project not found');
    }

    // Check if project is trashed
    if (project.isTrashed) {
      throw new Error('Project is in trash');
    }

    // Update last opened
    await projectRepository.updateLastOpened(projectId);

    return project;
  }

  /**
   * Update project
   */
  async updateProject(input: UpdateProjectInput): Promise<Project> {
    logger.info('Updating project', {
      projectId: input.projectId,
      userId: input.userId,
    });

    const project = await projectRepository.findById(input.projectId, input.workspaceId);

    if (!project) {
      throw new Error('Project not found');
    }

    // Check if project is locked
    if (project.isLocked) {
      throw new Error('Project is locked and cannot be edited');
    }

    // Check if project is trashed
    if (project.isTrashed) {
      throw new Error('Cannot edit a trashed project');
    }

    // Validate name if provided
    if (input.name !== undefined) {
      if (input.name.trim().length < 2) {
        throw new Error('Project name must be at least 2 characters');
      }
      if (input.name.length > 200) {
        throw new Error('Project name must be at most 200 characters');
      }
    }

    // Validate canvas dimensions if provided
    if (input.canvasWidth !== undefined) {
      if (input.canvasWidth < 100 || input.canvasWidth > 8000) {
        throw new Error('Canvas width must be between 100 and 8000 pixels');
      }
    }

    if (input.canvasHeight !== undefined) {
      if (input.canvasHeight < 100 || input.canvasHeight > 8000) {
        throw new Error('Canvas height must be between 100 and 8000 pixels');
      }
    }

    // Build update data
    const updateData: ProjectUpdate = {};
    if (input.name !== undefined) updateData.name = input.name.trim();
    if (input.description !== undefined) updateData.description = input.description.trim() || null;
    if (input.type !== undefined) updateData.type = input.type as any;
    if (input.canvasWidth !== undefined) updateData.canvasWidth = input.canvasWidth;
    if (input.canvasHeight !== undefined) updateData.canvasHeight = input.canvasHeight;
    if (input.coverImageUrl !== undefined) updateData.coverImageUrl = input.coverImageUrl;
    if (input.thumbnailUrl !== undefined) updateData.thumbnailUrl = input.thumbnailUrl;
    if (input.brandKitId !== undefined) updateData.brandKitId = input.brandKitId;
    if (input.tags !== undefined) updateData.tags = input.tags;
    if (input.visibility !== undefined) updateData.visibility = input.visibility as any;
    if (input.metadata !== undefined) updateData.metadata = input.metadata;

    const updated = await projectRepository.update(input.projectId, updateData);

    if (!updated) {
      throw new Error('Failed to update project');
    }

    logger.info('Project updated successfully', { projectId: input.projectId });

    return updated;
  }

  /**
   * Delete project (soft delete - move to trash)
   */
  async deleteProject(
    projectId: string,
    userId: string,
    workspaceId: string
  ): Promise<void> {
    logger.info('Deleting project', { projectId, userId });

    const project = await projectRepository.findById(projectId, workspaceId);

    if (!project) {
      throw new Error('Project not found');
    }

    if (project.isLocked) {
      throw new Error('Cannot delete a locked project');
    }

    if (project.isTrashed) {
      throw new Error('Project is already in trash');
    }

    const result = await projectRepository.softDelete(projectId);

    if (!result) {
      throw new Error('Failed to delete project');
    }

    logger.info('Project deleted successfully', { projectId });
  }

  /**
   * Restore project from trash
   */
  async restoreProject(
    projectId: string,
    userId: string,
    workspaceId: string
  ): Promise<Project> {
    logger.info('Restoring project', { projectId, userId });

    const project = await projectRepository.findById(projectId, workspaceId);

    if (!project) {
      throw new Error('Project not found');
    }

    if (!project.isTrashed) {
      throw new Error('Project is not in trash');
    }

    const restored = await projectRepository.restore(projectId);

    if (!restored) {
      throw new Error('Failed to restore project');
    }

    logger.info('Project restored successfully', { projectId });

    return restored;
  }

  /**
   * Archive project
   */
  async archiveProject(
    projectId: string,
    userId: string,
    workspaceId: string
  ): Promise<Project> {
    logger.info('Archiving project', { projectId, userId });

    const project = await projectRepository.findById(projectId, workspaceId);

    if (!project) {
      throw new Error('Project not found');
    }

    if (project.isArchived) {
      throw new Error('Project is already archived');
    }

    if (project.isTrashed) {
      throw new Error('Cannot archive a trashed project');
    }

    const archived = await projectRepository.archive(projectId);

    if (!archived) {
      throw new Error('Failed to archive project');
    }

    logger.info('Project archived successfully', { projectId });

    return archived;
  }

  /**
   * Unarchive project
   */
  async unarchiveProject(
    projectId: string,
    userId: string,
    workspaceId: string
  ): Promise<Project> {
    logger.info('Unarchiving project', { projectId, userId });

    const project = await projectRepository.findById(projectId, workspaceId);

    if (!project) {
      throw new Error('Project not found');
    }

    if (!project.isArchived) {
      throw new Error('Project is not archived');
    }

    const unarchived = await projectRepository.unarchive(projectId);

    if (!unarchived) {
      throw new Error('Failed to unarchive project');
    }

    logger.info('Project unarchived successfully', { projectId });

    return unarchived;
  }

  /**
   * Publish project
   */
  async publishProject(
    projectId: string,
    userId: string,
    workspaceId: string
  ): Promise<Project> {
    logger.info('Publishing project', { projectId, userId });

    const project = await projectRepository.findById(projectId, workspaceId);

    if (!project) {
      throw new Error('Project not found');
    }

    if (project.isPublished) {
      throw new Error('Project is already published');
    }

    if (project.isTrashed) {
      throw new Error('Cannot publish a trashed project');
    }

    if (project.isArchived) {
      throw new Error('Cannot publish an archived project');
    }

    const published = await projectRepository.publish(projectId);

    if (!published) {
      throw new Error('Failed to publish project');
    }

    logger.info('Project published successfully', { projectId });

    return published;
  }

  /**
   * Toggle favorite
   */
  async toggleFavorite(
    projectId: string,
    userId: string,
    workspaceId: string
  ): Promise<Project> {
    const project = await projectRepository.findById(projectId, workspaceId);

    if (!project) {
      throw new Error('Project not found');
    }

    const updated = await projectRepository.toggleFavorite(projectId);

    if (!updated) {
      throw new Error('Failed to toggle favorite');
    }

    return updated;
  }

  /**
   * Toggle lock
   */
  async toggleLock(
    projectId: string,
    userId: string,
    workspaceId: string
  ): Promise<Project> {
    const project = await projectRepository.findById(projectId, workspaceId);

    if (!project) {
      throw new Error('Project not found');
    }

    const updated = await projectRepository.toggleLock(projectId);

    if (!updated) {
      throw new Error('Failed to toggle lock');
    }

    return updated;
  }

  /**
   * List projects with filters and pagination
   */
  async listProjects(
    workspaceId: string,
    filters: Partial<ProjectFilters>,
    pagination: ProjectPagination
  ): Promise<ProjectQueryResult> {
    const fullFilters: ProjectFilters = {
      workspaceId,
      ...filters,
    };

    return projectRepository.findWithFilters(fullFilters, pagination);
  }

  /**
   * Get favorite projects
   */
  async getFavoriteProjects(workspaceId: string, userId: string): Promise<Project[]> {
    return projectRepository.findFavorites(workspaceId, userId);
  }

  /**
   * Get archived projects
   */
  async getArchivedProjects(workspaceId: string): Promise<Project[]> {
    return projectRepository.findArchived(workspaceId);
  }

  /**
   * Get trashed projects
   */
  async getTrashedProjects(workspaceId: string): Promise<Project[]> {
    return projectRepository.findTrashed(workspaceId);
  }

  /**
   * Get recent projects
   */
  async getRecentProjects(workspaceId: string, userId: string, limit: number = 10): Promise<Project[]> {
    return projectRepository.findRecent(workspaceId, userId, limit);
  }

  /**
   * Get project statistics
   */
  async getProjectStatistics(projectId: string): Promise<ProjectStatistics> {
    const project = await projectRepository.findById(projectId);

    if (!project) {
      throw new Error('Project not found');
    }

    const [pageCount, versionCount, shareCount] = await Promise.all([
      projectPageRepository.countByProject(projectId),
      projectVersionRepository.countByProject(projectId),
      projectShareRepository.countByProject(projectId),
    ]);

    return {
      projectId,
      pageCount,
      versionCount,
      shareCount,
      activityCount: 0,
      lastEditedAt: project.updatedAt,
      lastOpenedAt: project.lastOpenedAt,
      totalEdits: 0,
      totalExports: 0,
      totalAIActions: 0,
    };
  }

  /**
   * Get workspace statistics
   */
  async getWorkspaceStatistics(workspaceId: string): Promise<WorkspaceProjectStats> {
    const stats = await projectRepository.getWorkspaceStats(workspaceId);

    return {
      workspaceId,
      totalProjects: stats.totalProjects,
      draftCount: stats.draftCount,
      activeCount: stats.activeCount,
      publishedCount: stats.publishedCount,
      archivedCount: stats.archivedCount,
      trashedCount: stats.trashedCount,
      favoriteCount: stats.favoriteCount,
    };
  }

  /**
   * Check if project exists
   */
  async projectExists(projectId: string): Promise<boolean> {
    return projectRepository.exists(projectId);
  }

  /**
   * Permanently delete project (use with caution)
   */
  async permanentDeleteProject(
    projectId: string,
    userId: string,
    workspaceId: string
  ): Promise<void> {
    logger.warn('Permanently deleting project', { projectId, userId });

    const project = await projectRepository.findById(projectId, workspaceId);

    if (!project) {
      throw new Error('Project not found');
    }

    // Delete all related data
    await projectPageRepository.deleteByProject(projectId);
    await projectVersionRepository.deleteByProject(projectId);

    // Delete project
    await projectRepository.permanentDelete(projectId);

    logger.warn('Project permanently deleted', { projectId });
  }
}

export const projectService = new ProjectService();