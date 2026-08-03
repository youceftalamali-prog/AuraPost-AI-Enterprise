/**
 * Project Search Service
 * Business logic for project search and filtering
 * Phase: 5.3 Part 5
 */

import { projectRepository } from '../repositories/ProjectRepository';
import { Project, ProjectFilters, ProjectPagination, ProjectQueryResult } from '../types';
import { PipelineLogger } from '../../core/logger/PipelineLogger';

const logger = new PipelineLogger('ProjectSearchService');

export interface SearchQuery {
  workspaceId: string;
  query?: string;
  status?: string;
  visibility?: string;
  type?: string;
  isFavorite?: boolean;
  isArchived?: boolean;
  isTrashed?: boolean;
  isPublished?: boolean;
  tags?: string[];
  userId?: string;
  dateFrom?: string;
  dateTo?: string;
  sortBy?: string;
  sortDirection?: 'asc' | 'desc';
  page?: number;
  limit?: number;
}

export class ProjectSearchService {
  /**
   * Search projects with advanced filters
   */
  async search(query: SearchQuery): Promise<ProjectQueryResult> {
    logger.debug('Searching projects', {
      workspaceId: query.workspaceId,
      query: query.query,
    });

    const filters: ProjectFilters = {
      workspaceId: query.workspaceId,
      search: query.query,
      status: query.status as any,
      visibility: query.visibility as any,
      type: query.type as any,
      isFavorite: query.isFavorite,
      isArchived: query.isArchived,
      isTrashed: query.isTrashed,
      isPublished: query.isPublished,
      tags: query.tags,
      userId: query.userId,
      dateFrom: query.dateFrom ? new Date(query.dateFrom) : undefined,
      dateTo: query.dateTo ? new Date(query.dateTo) : undefined,
    };

    const pagination: ProjectPagination = {
      page: query.page || 1,
      limit: Math.min(query.limit || 20, 100),
      sortBy: (query.sortBy as any) || 'updatedAt',
      sortDirection: query.sortDirection || 'desc',
    };

    return projectRepository.findWithFilters(filters, pagination);
  }

  /**
   * Full text search
   */
  async fullTextSearch(
    workspaceId: string,
    searchTerm: string,
    limit: number = 20
  ): Promise<Project[]> {
    if (!searchTerm || searchTerm.trim().length < 2) {
      return [];
    }

    const filters: ProjectFilters = {
      workspaceId,
      search: searchTerm.trim(),
      isTrashed: false,
    };

    const pagination: ProjectPagination = {
      page: 1,
      limit,
      sortBy: 'updatedAt',
      sortDirection: 'desc',
    };

    const result = await projectRepository.findWithFilters(filters, pagination);
    return result.projects;
  }

  /**
   * Search by tags
   */
  async searchByTags(
    workspaceId: string,
    tags: string[],
    limit: number = 20
  ): Promise<Project[]> {
    if (!tags || tags.length === 0) {
      return [];
    }

    const filters: ProjectFilters = {
      workspaceId,
      tags,
      isTrashed: false,
    };

    const pagination: ProjectPagination = {
      page: 1,
      limit,
      sortBy: 'updatedAt',
      sortDirection: 'desc',
    };

    const result = await projectRepository.findWithFilters(filters, pagination);
    return result.projects;
  }

  /**
   * Search by date range
   */
  async searchByDateRange(
    workspaceId: string,
    dateFrom: Date,
    dateTo: Date,
    limit: number = 20
  ): Promise<Project[]> {
    const filters: ProjectFilters = {
      workspaceId,
      dateFrom,
      dateTo,
      isTrashed: false,
    };

    const pagination: ProjectPagination = {
      page: 1,
      limit,
      sortBy: 'createdAt',
      sortDirection: 'desc',
    };

    const result = await projectRepository.findWithFilters(filters, pagination);
    return result.projects;
  }

  /**
   * Get projects by status
   */
  async getByStatus(
    workspaceId: string,
    status: string,
    limit: number = 20
  ): Promise<Project[]> {
    const filters: ProjectFilters = {
      workspaceId,
      status: status as any,
      isTrashed: false,
    };

    const pagination: ProjectPagination = {
      page: 1,
      limit,
      sortBy: 'updatedAt',
      sortDirection: 'desc',
    };

    const result = await projectRepository.findWithFilters(filters, pagination);
    return result.projects;
  }

  /**
   * Get favorite projects
   */
  async getFavorites(workspaceId: string, userId: string): Promise<Project[]> {
    return projectRepository.findFavorites(workspaceId, userId);
  }

  /**
   * Get recent projects
   */
  async getRecent(
    workspaceId: string,
    userId: string,
    limit: number = 10
  ): Promise<Project[]> {
    return projectRepository.findRecent(workspaceId, userId, limit);
  }

  /**
   * Get archived projects
   */
  async getArchived(workspaceId: string): Promise<Project[]> {
    return projectRepository.findArchived(workspaceId);
  }

  /**
   * Get trashed projects
   */
  async getTrash(workspaceId: string): Promise<Project[]> {
    return projectRepository.findTrashed(workspaceId);
  }

  /**
   * Get published projects
   */
  async getPublished(workspaceId: string, limit: number = 20): Promise<Project[]> {
    const filters: ProjectFilters = {
      workspaceId,
      isPublished: true,
      isTrashed: false,
    };

    const pagination: ProjectPagination = {
      page: 1,
      limit,
      sortBy: 'updatedAt',
      sortDirection: 'desc',
    };

    const result = await projectRepository.findWithFilters(filters, pagination);
    return result.projects;
  }

  /**
   * Get projects by user
   */
  async getByUser(
    workspaceId: string,
    userId: string,
    limit: number = 20
  ): Promise<Project[]> {
    return projectRepository.findByUser(userId, workspaceId, limit);
  }
}

export const projectSearchService = new ProjectSearchService();