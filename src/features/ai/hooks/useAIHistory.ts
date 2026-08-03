/**
 * useAIHistory Hook
 * Hook for managing AI operation history
 * Phase: 5.4 Part 4
 */

import { useState, useEffect, useCallback } from 'react';
import { aiHistoryManager, HistorySearchFilters, HistorySortOptions } from '../history/AIHistoryManager';
import { AIHistoryEntryExtended, HistoryStatistics } from '../history/AIHistoryManager';

export interface UseAIHistoryOptions {
  userId: string;
  workspaceId: string;
  autoRefresh?: boolean;
  refreshIntervalMs?: number;
}

export interface UseAIHistoryReturn {
  // State
  entries: AIHistoryEntryExtended[];
  statistics: HistoryStatistics | null;
  isLoading: boolean;
  error: any | null;
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
  
  // Actions
  search: (filters?: HistorySearchFilters, sort?: HistorySortOptions, page?: number) => Promise<void>;
  refresh: () => Promise<void>;
  toggleFavorite: (entryId: string) => boolean;
  addNote: (entryId: string, note: string) => boolean;
  addTags: (entryId: string, tags: string[]) => boolean;
  removeTags: (entryId: string, tags: string[]) => boolean;
  deleteEntry: (entryId: string) => boolean;
  deleteEntries: (entryIds: string[]) => any;
  rerunEntry: (entryId: string) => Promise<any>;
  exportHistory: (options?: any) => Promise<string | Blob>;
  importHistory: (json: string) => Promise<any>;
  getRelatedEntries: (entryId: string, limit?: number) => AIHistoryEntryExtended[];
  
  // Utilities
  getEntry: (entryId: string) => AIHistoryEntryExtended | null;
  getFavoriteEntries: () => AIHistoryEntryExtended[];
  getAllTags: () => string[];
  clearHistory: () => void;
}

export function useAIHistory(options: UseAIHistoryOptions): UseAIHistoryReturn {
  const [entries, setEntries] = useState<AIHistoryEntryExtended[]>([]);
  const [statistics, setStatistics] = useState<HistoryStatistics | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<any | null>(null);
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 20,
    total: 0,
    totalPages: 0,
  });
  const [currentFilters, setCurrentFilters] = useState<HistorySearchFilters>({});
  const [currentSort, setCurrentSort] = useState<HistorySortOptions>({
    field: 'createdAt',
    direction: 'desc',
  });

  const search = useCallback(async (
    filters: HistorySearchFilters = {},
    sort: HistorySortOptions = { field: 'createdAt', direction: 'desc' },
    page: number = 1
  ) => {
    setIsLoading(true);
    setError(null);

    try {
      const result = aiHistoryManager.search(
        {
          userId: options.userId,
          workspaceId: options.workspaceId,
          ...filters,
        },
        sort,
        { page, limit: pagination.limit }
      );

      setEntries(result.entries);
      setPagination(result.pagination);
      setCurrentFilters(filters);
      setCurrentSort(sort);
    } catch (err) {
      setError(err);
    } finally {
      setIsLoading(false);
    }
  }, [options.userId, options.workspaceId, pagination.limit]);

  const refresh = useCallback(async () => {
    await search(currentFilters, currentSort, pagination.page);
    
    const stats = aiHistoryManager.getStatistics(options.userId, options.workspaceId);
    setStatistics(stats);
  }, [search, currentFilters, currentSort, pagination.page, options.userId, options.workspaceId]);

  useEffect(() => {
    refresh();

    if (options.autoRefresh !== false) {
      const interval = setInterval(refresh, options.refreshIntervalMs || 60000);
      return () => clearInterval(interval);
    }
  }, [refresh, options.autoRefresh, options.refreshIntervalMs]);

  const toggleFavorite = useCallback((entryId: string) => {
    const result = aiHistoryManager.toggleFavorite(entryId);
    if (result) {
      refresh();
    }
    return result;
  }, [refresh]);

  const addNote = useCallback((entryId: string, note: string) => {
    const result = aiHistoryManager.addNote(entryId, note);
    if (result) {
      refresh();
    }
    return result;
  }, [refresh]);

  const addTags = useCallback((entryId: string, tags: string[]) => {
    const result = aiHistoryManager.addTags(entryId, tags);
    if (result) {
      refresh();
    }
    return result;
  }, [refresh]);

  const removeTags = useCallback((entryId: string, tags: string[]) => {
    const result = aiHistoryManager.removeTags(entryId, tags);
    if (result) {
      refresh();
    }
    return result;
  }, [refresh]);

  const deleteEntry = useCallback((entryId: string) => {
    const result = aiHistoryManager.deleteEntry(entryId);
    if (result) {
      refresh();
    }
    return result;
  }, [refresh]);

  const deleteEntries = useCallback((entryIds: string[]) => {
    const result = aiHistoryManager.deleteEntries(entryIds);
    if (result.success) {
      refresh();
    }
    return result;
  }, [refresh]);

  const rerunEntry = useCallback(async (entryId: string) => {
    return aiHistoryManager.rerunEntry(entryId, { entryId });
  }, []);

  const exportHistory = useCallback(async (exportOptions?: any) => {
    return aiHistoryManager.exportHistory({
      format: 'json',
      ...exportOptions,
    });
  }, []);

  const importHistory = useCallback(async (json: string) => {
    const result = await aiHistoryManager.importHistory(json);
    if (result.success) {
      refresh();
    }
    return result;
  }, [refresh]);

  const getRelatedEntries = useCallback((entryId: string, limit: number = 5) => {
    return aiHistoryManager.getRelatedEntries(entryId, limit);
  }, []);

  const getEntry = useCallback((entryId: string) => {
    return aiHistoryManager.getEntry(entryId);
  }, []);

  const getFavoriteEntries = useCallback(() => {
    return aiHistoryManager.getFavoriteEntries(options.userId, options.workspaceId);
  }, [options.userId, options.workspaceId]);

  const getAllTags = useCallback(() => {
    return aiHistoryManager.getAllTags(options.userId, options.workspaceId);
  }, [options.userId, options.workspaceId]);

  const clearHistory = useCallback(() => {
    aiHistoryManager.clearAll();
    refresh();
  }, [refresh]);

  return {
    entries,
    statistics,
    isLoading,
    error,
    pagination,
    search,
    refresh,
    toggleFavorite,
    addNote,
    addTags,
    removeTags,
    deleteEntry,
    deleteEntries,
    rerunEntry,
    exportHistory,
    importHistory,
    getRelatedEntries,
    getEntry,
    getFavoriteEntries,
    getAllTags,
    clearHistory,
  };
}