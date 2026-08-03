/**
 * Project Page Service
 * Business logic for project page management
 * Phase: 5.3 Part 5
 */

import { projectRepository } from '../repositories/ProjectRepository';
import { projectPageRepository } from '../repositories/ProjectPageRepository';
import { projectVersionRepository } from '../repositories/ProjectVersionRepository';
import { ProjectPage, ProjectPageInsert, ProjectPageUpdate } from '../types';
import { PipelineLogger } from '../../core/logger/PipelineLogger';

const logger = new PipelineLogger('ProjectPageService');

export class ProjectPageService {
  /**
   * Create a new page in a project
   */
  async createPage(
    projectId: string,
    userId: string,
    workspaceId: string,
    data: {
      name?: string;
      canvasData?: Record<string, any>;
      layersSnapshot?: any[];
      width?: number;
      height?: number;
    }
  ): Promise<ProjectPage> {
    logger.info('Creating page', { projectId, userId });

    const project = await projectRepository.findById(projectId, workspaceId);

    if (!project) {
      throw new Error('Project not found');
    }

    if (project.isLocked) {
      throw new Error('Project is locked');
    }

    if (project.isTrashed) {
      throw new Error('Cannot add pages to a trashed project');
    }

    // Check page limit
    const pageCount = await projectPageRepository.countByProject(projectId);
    if (pageCount >= 100) {
      throw new Error('Project page limit reached (max 100 pages)');
    }

    // Get next page index
    const nextPageIndex = await projectPageRepository.getNextPageIndex(projectId);

    const pageData: ProjectPageInsert = {
      projectId,
      name: data.name || `Page ${nextPageIndex + 1}`,
      pageIndex: nextPageIndex,
      canvasData: data.canvasData || {
        width: project.canvasWidth,
        height: project.canvasHeight,
        backgroundColor: '#ffffff',
      },
      layersSnapshot: data.layersSnapshot || [],
      width: data.width || project.canvasWidth,
      height: data.height || project.canvasHeight,
    };

    const page = await projectPageRepository.create(pageData);

    // Update project last edited
    await projectRepository.update(projectId, {}); // repository already touches updatedAt on every call

    logger.info('Page created successfully', {
      projectId,
      pageId: page.id,
      pageIndex: page.pageIndex,
    });

    return page;
  }

  /**
   * Get page by ID
   */
  async getPage(
    pageId: string,
    projectId: string,
    userId: string,
    workspaceId: string
  ): Promise<ProjectPage> {
    const project = await projectRepository.findById(projectId, workspaceId);

    if (!project) {
      throw new Error('Project not found');
    }

    const page = await projectPageRepository.findById(pageId, projectId);

    if (!page) {
      throw new Error('Page not found');
    }

    return page;
  }

  /**
   * Get all pages for a project
   */
  async getProjectPages(
    projectId: string,
    userId: string,
    workspaceId: string
  ): Promise<ProjectPage[]> {
    const project = await projectRepository.findById(projectId, workspaceId);

    if (!project) {
      throw new Error('Project not found');
    }

    return projectPageRepository.findByProject(projectId);
  }

  /**
   * Update page
   */
  async updatePage(
    pageId: string,
    projectId: string,
    userId: string,
    workspaceId: string,
    data: ProjectPageUpdate
  ): Promise<ProjectPage> {
    logger.info('Updating page', { pageId, projectId });

    const project = await projectRepository.findById(projectId, workspaceId);

    if (!project) {
      throw new Error('Project not found');
    }

    if (project.isLocked) {
      throw new Error('Project is locked');
    }

    if (project.isTrashed) {
      throw new Error('Cannot edit pages in a trashed project');
    }

    const page = await projectPageRepository.findById(pageId, projectId);

    if (!page) {
      throw new Error('Page not found');
    }

    // Validate dimensions if provided
    if (data.width !== undefined) {
      if (data.width < 100 || data.width > 8000) {
        throw new Error('Page width must be between 100 and 8000 pixels');
      }
    }

    if (data.height !== undefined) {
      if (data.height < 100 || data.height > 8000) {
        throw new Error('Page height must be between 100 and 8000 pixels');
      }
    }

    const updated = await projectPageRepository.update(pageId, data);

    if (!updated) {
      throw new Error('Failed to update page');
    }

    // Update project last edited
    await projectRepository.update(projectId, {}); // repository already touches updatedAt on every call

    logger.info('Page updated successfully', { pageId });

    return updated;
  }

  /**
   * Save canvas data for a page
   */
  async saveCanvasData(
    pageId: string,
    projectId: string,
    userId: string,
    workspaceId: string,
    canvasData: Record<string, any>
  ): Promise<void> {
    logger.debug('Saving canvas data', { pageId, projectId });

    const project = await projectRepository.findById(projectId, workspaceId);

    if (!project) {
      throw new Error('Project not found');
    }

    if (project.isLocked) {
      throw new Error('Project is locked');
    }

    await projectPageRepository.updateCanvasData(pageId, canvasData);
    await projectRepository.update(projectId, {}); // repository already touches updatedAt on every call
  }

  /**
   * Save layers snapshot for a page
   */
  async saveLayersSnapshot(
    pageId: string,
    projectId: string,
    userId: string,
    workspaceId: string,
    layersSnapshot: any[]
  ): Promise<void> {
    logger.debug('Saving layers snapshot', { pageId, projectId });

    const project = await projectRepository.findById(projectId, workspaceId);

    if (!project) {
      throw new Error('Project not found');
    }

    if (project.isLocked) {
      throw new Error('Project is locked');
    }

    await projectPageRepository.updateLayersSnapshot(pageId, layersSnapshot);
    await projectRepository.update(projectId, {}); // repository already touches updatedAt on every call
  }

  /**
   * Update page thumbnail
   */
  async updatePageThumbnail(
    pageId: string,
    projectId: string,
    userId: string,
    workspaceId: string,
    thumbnailUrl: string
  ): Promise<void> {
    await projectPageRepository.updateThumbnail(pageId, thumbnailUrl);
  }

  /**
   * Delete page
   */
  async deletePage(
    pageId: string,
    projectId: string,
    userId: string,
    workspaceId: string
  ): Promise<void> {
    logger.info('Deleting page', { pageId, projectId });

    const project = await projectRepository.findById(projectId, workspaceId);

    if (!project) {
      throw new Error('Project not found');
    }

    if (project.isLocked) {
      throw new Error('Project is locked');
    }

    // Check if this is the last page
    const pageCount = await projectPageRepository.countByProject(projectId);
    if (pageCount <= 1) {
      throw new Error('Cannot delete the last page of a project');
    }

    const result = await projectPageRepository.softDelete(pageId);

    if (!result) {
      throw new Error('Failed to delete page');
    }

    // Update project last edited
    await projectRepository.update(projectId, {}); // repository already touches updatedAt on every call

    logger.info('Page deleted successfully', { pageId });
  }

  /**
   * Duplicate page
   */
  async duplicatePage(
    pageId: string,
    projectId: string,
    userId: string,
    workspaceId: string
  ): Promise<ProjectPage> {
    logger.info('Duplicating page', { pageId, projectId });

    const project = await projectRepository.findById(projectId, workspaceId);

    if (!project) {
      throw new Error('Project not found');
    }

    if (project.isLocked) {
      throw new Error('Project is locked');
    }

    const duplicated = await projectPageRepository.duplicate(pageId);

    if (!duplicated) {
      throw new Error('Failed to duplicate page');
    }

    // Update project last edited
    await projectRepository.update(projectId, {}); // repository already touches updatedAt on every call

    logger.info('Page duplicated successfully', {
      originalPageId: pageId,
      newPageId: duplicated.id,
    });

    return duplicated;
  }

  /**
   * Reorder pages
   */
  async reorderPages(
    projectId: string,
    userId: string,
    workspaceId: string,
    pageIds: string[]
  ): Promise<void> {
    logger.info('Reordering pages', { projectId, pageCount: pageIds.length });

    const project = await projectRepository.findById(projectId, workspaceId);

    if (!project) {
      throw new Error('Project not found');
    }

    if (project.isLocked) {
      throw new Error('Project is locked');
    }

    // Verify all pages belong to project
    const existingPages = await projectPageRepository.findByProject(projectId);
    const existingIds = new Set(existingPages.map(p => p.id));

    for (const pageId of pageIds) {
      if (!existingIds.has(pageId)) {
        throw new Error(`Page ${pageId} does not belong to project ${projectId}`);
      }
    }

    if (pageIds.length !== existingPages.length) {
      throw new Error('Page IDs count must match existing pages count');
    }

    await projectPageRepository.reorderPages(projectId, pageIds);

    // Update project last edited
    await projectRepository.update(projectId, {}); // repository already touches updatedAt on every call

    logger.info('Pages reordered successfully', { projectId });
  }

  /**
   * Get page count for project
   */
  async getPageCount(projectId: string): Promise<number> {
    return projectPageRepository.countByProject(projectId);
  }
}

export const projectPageService = new ProjectPageService();