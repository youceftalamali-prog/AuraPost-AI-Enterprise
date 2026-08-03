/**
 * Project Version Service
 * Business logic for project version history management
 * Phase: 5.3 Part 5
 */

import { projectRepository } from '../repositories/ProjectRepository';
import { projectPageRepository } from '../repositories/ProjectPageRepository';
import { projectVersionRepository } from '../repositories/ProjectVersionRepository';
import { ProjectVersion, ProjectVersionInsert } from '../types';
import { PipelineLogger } from '../../core/logger/PipelineLogger';

const logger = new PipelineLogger('ProjectVersionService');

export interface CreateVersionInput {
  projectId: string;
  userId: string;
  workspaceId: string;
  name?: string;
  description?: string;
  includePages?: boolean;
  includeCanvasData?: boolean;
}

export interface RestoreVersionInput {
  projectId: string;
  versionId: string;
  userId: string;
  workspaceId: string;
  createNewVersionBeforeRestore?: boolean;
  restorePages?: boolean;
  restoreCanvasData?: boolean;
}

export interface VersionComparison {
  version1: ProjectVersion;
  version2: ProjectVersion;
  differences: {
    pageCountDiff: number;
    canvasSizeChanged: boolean;
    metadataChanged: boolean;
    layersChanged: boolean;
  };
}

export class ProjectVersionService {
  /**
   * Create a manual version snapshot
   */
  async createVersion(input: CreateVersionInput): Promise<ProjectVersion> {
    logger.info('Creating version', {
      projectId: input.projectId,
      userId: input.userId,
    });

    const project = await projectRepository.findById(input.projectId, input.workspaceId);

    if (!project) {
      throw new Error('Project not found');
    }

    if (project.isLocked) {
      throw new Error('Project is locked');
    }

    // Check version limit
    const versionCount = await projectVersionRepository.countByProject(input.projectId);
    if (versionCount >= 500) {
      throw new Error('Project version limit reached (max 500 versions)');
    }

    // Get next version number
    const nextVersionNumber = await projectVersionRepository.getNextVersionNumber(input.projectId);

    // Build snapshot
    const snapshot: Record<string, any> = {
      project: {
        id: project.id,
        name: project.name,
        canvasWidth: project.canvasWidth,
        canvasHeight: project.canvasHeight,
        metadata: project.metadata,
        tags: project.tags,
      },
    };

    let layersSnapshot: any[] = [];
    let canvasData: Record<string, any> = {};

    // Include pages if requested
    if (input.includePages !== false) {
      const pages = await projectPageRepository.findByProject(input.projectId);
      snapshot.pages = pages.map(p => ({
        id: p.id,
        name: p.name,
        pageIndex: p.pageIndex,
        width: p.width,
        height: p.height,
      }));

      // Use first page for layers snapshot
      if (pages.length > 0) {
        layersSnapshot = pages[0].layersSnapshot;
        canvasData = pages[0].canvasData;
      }
    }

    const versionData: ProjectVersionInsert = {
      projectId: input.projectId,
      versionNumber: nextVersionNumber,
      name: input.name || `Version ${nextVersionNumber}`,
      description: input.description || null,
      snapshot,
      layersSnapshot,
      canvasData: input.includeCanvasData !== false ? canvasData : {},
      createdBy: input.userId,
    };

    const version = await projectVersionRepository.create(versionData);

    logger.info('Version created successfully', {
      projectId: input.projectId,
      versionId: version.id,
      versionNumber: version.versionNumber,
    });

    return version;
  }

  /**
   * Create automatic version (called by system after significant changes)
   */
  async createAutoVersion(
    projectId: string,
    userId: string,
    workspaceId: string,
    trigger: string
  ): Promise<ProjectVersion> {
    logger.debug('Creating auto version', { projectId, trigger });

    return this.createVersion({
      projectId,
      userId,
      workspaceId,
      name: `Auto-save (${trigger})`,
      description: `Automatic version created by ${trigger}`,
    });
  }

  /**
   * Restore a version
   */
  async restoreVersion(input: RestoreVersionInput): Promise<ProjectVersion> {
    logger.info('Restoring version', {
      projectId: input.projectId,
      versionId: input.versionId,
      userId: input.userId,
    });

    const project = await projectRepository.findById(input.projectId, input.workspaceId);

    if (!project) {
      throw new Error('Project not found');
    }

    if (project.isLocked) {
      throw new Error('Project is locked');
    }

    const version = await projectVersionRepository.findById(input.versionId, input.projectId);

    if (!version) {
      throw new Error('Version not found');
    }

    // Optionally create a version of current state before restoring
    if (input.createNewVersionBeforeRestore !== false) {
      await this.createAutoVersion(
        input.projectId,
        input.userId,
        input.workspaceId,
        'pre-restore'
      );
    }

    // Restore project metadata if available
    if (version.snapshot.project) {
      const projectUpdates: any = {};

      if (version.snapshot.project.metadata) {
        projectUpdates.metadata = version.snapshot.project.metadata;
      }

      if (version.snapshot.project.tags) {
        projectUpdates.tags = version.snapshot.project.tags;
      }

      if (Object.keys(projectUpdates).length > 0) {
        await projectRepository.update(input.projectId, projectUpdates);
      }
    }

    // Restore pages if requested
    if (input.restorePages !== false && version.snapshot.pages) {
      // Delete existing pages
      await projectPageRepository.deleteByProject(input.projectId);

      // Recreate pages from snapshot
      for (const pageData of version.snapshot.pages) {
        await projectPageRepository.create({
          projectId: input.projectId,
          name: pageData.name,
          pageIndex: pageData.pageIndex,
          canvasData: {},
          layersSnapshot: [],
          width: pageData.width,
          height: pageData.height,
        });
      }
    }

    // Restore canvas data if requested
    if (input.restoreCanvasData !== false && version.canvasData) {
      const pages = await projectPageRepository.findByProject(input.projectId);
      if (pages.length > 0) {
        await projectPageRepository.updateCanvasData(pages[0].id, version.canvasData);
        await projectPageRepository.updateLayersSnapshot(pages[0].id, version.layersSnapshot);
      }
    }

    // Update project last edited
    await projectRepository.update(input.projectId, {}); // repository already touches updatedAt on every call

    logger.info('Version restored successfully', {
      projectId: input.projectId,
      versionId: version.id,
      versionNumber: version.versionNumber,
    });

    return version;
  }

  /**
   * Get version history
   */
  async getVersionHistory(
    projectId: string,
    userId: string,
    workspaceId: string,
    limit: number = 50,
    offset: number = 0
  ): Promise<ProjectVersion[]> {
    const project = await projectRepository.findById(projectId, workspaceId);

    if (!project) {
      throw new Error('Project not found');
    }

    return projectVersionRepository.findByProject(projectId, limit, offset);
  }

  /**
   * Get specific version
   */
  async getVersion(
    projectId: string,
    versionId: string,
    userId: string,
    workspaceId: string
  ): Promise<ProjectVersion> {
    const project = await projectRepository.findById(projectId, workspaceId);

    if (!project) {
      throw new Error('Project not found');
    }

    const version = await projectVersionRepository.findById(versionId, projectId);

    if (!version) {
      throw new Error('Version not found');
    }

    return version;
  }

  /**
   * Get latest version
   */
  async getLatestVersion(projectId: string): Promise<ProjectVersion | null> {
    return projectVersionRepository.findLatest(projectId);
  }

  /**
   * Compare two versions
   */
  async compareVersions(
    projectId: string,
    versionId1: string,
    versionId2: string,
    userId: string,
    workspaceId: string
  ): Promise<VersionComparison> {
    const project = await projectRepository.findById(projectId, workspaceId);

    if (!project) {
      throw new Error('Project not found');
    }

    const version1 = await projectVersionRepository.findById(versionId1, projectId);
    const version2 = await projectVersionRepository.findById(versionId2, projectId);

    if (!version1 || !version2) {
      throw new Error('One or both versions not found');
    }

    const pages1 = version1.snapshot.pages?.length || 0;
    const pages2 = version2.snapshot.pages?.length || 0;

    const canvas1 = {
      w: version1.snapshot.project?.canvasWidth,
      h: version1.snapshot.project?.canvasHeight,
    };
    const canvas2 = {
      w: version2.snapshot.project?.canvasWidth,
      h: version2.snapshot.project?.canvasHeight,
    };

    const meta1 = JSON.stringify(version1.snapshot.project?.metadata || {});
    const meta2 = JSON.stringify(version2.snapshot.project?.metadata || {});

    const layers1 = JSON.stringify(version1.layersSnapshot || []);
    const layers2 = JSON.stringify(version2.layersSnapshot || []);

    return {
      version1,
      version2,
      differences: {
        pageCountDiff: pages2 - pages1,
        canvasSizeChanged: canvas1.w !== canvas2.w || canvas1.h !== canvas2.h,
        metadataChanged: meta1 !== meta2,
        layersChanged: layers1 !== layers2,
      },
    };
  }

  /**
   * Delete a version
   */
  async deleteVersion(
    projectId: string,
    versionId: string,
    userId: string,
    workspaceId: string
  ): Promise<void> {
    logger.info('Deleting version', { projectId, versionId });

    const project = await projectRepository.findById(projectId, workspaceId);

    if (!project) {
      throw new Error('Project not found');
    }

    const version = await projectVersionRepository.findById(versionId, projectId);

    if (!version) {
      throw new Error('Version not found');
    }

    // Check if this is the only version
    const versionCount = await projectVersionRepository.countByProject(projectId);
    if (versionCount <= 1) {
      throw new Error('Cannot delete the only version of a project');
    }

    const result = await projectVersionRepository.delete(versionId);

    if (!result) {
      throw new Error('Failed to delete version');
    }

    logger.info('Version deleted successfully', { versionId });
  }

  /**
   * Delete all versions for a project
   */
  async deleteAllVersions(
    projectId: string,
    userId: string,
    workspaceId: string
  ): Promise<number> {
    logger.warn('Deleting all versions', { projectId, userId });

    const project = await projectRepository.findById(projectId, workspaceId);

    if (!project) {
      throw new Error('Project not found');
    }

    const count = await projectVersionRepository.deleteByProject(projectId);

    logger.warn('All versions deleted', { projectId, count });

    return count;
  }

  /**
   * Get version count
   */
  async getVersionCount(projectId: string): Promise<number> {
    return projectVersionRepository.countByProject(projectId);
  }
}

export const projectVersionService = new ProjectVersionService();