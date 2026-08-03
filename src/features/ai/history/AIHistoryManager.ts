/**
 * AI History Manager
 * Manages AI operation history with search, filtering, and analytics
 * Supports: History storage, Search, Filtering, Statistics, Export/Import,
 *           Cleanup, Favorites, Notes, Re-run operations, Batch operations
 * Phase: 5.4 Part 4
 */

import {
  AIHistoryEntry,
  AIRequest,
  AIResponse,
  AIInput,
  AIOutput,
  AIProviderType,
  AIResponseStatus,
} from '../providers/types';

export interface HistorySearchFilters {
  userId?: string;
  workspaceId?: string;
  projectId?: string;
  layerId?: string;
  action?: string | string[];
  provider?: AIProviderType | AIProviderType[];
  modelId?: string;
  status?: AIResponseStatus | AIResponseStatus[];
  dateFrom?: number;
  dateTo?: number;
  minCreditsUsed?: number;
  maxCreditsUsed?: number;
  minProcessingTimeMs?: number;
  maxProcessingTimeMs?: number;
  hasOutput?: boolean;
  isFavorite?: boolean;
  hasNotes?: boolean;
  tags?: string[];
  searchText?: string;
}

export interface HistorySortOptions {
  field: 'createdAt' | 'completedAt' | 'processingTimeMs' | 'creditsUsed' | 'action';
  direction: 'asc' | 'desc';
}

export interface HistoryPagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export interface HistoryQueryResult {
  entries: AIHistoryEntryExtended[];
  pagination: HistoryPagination;
  filters: HistorySearchFilters;
  sort: HistorySortOptions;
}

export interface AIHistoryEntryExtended extends AIHistoryEntry {
  isFavorite: boolean;
  notes?: string;
  tags: string[];
  thumbnailUrl?: string;
  rerunCount: number;
  lastRerunAt?: number;
  relatedEntries?: string[];
}

export interface HistoryStatistics {
  totalEntries: number;
  totalCreditsUsed: number;
  totalProcessingTimeMs: number;
  averageProcessingTimeMs: number;
  successRate: number;
  entriesByAction: Record<string, number>;
  entriesByProvider: Record<string, number>;
  entriesByStatus: Record<string, number>;
  entriesByDay: Array<{ date: string; count: number; credits: number }>;
  topActions: Array<{ action: string; count: number; credits: number }>;
  topModels: Array<{ modelId: string; count: number; credits: number }>;
  usageTrend: Array<{ date: string; credits: number; count: number }>;
}

export interface HistoryExportOptions {
  format: 'json' | 'csv';
  includeOutput?: boolean;
  includeInput?: boolean;
  includeMetadata?: boolean;
  dateRange?: { from: number; to: number };
  filters?: HistorySearchFilters;
  limit?: number;
}

export interface HistoryImportResult {
  success: boolean;
  imported: number;
  skipped: number;
  errors: Array<{ index: number; error: string }>;
}

export interface HistoryConfig {
  maxEntriesPerUser: number;
  maxEntriesPerWorkspace: number;
  retentionDays: number;
  enableFavorites: boolean;
  enableNotes: boolean;
  enableTags: boolean;
  enableThumbnails: boolean;
  enableRerunTracking: boolean;
  enableSearch: boolean;
  enableStatistics: boolean;
  autoCleanup: boolean;
  cleanupIntervalMs: number;
  storageKey: string;
  enablePersistence: boolean;
}

export interface RerunOptions {
  entryId: string;
  modifyInput?: (input: AIInput) => AIInput;
  modifyParameters?: (params: Record<string, any>) => Record<string, any>;
  reuseSettings?: boolean;
}

export interface BatchOperationResult {
  success: boolean;
  processed: number;
  failed: number;
  errors: Array<{ entryId: string; error: string }>;
}

export class AIHistoryManager {
  private entries: Map<string, AIHistoryEntryExtended> = new Map();
  private userIndex: Map<string, Set<string>> = new Map();
  private workspaceIndex: Map<string, Set<string>> = new Map();
  private projectIndex: Map<string, Set<string>> = new Map();
  private actionIndex: Map<string, Set<string>> = new Map();
  private providerIndex: Map<string, Set<string>> = new Map();
  private tagIndex: Map<string, Set<string>> = new Map();
  private favoriteEntries: Set<string> = new Set();
  private config: HistoryConfig;
  private listeners: Map<string, Set<(...args: any[]) => void>> = new Map();
  private cleanupTimer: ReturnType<typeof setInterval> | null = null;
  private statisticsCache: Map<string, { stats: HistoryStatistics; timestamp: number }> = new Map();

  constructor(config: Partial<HistoryConfig> = {}) {
    this.config = {
      maxEntriesPerUser: config.maxEntriesPerUser || 10000,
      maxEntriesPerWorkspace: config.maxEntriesPerWorkspace || 50000,
      retentionDays: config.retentionDays || 90,
      enableFavorites: config.enableFavorites !== false,
      enableNotes: config.enableNotes !== false,
      enableTags: config.enableTags !== false,
      enableThumbnails: config.enableThumbnails !== false,
      enableRerunTracking: config.enableRerunTracking !== false,
      enableSearch: config.enableSearch !== false,
      enableStatistics: config.enableStatistics !== false,
      autoCleanup: config.autoCleanup || false,
      cleanupIntervalMs: config.cleanupIntervalMs || 24 * 60 * 60 * 1000,
      storageKey: config.storageKey || 'ai_history',
      enablePersistence: config.enablePersistence || false,
    };

    if (this.config.enablePersistence) {
      this.loadFromStorage();
    }

    if (this.config.autoCleanup) {
      this.startCleanupTimer();
    }
  }

  /**
   * Record a new history entry
   */
  async recordEntry(
    request: AIRequest,
    response: AIResponse,
    metadata?: Record<string, any>
  ): Promise<AIHistoryEntryExtended> {
    const entry: AIHistoryEntryExtended = {
      id: `hist_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`,
      userId: request.userId,
      workspaceId: request.workspaceId,
      projectId: request.projectId,
      layerId: metadata?.layerId,
      action: request.action,
      provider: request.provider,
      modelId: request.modelId,
      input: this.sanitizeInput(request.input),
      output: response.output,
      status: response.status,
      creditsUsed: response.creditsUsed,
      processingTimeMs: response.processingTimeMs,
      createdAt: request.createdAt,
      completedAt: response.completedAt,
      metadata: {
        ...metadata,
        requestId: request.id,
        responseId: response.id,
      },
      isFavorite: false,
      tags: [],
      rerunCount: 0,
    };

    // Store entry
    this.entries.set(entry.id, entry);

    // Update indexes
    this.updateIndexes(entry);

    // Persist if enabled
    if (this.config.enablePersistence) {
      this.saveToStorage();
    }

    // Invalidate statistics cache
    this.invalidateStatisticsCache(entry.userId, entry.workspaceId);

    // Emit event
    this.emit('entryRecorded', entry);

    // Check if cleanup needed
    this.checkCleanupNeeded(entry.userId, entry.workspaceId);

    return entry;
  }

  /**
   * Get entry by ID
   */
  getEntry(entryId: string): AIHistoryEntryExtended | null {
    return this.entries.get(entryId) || null;
  }

  /**
   * Search history entries
   */
  search(
    filters: HistorySearchFilters = {},
    sort: HistorySortOptions = { field: 'createdAt', direction: 'desc' },
    pagination: { page: number; limit: number } = { page: 1, limit: 20 }
  ): HistoryQueryResult {
    if (!this.config.enableSearch) {
      return {
        entries: [],
        pagination: { page: 1, limit: 20, total: 0, totalPages: 0 },
        filters,
        sort,
      };
    }

    // Get candidate entries
    let candidates = this.getCandidateEntries(filters);

    // Apply filters
    candidates = this.applyFilters(candidates, filters);

    // Sort
    candidates = this.sortEntries(candidates, sort);

    // Calculate pagination
    const total = candidates.length;
    const totalPages = Math.ceil(total / pagination.limit);
    const offset = (pagination.page - 1) * pagination.limit;
    const paginatedEntries = candidates.slice(offset, offset + pagination.limit);

    return {
      entries: paginatedEntries,
      pagination: {
        page: pagination.page,
        limit: pagination.limit,
        total,
        totalPages,
      },
      filters,
      sort,
    };
  }

  /**
   * Get candidate entries based on indexed filters
   */
  private getCandidateEntries(filters: HistorySearchFilters): AIHistoryEntryExtended[] {
    let candidateIds: Set<string> | null = null;

    // Use indexes for fast filtering
    if (filters.userId) {
      const userIds = this.userIndex.get(filters.userId);
      if (userIds) {
        candidateIds = candidateIds ? this.intersectSets(candidateIds, userIds) : new Set(userIds);
      } else {
        return [];
      }
    }

    if (filters.workspaceId) {
      const workspaceIds = this.workspaceIndex.get(filters.workspaceId);
      if (workspaceIds) {
        candidateIds = candidateIds ? this.intersectSets(candidateIds, workspaceIds) : new Set(workspaceIds);
      } else {
        return [];
      }
    }

    if (filters.projectId) {
      const projectIds = this.projectIndex.get(filters.projectId);
      if (projectIds) {
        candidateIds = candidateIds ? this.intersectSets(candidateIds, projectIds) : new Set(projectIds);
      } else {
        return [];
      }
    }

    if (filters.action) {
      const actions = Array.isArray(filters.action) ? filters.action : [filters.action];
      let actionIds: Set<string> = new Set();
      for (const action of actions) {
        const ids = this.actionIndex.get(action);
        if (ids) {
          actionIds = new Set([...actionIds, ...ids]);
        }
      }
      candidateIds = candidateIds ? this.intersectSets(candidateIds, actionIds) : actionIds;
    }

    if (filters.provider) {
      const providers = Array.isArray(filters.provider) ? filters.provider : [filters.provider];
      let providerIds: Set<string> = new Set();
      for (const provider of providers) {
        const ids = this.providerIndex.get(provider);
        if (ids) {
          providerIds = new Set([...providerIds, ...ids]);
        }
      }
      candidateIds = candidateIds ? this.intersectSets(candidateIds, providerIds) : providerIds;
    }

    if (filters.isFavorite) {
      candidateIds = candidateIds ? this.intersectSets(candidateIds, this.favoriteEntries) : new Set(this.favoriteEntries);
    }

    if (filters.tags && filters.tags.length > 0) {
      let tagIds: Set<string> = new Set();
      for (const tag of filters.tags) {
        const ids = this.tagIndex.get(tag);
        if (ids) {
          tagIds = new Set([...tagIds, ...ids]);
        }
      }
      candidateIds = candidateIds ? this.intersectSets(candidateIds, tagIds) : tagIds;
    }

    // Convert to entries
    if (candidateIds) {
      return Array.from(candidateIds)
        .map(id => this.entries.get(id))
        .filter((entry): entry is AIHistoryEntryExtended => entry !== undefined);
    }

    // Return all entries if no indexed filters
    return Array.from(this.entries.values());
  }

  /**
   * Apply non-indexed filters
   */
  private applyFilters(
    entries: AIHistoryEntryExtended[],
    filters: HistorySearchFilters
  ): AIHistoryEntryExtended[] {
    return entries.filter(entry => {
      // Date range
      if (filters.dateFrom && entry.createdAt < filters.dateFrom) return false;
      if (filters.dateTo && entry.createdAt > filters.dateTo) return false;

      // Credits range
      if (filters.minCreditsUsed !== undefined && entry.creditsUsed < filters.minCreditsUsed) return false;
      if (filters.maxCreditsUsed !== undefined && entry.creditsUsed > filters.maxCreditsUsed) return false;

      // Processing time range
      if (filters.minProcessingTimeMs !== undefined && entry.processingTimeMs < filters.minProcessingTimeMs) return false;
      if (filters.maxProcessingTimeMs !== undefined && entry.processingTimeMs > filters.maxProcessingTimeMs) return false;

      // Status filter
      if (filters.status) {
        const statuses = Array.isArray(filters.status) ? filters.status : [filters.status];
        if (!statuses.includes(entry.status)) return false;
      }

      // Layer ID
      if (filters.layerId && entry.layerId !== filters.layerId) return false;

      // Model ID
      if (filters.modelId && entry.modelId !== filters.modelId) return false;

      // Has output
      if (filters.hasOutput !== undefined) {
        const hasOutput = entry.output !== undefined && entry.output !== null;
        if (filters.hasOutput !== hasOutput) return false;
      }

      // Has notes
      if (filters.hasNotes !== undefined) {
        const hasNotes = entry.notes !== undefined && entry.notes !== '';
        if (filters.hasNotes !== hasNotes) return false;
      }

      // Search text
      if (filters.searchText) {
        const searchLower = filters.searchText.toLowerCase();
        const searchableText = [
          entry.action,
          entry.provider,
          entry.modelId,
          entry.notes || '',
          entry.input?.text || '',
          ...entry.tags,
        ].join(' ').toLowerCase();

        if (!searchableText.includes(searchLower)) return false;
      }

      return true;
    });
  }

  /**
   * Sort entries
   */
  private sortEntries(
    entries: AIHistoryEntryExtended[],
    sort: HistorySortOptions
  ): AIHistoryEntryExtended[] {
    return [...entries].sort((a, b) => {
      let aValue: any;
      let bValue: any;

      switch (sort.field) {
        case 'createdAt':
          aValue = a.createdAt;
          bValue = b.createdAt;
          break;
        case 'completedAt':
          aValue = a.completedAt || 0;
          bValue = b.completedAt || 0;
          break;
        case 'processingTimeMs':
          aValue = a.processingTimeMs;
          bValue = b.processingTimeMs;
          break;
        case 'creditsUsed':
          aValue = a.creditsUsed;
          bValue = b.creditsUsed;
          break;
        case 'action':
          aValue = a.action;
          bValue = b.action;
          break;
        default:
          aValue = a.createdAt;
          bValue = b.createdAt;
      }

      if (aValue < bValue) return sort.direction === 'asc' ? -1 : 1;
      if (aValue > bValue) return sort.direction === 'asc' ? 1 : -1;
      return 0;
    });
  }

  /**
   * Intersect two sets
   */
  private intersectSets<T>(set1: Set<T>, set2: Set<T>): Set<T> {
    const result = new Set<T>();
    const smaller = set1.size < set2.size ? set1 : set2;
    const larger = set1.size < set2.size ? set2 : set1;

    for (const item of smaller) {
      if (larger.has(item)) {
        result.add(item);
      }
    }

    return result;
  }

  /**
   * Update indexes for an entry
   */
  private updateIndexes(entry: AIHistoryEntryExtended): void {
    // User index
    if (!this.userIndex.has(entry.userId)) {
      this.userIndex.set(entry.userId, new Set());
    }
    this.userIndex.get(entry.userId)!.add(entry.id);

    // Workspace index
    if (!this.workspaceIndex.has(entry.workspaceId)) {
      this.workspaceIndex.set(entry.workspaceId, new Set());
    }
    this.workspaceIndex.get(entry.workspaceId)!.add(entry.id);

    // Project index
    if (entry.projectId) {
      if (!this.projectIndex.has(entry.projectId)) {
        this.projectIndex.set(entry.projectId, new Set());
      }
      this.projectIndex.get(entry.projectId)!.add(entry.id);
    }

    // Action index
    if (!this.actionIndex.has(entry.action)) {
      this.actionIndex.set(entry.action, new Set());
    }
    this.actionIndex.get(entry.action)!.add(entry.id);

    // Provider index
    if (!this.providerIndex.has(entry.provider)) {
      this.providerIndex.set(entry.provider, new Set());
    }
    this.providerIndex.get(entry.provider)!.add(entry.id);

    // Tags index
    for (const tag of entry.tags) {
      if (!this.tagIndex.has(tag)) {
        this.tagIndex.set(tag, new Set());
      }
      this.tagIndex.get(tag)!.add(entry.id);
    }
  }

  /**
   * Remove entry from indexes
   */
  private removeFromIndexes(entry: AIHistoryEntryExtended): void {
    this.userIndex.get(entry.userId)?.delete(entry.id);
    this.workspaceIndex.get(entry.workspaceId)?.delete(entry.id);
    if (entry.projectId) {
      this.projectIndex.get(entry.projectId)?.delete(entry.id);
    }
    this.actionIndex.get(entry.action)?.delete(entry.id);
    this.providerIndex.get(entry.provider)?.delete(entry.id);
    for (const tag of entry.tags) {
      this.tagIndex.get(tag)?.delete(entry.id);
    }
    this.favoriteEntries.delete(entry.id);
  }

  /**
   * Toggle favorite status
   */
  toggleFavorite(entryId: string): boolean {
    if (!this.config.enableFavorites) return false;

    const entry = this.entries.get(entryId);
    if (!entry) return false;

    entry.isFavorite = !entry.isFavorite;

    if (entry.isFavorite) {
      this.favoriteEntries.add(entryId);
    } else {
      this.favoriteEntries.delete(entryId);
    }

    if (this.config.enablePersistence) {
      this.saveToStorage();
    }

    this.emit('favoriteToggled', entry);

    return entry.isFavorite;
  }

  /**
   * Add note to entry
   */
  addNote(entryId: string, note: string): boolean {
    if (!this.config.enableNotes) return false;

    const entry = this.entries.get(entryId);
    if (!entry) return false;

    entry.notes = note;

    if (this.config.enablePersistence) {
      this.saveToStorage();
    }

    this.emit('noteAdded', entry);

    return true;
  }

  /**
   * Add tags to entry
   */
  addTags(entryId: string, tags: string[]): boolean {
    if (!this.config.enableTags) return false;

    const entry = this.entries.get(entryId);
    if (!entry) return false;

    // Remove old tag indexes
    for (const tag of entry.tags) {
      this.tagIndex.get(tag)?.delete(entryId);
    }

    // Add new tags
    const uniqueTags = [...new Set([...entry.tags, ...tags])];
    entry.tags = uniqueTags;

    // Update tag indexes
    for (const tag of uniqueTags) {
      if (!this.tagIndex.has(tag)) {
        this.tagIndex.set(tag, new Set());
      }
      this.tagIndex.get(tag)!.add(entryId);
    }

    if (this.config.enablePersistence) {
      this.saveToStorage();
    }

    this.emit('tagsAdded', entry);

    return true;
  }

  /**
   * Remove tags from entry
   */
  removeTags(entryId: string, tags: string[]): boolean {
    if (!this.config.enableTags) return false;

    const entry = this.entries.get(entryId);
    if (!entry) return false;

    // Remove from tag indexes
    for (const tag of tags) {
      this.tagIndex.get(tag)?.delete(entryId);
    }

    // Update entry tags
    entry.tags = entry.tags.filter(tag => !tags.includes(tag));

    if (this.config.enablePersistence) {
      this.saveToStorage();
    }

    this.emit('tagsRemoved', entry);

    return true;
  }

  /**
   * Delete entry
   */
  deleteEntry(entryId: string): boolean {
    const entry = this.entries.get(entryId);
    if (!entry) return false;

    // Remove from indexes
    this.removeFromIndexes(entry);

    // Remove entry
    this.entries.delete(entryId);

    // Invalidate cache
    this.invalidateStatisticsCache(entry.userId, entry.workspaceId);

    if (this.config.enablePersistence) {
      this.saveToStorage();
    }

    this.emit('entryDeleted', entryId);

    return true;
  }

  /**
   * Delete multiple entries
   */
  deleteEntries(entryIds: string[]): BatchOperationResult {
    let processed = 0;
    let failed = 0;
    const errors: Array<{ entryId: string; error: string }> = [];

    for (const entryId of entryIds) {
      try {
        const success = this.deleteEntry(entryId);
        if (success) {
          processed++;
        } else {
          failed++;
          errors.push({ entryId, error: 'Entry not found' });
        }
      } catch (error) {
        failed++;
        errors.push({
          entryId,
          error: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    }

    return {
      success: failed === 0,
      processed,
      failed,
      errors,
    };
  }

  /**
   * Get statistics for user/workspace
   */
  getStatistics(
    userId: string,
    workspaceId: string,
    dateRange?: { from: number; to: number }
  ): HistoryStatistics {
    if (!this.config.enableStatistics) {
      return this.getEmptyStatistics();
    }

    // Check cache
    const cacheKey = `${userId}:${workspaceId}:${dateRange?.from || 0}:${dateRange?.to || 0}`;
    const cached = this.statisticsCache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < 60000) {
      return cached.stats;
    }

    // Get entries
    const entries = Array.from(this.entries.values()).filter(entry => {
      if (entry.userId !== userId || entry.workspaceId !== workspaceId) return false;
      if (dateRange) {
        if (dateRange.from && entry.createdAt < dateRange.from) return false;
        if (dateRange.to && entry.createdAt > dateRange.to) return false;
      }
      return true;
    });

    // Calculate statistics
    const stats = this.calculateStatistics(entries);

    // Cache results
    this.statisticsCache.set(cacheKey, { stats, timestamp: Date.now() });

    return stats;
  }

  /**
   * Calculate statistics from entries
   */
  private calculateStatistics(entries: AIHistoryEntryExtended[]): HistoryStatistics {
    const totalEntries = entries.length;
    const totalCreditsUsed = entries.reduce((sum, e) => sum + e.creditsUsed, 0);
    const totalProcessingTimeMs = entries.reduce((sum, e) => sum + e.processingTimeMs, 0);
    const averageProcessingTimeMs = totalEntries > 0 ? totalProcessingTimeMs / totalEntries : 0;

    const successfulEntries = entries.filter(e => e.status === 'completed').length;
    const successRate = totalEntries > 0 ? successfulEntries / totalEntries : 0;

    // Group by action
    const entriesByAction: Record<string, number> = {};
    const entriesByProvider: Record<string, number> = {};
    const entriesByStatus: Record<string, number> = {};
    const entriesByDayMap = new Map<string, { count: number; credits: number }>();

    for (const entry of entries) {
      // By action
      entriesByAction[entry.action] = (entriesByAction[entry.action] || 0) + 1;

      // By provider
      entriesByProvider[entry.provider] = (entriesByProvider[entry.provider] || 0) + 1;

      // By status
      entriesByStatus[entry.status] = (entriesByStatus[entry.status] || 0) + 1;

      // By day
      const date = new Date(entry.createdAt).toISOString().split('T')[0];
      const existing = entriesByDayMap.get(date) || { count: 0, credits: 0 };
      entriesByDayMap.set(date, {
        count: existing.count + 1,
        credits: existing.credits + entry.creditsUsed,
      });
    }

    const entriesByDay = Array.from(entriesByDayMap.entries())
      .map(([date, data]) => ({ date, count: data.count, credits: data.credits }))
      .sort((a, b) => a.date.localeCompare(b.date));

    // Top actions
    const topActions = Object.entries(entriesByAction)
      .map(([action, count]) => ({
        action,
        count,
        credits: entries.filter(e => e.action === action).reduce((sum, e) => sum + e.creditsUsed, 0),
      }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);

    // Top models
    const modelStats = new Map<string, { count: number; credits: number }>();
    for (const entry of entries) {
      const existing = modelStats.get(entry.modelId) || { count: 0, credits: 0 };
      modelStats.set(entry.modelId, {
        count: existing.count + 1,
        credits: existing.credits + entry.creditsUsed,
      });
    }

    const topModels = Array.from(modelStats.entries())
      .map(([modelId, data]) => ({ modelId, ...data }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);

    // Usage trend (last 30 days)
    const usageTrend = entriesByDay.slice(-30);

    return {
      totalEntries,
      totalCreditsUsed,
      totalProcessingTimeMs,
      averageProcessingTimeMs,
      successRate,
      entriesByAction,
      entriesByProvider,
      entriesByStatus,
      entriesByDay,
      topActions,
      topModels,
      usageTrend,
    };
  }

  /**
   * Get empty statistics
   */
  private getEmptyStatistics(): HistoryStatistics {
    return {
      totalEntries: 0,
      totalCreditsUsed: 0,
      totalProcessingTimeMs: 0,
      averageProcessingTimeMs: 0,
      successRate: 0,
      entriesByAction: {},
      entriesByProvider: {},
      entriesByStatus: {},
      entriesByDay: [],
      topActions: [],
      topModels: [],
      usageTrend: [],
    };
  }

  /**
   * Invalidate statistics cache
   */
  private invalidateStatisticsCache(userId: string, workspaceId: string): void {
    for (const key of this.statisticsCache.keys()) {
      if (key.startsWith(`${userId}:${workspaceId}:`)) {
        this.statisticsCache.delete(key);
      }
    }
  }

  /**
   * Export history
   */
  async exportHistory(options: HistoryExportOptions): Promise<string | Blob> {
    const filters = options.filters || {};
    const entries = this.getCandidateEntries(filters);
    const filtered = this.applyFilters(entries, filters);

    // Apply date range
    let exportEntries = filtered;
    if (options.dateRange) {
      exportEntries = exportEntries.filter(
        e => e.createdAt >= options.dateRange!.from && e.createdAt <= options.dateRange!.to
      );
    }

    // Apply limit
    if (options.limit) {
      exportEntries = exportEntries.slice(0, options.limit);
    }

    // Prepare data for export
    const exportData = exportEntries.map(entry => {
      const data: any = {
        id: entry.id,
        userId: entry.userId,
        workspaceId: entry.workspaceId,
        projectId: entry.projectId,
        action: entry.action,
        provider: entry.provider,
        modelId: entry.modelId,
        status: entry.status,
        creditsUsed: entry.creditsUsed,
        processingTimeMs: entry.processingTimeMs,
        createdAt: entry.createdAt,
        completedAt: entry.completedAt,
        isFavorite: entry.isFavorite,
        notes: entry.notes,
        tags: entry.tags,
      };

      if (options.includeInput) {
        data.input = entry.input;
      }

      if (options.includeOutput) {
        data.output = entry.output;
      }

      if (options.includeMetadata) {
        data.metadata = entry.metadata;
      }

      return data;
    });

    if (options.format === 'json') {
      return JSON.stringify(
        {
          version: '1.0.0',
          exportedAt: new Date().toISOString(),
          totalEntries: exportData.length,
          entries: exportData,
        },
        null,
        2
      );
    } else if (options.format === 'csv') {
      return this.convertToCSV(exportData);
    }

    throw new Error(`Unsupported export format: ${options.format}`);
  }

  /**
   * Convert data to CSV
   */
  private convertToCSV(data: any[]): string {
    if (data.length === 0) return '';

    const headers = Object.keys(data[0]);
    const rows = data.map(entry =>
      headers.map(header => {
        const value = entry[header];
        if (value === null || value === undefined) return '';
        if (typeof value === 'object') return JSON.stringify(value);
        return String(value);
      }).join(',')
    );

    return [headers.join(','), ...rows].join('\n');
  }

  /**
   * Import history
   */
  async importHistory(json: string): Promise<HistoryImportResult> {
    try {
      const data = JSON.parse(json);

      if (!data.entries || !Array.isArray(data.entries)) {
        throw new Error('Invalid import data: missing entries array');
      }

      let imported = 0;
      let skipped = 0;
      const errors: Array<{ index: number; error: string }> = [];

      for (let i = 0; i < data.entries.length; i++) {
        try {
          const entryData = data.entries[i];

          // Validate required fields
          if (!entryData.id || !entryData.userId || !entryData.workspaceId || !entryData.action) {
            throw new Error('Missing required fields');
          }

          // Check if entry already exists
          if (this.entries.has(entryData.id)) {
            skipped++;
            continue;
          }

          // Create entry
          const entry: AIHistoryEntryExtended = {
            id: entryData.id,
            userId: entryData.userId,
            workspaceId: entryData.workspaceId,
            projectId: entryData.projectId,
            layerId: entryData.layerId,
            action: entryData.action,
            provider: entryData.provider || 'custom',
            modelId: entryData.modelId || 'unknown',
            input: entryData.input || {},
            output: entryData.output,
            status: entryData.status || 'completed',
            creditsUsed: entryData.creditsUsed || 0,
            processingTimeMs: entryData.processingTimeMs || 0,
            createdAt: entryData.createdAt || Date.now(),
            completedAt: entryData.completedAt,
            metadata: entryData.metadata,
            isFavorite: entryData.isFavorite || false,
            notes: entryData.notes,
            tags: entryData.tags || [],
            rerunCount: entryData.rerunCount || 0,
            lastRerunAt: entryData.lastRerunAt,
          };

          this.entries.set(entry.id, entry);
          this.updateIndexes(entry);

          if (entry.isFavorite) {
            this.favoriteEntries.add(entry.id);
          }

          imported++;
        } catch (error) {
          errors.push({
            index: i,
            error: error instanceof Error ? error.message : 'Unknown error',
          });
          skipped++;
        }
      }

      if (this.config.enablePersistence) {
        this.saveToStorage();
      }

      this.emit('historyImported', { imported, skipped, errors });

      return {
        success: errors.length === 0,
        imported,
        skipped,
        errors,
      };
    } catch (error) {
      return {
        success: false,
        imported: 0,
        skipped: 0,
        errors: [{ index: -1, error: error instanceof Error ? error.message : 'Unknown error' }],
      };
    }
  }

  /**
   * Rerun a history entry
   */
  async rerunEntry(
    entryId: string,
    options: RerunOptions = { entryId: '' }
  ): Promise<AIRequest | null> {
    if (!this.config.enableRerunTracking) return null;

    const entry = this.entries.get(entryId);
    if (!entry) return null;

    // Update rerun count
    entry.rerunCount++;
    entry.lastRerunAt = Date.now();

    // Create new request based on original
    const request: AIRequest = {
      id: `req_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`,
      provider: entry.provider,
      modelId: entry.modelId,
      action: entry.action,
      input: options.modifyInput ? options.modifyInput(entry.input) : entry.input,
      parameters: options.modifyParameters
        ? options.modifyParameters(entry.metadata?.parameters || {})
        : entry.metadata?.parameters || {},
      userId: entry.userId,
      workspaceId: entry.workspaceId,
      projectId: entry.projectId,
      createdAt: Date.now(),
    };

    if (this.config.enablePersistence) {
      this.saveToStorage();
    }

    this.emit('entryRerun', entry, request);

    return request;
  }

  /**
   * Get related entries
   */
  getRelatedEntries(entryId: string, limit: number = 5): AIHistoryEntryExtended[] {
    const entry = this.entries.get(entryId);
    if (!entry) return [];

    // Find entries with same action and similar input
    const related = Array.from(this.entries.values())
      .filter(e => {
        if (e.id === entryId) return false;
        if (e.action !== entry.action) return false;
        if (e.provider !== entry.provider) return false;
        return true;
      })
      .sort((a, b) => {
        // Sort by similarity (simple heuristic)
        const aSimilarity = this.calculateSimilarity(entry, a);
        const bSimilarity = this.calculateSimilarity(entry, b);
        return bSimilarity - aSimilarity;
      })
      .slice(0, limit);

    return related;
  }

  /**
   * Calculate similarity between two entries
   */
  private calculateSimilarity(entry1: AIHistoryEntryExtended, entry2: AIHistoryEntryExtended): number {
    let similarity = 0;

    // Same model
    if (entry1.modelId === entry2.modelId) similarity += 0.3;

    // Similar input text
    if (entry1.input?.text && entry2.input?.text) {
      const text1 = entry1.input.text.toLowerCase();
      const text2 = entry2.input.text.toLowerCase();
      const words1 = new Set(text1.split(/\s+/));
      const words2 = new Set(text2.split(/\s+/));
      const intersection = new Set([...words1].filter(x => words2.has(x)));
      const union = new Set([...words1, ...words2]);
      similarity += 0.4 * (intersection.size / union.size);
    }

    // Same tags
    if (entry1.tags.length > 0 && entry2.tags.length > 0) {
      const tags1 = new Set(entry1.tags);
      const tags2 = new Set(entry2.tags);
      const intersection = new Set([...tags1].filter(x => tags2.has(x)));
      similarity += 0.3 * (intersection.size / Math.max(tags1.size, tags2.size));
    }

    return similarity;
  }

  /**
   * Cleanup old entries
   */
  cleanupOldEntries(): number {
    const cutoffDate = Date.now() - this.config.retentionDays * 24 * 60 * 60 * 1000;
    let cleaned = 0;

    const entriesToDelete: string[] = [];
    for (const [id, entry] of this.entries) {
      if (entry.createdAt < cutoffDate && !entry.isFavorite) {
        entriesToDelete.push(id);
      }
    }

    for (const id of entriesToDelete) {
      this.deleteEntry(id);
      cleaned++;
    }

    if (cleaned > 0) {
      this.emit('cleanupCompleted', cleaned);
    }

    return cleaned;
  }

  /**
   * Check if cleanup is needed
   */
  private checkCleanupNeeded(userId: string, workspaceId: string): void {
    const userEntries = this.userIndex.get(userId)?.size || 0;
    const workspaceEntries = this.workspaceIndex.get(workspaceId)?.size || 0;

    if (
      userEntries > this.config.maxEntriesPerUser ||
      workspaceEntries > this.config.maxEntriesPerWorkspace
    ) {
      this.cleanupOldEntries();
    }
  }

  /**
   * Start cleanup timer
   */
  private startCleanupTimer(): void {
    this.cleanupTimer = setInterval(() => {
      this.cleanupOldEntries();
    }, this.config.cleanupIntervalMs);
  }

  /**
   * Stop cleanup timer
   */
  private stopCleanupTimer(): void {
    if (this.cleanupTimer) {
      clearInterval(this.cleanupTimer);
      this.cleanupTimer = null;
    }
  }

  /**
   * Sanitize input for storage
   */
  private sanitizeInput(input: AIInput): AIInput {
    // Remove large data to save space
    const sanitized: AIInput = { ...input };

    // Keep only metadata for large data
    if (sanitized.imageData && typeof sanitized.imageData === 'string') {
      if (sanitized.imageData.length > 10000) {
        sanitized.imageData = '[large-image-data-removed]';
      }
    }

    if (sanitized.maskData && typeof sanitized.maskData === 'string') {
      if (sanitized.maskData.length > 10000) {
        sanitized.maskData = '[large-mask-data-removed]';
      }
    }

    return sanitized;
  }

  /**
   * Save to storage
   */
  private saveToStorage(): void {
    try {
      const data = {
        entries: Array.from(this.entries.values()),
        favorites: Array.from(this.favoriteEntries),
        timestamp: Date.now(),
      };

      localStorage.setItem(this.config.storageKey, JSON.stringify(data));
    } catch (error) {
      console.error('Failed to save history:', error);
    }
  }

  /**
   * Load from storage
   */
  private loadFromStorage(): void {
    try {
      const stored = localStorage.getItem(this.config.storageKey);
      if (!stored) return;

      const data = JSON.parse(stored);

      if (data.entries && Array.isArray(data.entries)) {
        for (const entry of data.entries) {
          this.entries.set(entry.id, entry);
          this.updateIndexes(entry);
        }
      }

      if (data.favorites && Array.isArray(data.favorites)) {
        for (const id of data.favorites) {
          this.favoriteEntries.add(id);
        }
      }
    } catch (error) {
      console.error('Failed to load history:', error);
    }
  }

  /**
   * Subscribe to events
   */
  on(event: string, callback: (...args: any[]) => void): void {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set());
    }
    this.listeners.get(event)!.add(callback);
  }

  /**
   * Unsubscribe from events
   */
  off(event: string, callback: (...args: any[]) => void): void {
    this.listeners.get(event)?.delete(callback);
  }

  /**
   * Emit event
   */
  private emit(event: string, ...args: any[]): void {
    const callbacks = this.listeners.get(event);
    if (callbacks) {
      for (const callback of callbacks) {
        try {
          callback(...args);
        } catch (error) {
          console.error(`History manager listener error for ${event}:`, error);
        }
      }
    }
  }

  /**
   * Get total entry count
   */
  getTotalCount(): number {
    return this.entries.size;
  }

  /**
   * Get entry count for user
   */
  getUserEntryCount(userId: string): number {
    return this.userIndex.get(userId)?.size || 0;
  }

  /**
   * Get entry count for workspace
   */
  getWorkspaceEntryCount(workspaceId: string): number {
    return this.workspaceIndex.get(workspaceId)?.size || 0;
  }

  /**
   * Get favorite entries
   */
  getFavoriteEntries(userId: string, workspaceId: string): AIHistoryEntryExtended[] {
    return Array.from(this.favoriteEntries)
      .map(id => this.entries.get(id))
      .filter(
        (entry): entry is AIHistoryEntryExtended =>
          entry !== undefined &&
          entry.userId === userId &&
          entry.workspaceId === workspaceId
      );
  }

  /**
   * Get all tags
   */
  getAllTags(userId: string, workspaceId: string): string[] {
    const tags = new Set<string>();

    for (const entry of this.entries.values()) {
      if (entry.userId === userId && entry.workspaceId === workspaceId) {
        for (const tag of entry.tags) {
          tags.add(tag);
        }
      }
    }

    return Array.from(tags);
  }

  /**
   * Update configuration
   */
  updateConfig(updates: Partial<HistoryConfig>): void {
    this.config = { ...this.config, ...updates };

    // Restart cleanup timer if interval changed
    if (updates.cleanupIntervalMs !== undefined) {
      this.stopCleanupTimer();
      if (this.config.autoCleanup) {
        this.startCleanupTimer();
      }
    }
  }

  /**
   * Get configuration
   */
  getConfig(): HistoryConfig {
    return { ...this.config };
  }

  /**
   * Clear all data
   */
  clearAll(): void {
    this.entries.clear();
    this.userIndex.clear();
    this.workspaceIndex.clear();
    this.projectIndex.clear();
    this.actionIndex.clear();
    this.providerIndex.clear();
    this.tagIndex.clear();
    this.favoriteEntries.clear();
    this.statisticsCache.clear();

    if (this.config.enablePersistence) {
      try {
        localStorage.removeItem(this.config.storageKey);
      } catch (error) {
        console.error('Failed to clear storage:', error);
      }
    }

    this.emit('historyCleared');
  }

  /**
   * Destroy history manager
   */
  destroy(): void {
    this.stopCleanupTimer();
    this.listeners.clear();
    this.clearAll();
  }
}

export const aiHistoryManager = new AIHistoryManager();