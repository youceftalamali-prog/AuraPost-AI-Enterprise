/**
 * Asset Search Service
 * Business logic for advanced asset search and filtering
 * Phase: 5.3 Part 5
 */

import { assetRepository } from '../repositories/AssetRepository';
import { assetTagRepository } from '../repositories/AssetTagRepository';
import {
  Asset,
  AssetFilters,
  AssetPagination,
  AssetQueryResult,
  AssetType,
} from '../types';
import { PipelineLogger } from '../../core/logger/PipelineLogger';

const logger = new PipelineLogger('AssetSearchService');

export interface SearchQuery {
  workspaceId: string;
  query?: string;
  type?: AssetType | AssetType[];
  status?: string;
  folderId?: string | null;
  collectionId?: string;
  tags?: string[];
  keywords?: string[];
  isFavorite?: boolean;
  isPinned?: boolean;
  projectId?: string;
  userId?: string;
  dateFrom?: string;
  dateTo?: string;
  fileSizeMin?: number;
  fileSizeMax?: number;
  widthMin?: number;
  widthMax?: number;
  heightMin?: number;
  heightMax?: number;
  dominantColor?: string;
  mimeType?: string;
  aiGenerated?: boolean;
  sortBy?: string;
  sortDirection?: 'asc' | 'desc';
  page?: number;
  limit?: number;
}

export interface SearchSuggestion {
  type: 'tag' | 'keyword' | 'color' | 'type' | 'folder';
  value: string;
  count?: number;
}

export interface SearchFacets {
  types: Array<{ type: AssetType; count: number }>;
  tags: Array<{ tag: string; count: number }>;
  colors: Array<{ color: string; count: number }>;
  folders: Array<{ folderId: string; folderName: string; count: number }>;
  dateRanges: Array<{ range: string; count: number }>;
}

export class AssetSearchService {
  /**
   * Search assets with advanced filters
   */
  async search(query: SearchQuery): Promise<AssetQueryResult> {
    logger.debug('Searching assets', {
      workspaceId: query.workspaceId,
      query: query.query,
    });

    const filters: AssetFilters = {
      workspaceId: query.workspaceId,
      type: query.type,
      status: query.status as any,
      folderId: query.folderId,
      collectionId: query.collectionId,
      tags: query.tags,
      keywords: query.keywords,
      isFavorite: query.isFavorite,
      isPinned: query.isPinned,
      projectId: query.projectId,
      userId: query.userId,
      dateFrom: query.dateFrom ? new Date(query.dateFrom) : undefined,
      dateTo: query.dateTo ? new Date(query.dateTo) : undefined,
      fileSizeMin: query.fileSizeMin,
      fileSizeMax: query.fileSizeMax,
      widthMin: query.widthMin,
      widthMax: query.widthMax,
      heightMin: query.heightMin,
      heightMax: query.heightMax,
      dominantColor: query.dominantColor,
      search: query.query,
      mimeType: query.mimeType,
      aiGenerated: query.aiGenerated,
    };

    const pagination: AssetPagination = {
      page: query.page || 1,
      limit: Math.min(query.limit || 20, 100),
      sortBy: (query.sortBy as any) || 'createdAt',
      sortDirection: query.sortDirection || 'desc',
    };

    return assetRepository.findWithFilters(filters, pagination);
  }

  /**
   * Full text search
   */
  async fullTextSearch(
    workspaceId: string,
    searchTerm: string,
    limit: number = 20
  ): Promise<Asset[]> {
    if (!searchTerm || searchTerm.trim().length < 2) {
      return [];
    }

    const filters: AssetFilters = {
      workspaceId,
      search: searchTerm.trim(),
    };

    const pagination: AssetPagination = {
      page: 1,
      limit,
      sortBy: 'createdAt',
      sortDirection: 'desc',
    };

    const result = await assetRepository.findWithFilters(filters, pagination);
    return result.assets;
  }

  /**
   * Search by tags
   */
  async searchByTags(
    workspaceId: string,
    tags: string[],
    limit: number = 20
  ): Promise<Asset[]> {
    if (!tags || tags.length === 0) {
      return [];
    }

    const filters: AssetFilters = {
      workspaceId,
      tags,
    };

    const pagination: AssetPagination = {
      page: 1,
      limit,
      sortBy: 'createdAt',
      sortDirection: 'desc',
    };

    const result = await assetRepository.findWithFilters(filters, pagination);
    return result.assets;
  }

  /**
   * Search by color
   */
  async searchByColor(
    workspaceId: string,
    color: string,
    limit: number = 20
  ): Promise<Asset[]> {
    if (!color) {
      return [];
    }

    const filters: AssetFilters = {
      workspaceId,
      dominantColor: color,
    };

    const pagination: AssetPagination = {
      page: 1,
      limit,
      sortBy: 'createdAt',
      sortDirection: 'desc',
    };

    const result = await assetRepository.findWithFilters(filters, pagination);
    return result.assets;
  }

  /**
   * Search by date range
   */
  async searchByDateRange(
    workspaceId: string,
    dateFrom: Date,
    dateTo: Date,
    limit: number = 20
  ): Promise<Asset[]> {
    const filters: AssetFilters = {
      workspaceId,
      dateFrom,
      dateTo,
    };

    const pagination: AssetPagination = {
      page: 1,
      limit,
      sortBy: 'createdAt',
      sortDirection: 'desc',
    };

    const result = await assetRepository.findWithFilters(filters, pagination);
    return result.assets;
  }

  /**
   * Search by file size range
   */
  async searchByFileSize(
    workspaceId: string,
    minSize: number,
    maxSize: number,
    limit: number = 20
  ): Promise<Asset[]> {
    const filters: AssetFilters = {
      workspaceId,
      fileSizeMin: minSize,
      fileSizeMax: maxSize,
    };

    const pagination: AssetPagination = {
      page: 1,
      limit,
      sortBy: 'fileSize',
      sortDirection: 'desc',
    };

    const result = await assetRepository.findWithFilters(filters, pagination);
    return result.assets;
  }

  /**
   * Search by dimensions
   */
  async searchByDimensions(
    workspaceId: string,
    minWidth?: number,
    maxWidth?: number,
    minHeight?: number,
    maxHeight?: number,
    limit: number = 20
  ): Promise<Asset[]> {
    const filters: AssetFilters = {
      workspaceId,
      widthMin: minWidth,
      widthMax: maxWidth,
      heightMin: minHeight,
      heightMax: maxHeight,
    };

    const pagination: AssetPagination = {
      page: 1,
      limit,
      sortBy: 'createdAt',
      sortDirection: 'desc',
    };

    const result = await assetRepository.findWithFilters(filters, pagination);
    return result.assets;
  }

  /**
   * Get assets by type
   */
  async getByType(
    workspaceId: string,
    type: AssetType,
    limit: number = 20
  ): Promise<Asset[]> {
    const filters: AssetFilters = {
      workspaceId,
      type,
    };

    const pagination: AssetPagination = {
      page: 1,
      limit,
      sortBy: 'createdAt',
      sortDirection: 'desc',
    };

    const result = await assetRepository.findWithFilters(filters, pagination);
    return result.assets;
  }

  /**
   * Get favorite assets
   */
  async getFavorites(workspaceId: string, limit: number = 20): Promise<Asset[]> {
    return assetRepository.findFavorites(workspaceId, limit);
  }

  /**
   * Get pinned assets
   */
  async getPinned(workspaceId: string, limit: number = 20): Promise<Asset[]> {
    return assetRepository.findPinned(workspaceId, limit);
  }

  /**
   * Get recent assets
   */
  async getRecent(workspaceId: string, limit: number = 10): Promise<Asset[]> {
    return assetRepository.findRecent(workspaceId, limit);
  }

  /**
   * Get most used assets
   */
  async getMostUsed(workspaceId: string, limit: number = 10): Promise<Asset[]> {
    return assetRepository.findMostUsed(workspaceId, limit);
  }

  /**
   * Get AI generated assets
   */
  async getAIGenerated(workspaceId: string, limit: number = 20): Promise<Asset[]> {
    return assetRepository.findAIGenerated(workspaceId, limit);
  }

  /**
   * Search suggestions (autocomplete)
   */
  async getSearchSuggestions(
    workspaceId: string,
    prefix: string,
    limit: number = 10
  ): Promise<SearchSuggestion[]> {
    if (!prefix || prefix.length < 2) {
      return [];
    }

    const suggestions: SearchSuggestion[] = [];

    // Tag suggestions
    const tags = await assetTagRepository.search(workspaceId, prefix, limit);
    for (const tag of tags) {
      suggestions.push({
        type: 'tag',
        value: tag.name,
        count: tag.usageCount,
      });
    }

    // Type suggestions
    const types: AssetType[] = ['image', 'video', 'svg', 'audio', 'pdf'];
    for (const type of types) {
      if (type.startsWith(prefix.toLowerCase())) {
        suggestions.push({
          type: 'type',
          value: type,
        });
      }
    }

    return suggestions.slice(0, limit);
  }

  /**
   * Get search facets (for filtering UI)
   */
  async getSearchFacets(workspaceId: string): Promise<SearchFacets> {
    // Get all assets for facet calculation
    const allAssets = await assetRepository.findByWorkspace(workspaceId, 10000);

    // Type facets
    const typeCounts: Record<string, number> = {};
    for (const asset of allAssets) {
      typeCounts[asset.type] = (typeCounts[asset.type] || 0) + 1;
    }

    const types = Object.entries(typeCounts).map(([type, count]) => ({
      type: type as AssetType,
      count,
    }));

    // Tag facets
    const tagCounts: Record<string, number> = {};
    for (const asset of allAssets) {
      for (const tag of asset.tags) {
        tagCounts[tag] = (tagCounts[tag] || 0) + 1;
      }
    }

    const tags = Object.entries(tagCounts)
      .map(([tag, count]) => ({ tag, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 20);

    // Color facets
    const colorCounts: Record<string, number> = {};
    for (const asset of allAssets) {
      if (asset.dominantColor) {
        colorCounts[asset.dominantColor] = (colorCounts[asset.dominantColor] || 0) + 1;
      }
    }

    const colors = Object.entries(colorCounts)
      .map(([color, count]) => ({ color, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);

    // Folder facets (simplified)
    const folderCounts: Record<string, number> = {};
    for (const asset of allAssets) {
      if (asset.folderId) {
        folderCounts[asset.folderId] = (folderCounts[asset.folderId] || 0) + 1;
      }
    }

    const folders = Object.entries(folderCounts)
      .map(([folderId, count]) => ({
        folderId,
        folderName: folderId, // Would need to fetch folder name
        count,
      }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);

    // Date range facets
    const now = new Date();
    const dateRanges = [
      { range: 'today', days: 1 },
      { range: 'this_week', days: 7 },
      { range: 'this_month', days: 30 },
      { range: 'this_year', days: 365 },
    ];

    const dateRangeCounts = dateRanges.map(({ range, days }) => {
      const fromDate = new Date(now.getTime() - days * 24 * 60 * 60 * 1000);
      const count = allAssets.filter(a => new Date(a.createdAt) >= fromDate).length;
      return { range, count };
    });

    return {
      types,
      tags,
      colors,
      folders,
      dateRanges: dateRangeCounts,
    };
  }

  /**
   * Find similar assets (by color, type, size)
   */
  async findSimilarAssets(
    assetId: string,
    workspaceId: string,
    limit: number = 10
  ): Promise<Asset[]> {
    const asset = await assetRepository.findById(assetId, workspaceId);

    if (!asset) {
      throw new Error('Asset not found');
    }

    // Build similarity query
    const filters: AssetFilters = {
      workspaceId,
      type: asset.type,
    };

    // Add color similarity if available
    if (asset.dominantColor) {
      filters.dominantColor = asset.dominantColor;
    }

    // Add size similarity (±20%)
    const sizeTolerance = asset.fileSize * 0.2;
    filters.fileSizeMin = Math.max(0, asset.fileSize - sizeTolerance);
    filters.fileSizeMax = asset.fileSize + sizeTolerance;

    const pagination: AssetPagination = {
      page: 1,
      limit: limit + 1, // +1 to exclude the original asset
      sortBy: 'createdAt',
      sortDirection: 'desc',
    };

    const result = await assetRepository.findWithFilters(filters, pagination);

    // Exclude the original asset
    return result.assets.filter(a => a.id !== assetId).slice(0, limit);
  }

  /**
   * Get asset count by type
   */
  async getCountByType(workspaceId: string): Promise<Record<AssetType, number>> {
    const allAssets = await assetRepository.findByWorkspace(workspaceId, 10000);

    const counts: Record<string, number> = {};
    for (const asset of allAssets) {
      counts[asset.type] = (counts[asset.type] || 0) + 1;
    }

    return counts as Record<AssetType, number>;
  }
}

export const assetSearchService = new AssetSearchService();