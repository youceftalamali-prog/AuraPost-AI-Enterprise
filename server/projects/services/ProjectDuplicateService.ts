/**
 * Project Duplicate Service
 * Business logic for project duplication
 * Phase: 5.3 Part 5
 */

import { projectRepository } from '../repositories/ProjectRepository';
import { projectPageRepository } from '../repositories/ProjectPageRepository';
import { projectVersionRepository } from '../repositories/ProjectVersionRepository';
import { projectShareRepository } from '../repositories/ProjectShareRepository';
import { Project, ProjectPage, ProjectDuplicateOptions } from '../types';
import { PipelineLogger } from '../../core/logger/PipelineLogger';

const logger = new PipelineLogger('ProjectDuplicateService');

export class ProjectDuplicateService {
  /**
   * Duplicate a project with all associated data
   */
  async duplicateProject(
    projectId: string,
    userId: string,
    workspaceId: string,
    options: ProjectDuplicateOptions = {}
  ): Promise<Project> {
    logger.info('Duplicating project', {
      projectId,
      userId,
      options,
    });

    // Get source project
    const sourceProject = await projectRepository.findById(projectId, workspaceId);

    if (!sourceProject) {
      throw new Error('Project not found');
    }

    // Generate new name
    const newName = options.newName || `${sourceProject.name} (copy)`;

    // Check workspace quota
    const workspaceStats = await projectRepository.getWorkspaceStats(workspaceId);
    if (workspaceStats.totalProjects >= 1000) {
      throw new Error('Workspace project limit reached');
    }

    // Create new project
    const newProject = await projectRepository.create({
      workspaceId,
      userId,
      name: newName,
      description: sourceProject.description,
      type: sourceProject.type,
      canvasWidth: sourceProject.canvasWidth,
      canvasHeight: sourceProject.canvasHeight,
      coverImageUrl: sourceProject.coverImageUrl,
      brandKitId: sourceProject.brandKitId,
      metadata: {
        ...sourceProject.metadata,
        sourceProjectId: sourceProject.id,
        duplicatedAt: new Date().toISOString(),
      },
      tags: [...sourceProject.tags],
      visibility: 'private',
    });

    // Duplicate pages if requested
    if (options.includePages !== false) {
      await this.duplicatePages(sourceProject.id, newProject.id);
    }

    // Duplicate versions if requested
    if (options.includeVersions === true) {
      await this.duplicateVersions(sourceProject.id, newProject.id, userId);
    }

    // Duplicate shares if requested
    if (options.includeShares === true) {
      await this.duplicateShares(sourceProject.id, newProject.id, userId);
    }

    // Create initial version for new project
    await projectVersionRepository.create({
      projectId: newProject.id,
      versionNumber: 1,
      name: 'Initial version',
      description: 'Project duplicated',
      snapshot: {
        project: newProject,
        sourceProjectId: sourceProject.id,
      },
      layersSnapshot: [],
      canvasData: {},
      createdBy: userId,
    });

    logger.info('Project duplicated successfully', {
      sourceProjectId: projectId,
      newProjectId: newProject.id,
    });

    return newProject;
  }

  /**
   * Duplicate multiple projects
   */
  async duplicateMultipleProjects(
    projectIds: string[],
    userId: string,
    workspaceId: string,
    options: ProjectDuplicateOptions = {}
  ): Promise<Project[]> {
    logger.info('Duplicating multiple projects', {
      count: projectIds.length,
      userId,
    });

    const results: Project[] = [];

    for (const projectId of projectIds) {
      try {
        const newProject = await this.duplicateProject(
          projectId,
          userId,
          workspaceId,
          options
        );
        results.push(newProject);
      } catch (error) {
        logger.error('Failed to duplicate project', {
          projectId,
          error: error instanceof Error ? error.message : 'Unknown',
        });
      }
    }

    logger.info('Multiple projects duplicated', {
      requested: projectIds.length,
      successful: results.length,
    });

    return results;
  }

  /**
   * Duplicate a project as a template
   */
  async duplicateAsTemplate(
    projectId: string,
    userId: string,
    workspaceId: string,
    templateName: string
  ): Promise<Project> {
    logger.info('Duplicating project as template', {
      projectId,
      templateName,
    });

    return this.duplicateProject(projectId, userId, workspaceId, {
      newName: templateName,
      includePages: true,
      includeVersions: false,
      includeShares: false,
      resetStatistics: true,
    });
  }

  /**
   * Duplicate pages from source project to new project
   */
  private async duplicatePages(
    sourceProjectId: string,
    newProjectId: string
  ): Promise<void> {
    const sourcePages = await projectPageRepository.findByProject(sourceProjectId);

    for (const page of sourcePages) {
      await projectPageRepository.create({
        projectId: newProjectId,
        name: page.name,
        pageIndex: page.pageIndex,
        canvasData: { ...page.canvasData },
        layersSnapshot: JSON.parse(JSON.stringify(page.layersSnapshot)),
        thumbnailUrl: page.thumbnailUrl,
        width: page.width,
        height: page.height,
      });
    }

    logger.debug('Pages duplicated', {
      sourceProjectId,
      newProjectId,
      pageCount: sourcePages.length,
    });
  }

  /**
   * Duplicate versions from source project to new project
   */
  private async duplicateVersions(
    sourceProjectId: string,
    newProjectId: string,
    userId: string
  ): Promise<void> {
    const sourceVersions = await projectVersionRepository.findByProject(sourceProjectId, 100, 0);

    for (const version of sourceVersions) {
      await projectVersionRepository.create({
        projectId: newProjectId,
        versionNumber: version.versionNumber,
        name: version.name,
        description: version.description,
        snapshot: { ...version.snapshot },
        layersSnapshot: JSON.parse(JSON.stringify(version.layersSnapshot)),
        canvasData: { ...version.canvasData },
        thumbnailUrl: version.thumbnailUrl,
        createdBy: userId,
      });
    }

    logger.debug('Versions duplicated', {
      sourceProjectId,
      newProjectId,
      versionCount: sourceVersions.length,
    });
  }

  /**
   * Duplicate shares from source project to new project
   */
  private async duplicateShares(
    sourceProjectId: string,
    newProjectId: string,
    userId: string
  ): Promise<void> {
    const sourceShares = await projectShareRepository.findByProject(sourceProjectId);

    for (const share of sourceShares) {
      // Skip expired or deleted shares
      if (share.expiresAt && share.expiresAt < new Date()) {
        continue;
      }

      await projectShareRepository.create({
        projectId: newProjectId,
        sharedBy: userId,
        sharedWith: share.sharedWith,
        shareType: share.shareType,
        permission: share.permission,
        expiresAt: share.expiresAt,
      });
    }

    logger.debug('Shares duplicated', {
      sourceProjectId,
      newProjectId,
      shareCount: sourceShares.length,
    });
  }
}

export const projectDuplicateService = new ProjectDuplicateService();