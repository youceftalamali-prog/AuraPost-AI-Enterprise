/**
 * Canvas Analytics
 * Collects and tracks canvas usage metrics
 * Supports: Editing time, Tool usage, AI usage, Export statistics, Performance metrics
 * Phase: 5.4 Part 5
 */

export interface AnalyticsEvent {
  type: string;
  category: AnalyticsCategory;
  label: string;
  value?: number;
  metadata?: Record<string, any>;
  timestamp: number;
}

export type AnalyticsCategory =
  | 'tool'
  | 'ai'
  | 'export'
  | 'performance'
  | 'layer'
  | 'edit'
  | 'canvas'
  | 'project'
  | 'error'
  | 'custom';

export interface ToolUsageStats {
  toolName: string;
  usageCount: number;
  totalTimeMs: number;
  lastUsedAt: number | null;
  averageDurationMs: number;
}

export interface AIUsageStats {
  feature: string;
  usageCount: number;
  totalCreditsUsed: number;
  totalProcessingTimeMs: number;
  successCount: number;
  failureCount: number;
  lastUsedAt: number | null;
}

export interface ExportStats {
  format: string;
  exportCount: number;
  totalFileSize: number;
  averageFileSize: number;
  totalProcessingTimeMs: number;
  lastExportedAt: number | null;
}

export interface PerformanceStats {
  averageFps: number;
  averageFrameTimeMs: number;
  peakMemoryMB: number;
  currentMemoryMB: number;
  renderCount: number;
  cacheHitRate: number;
  errorCount: number;
}

export interface SessionStats {
  sessionId: string;
  startTime: number;
  endTime: number | null;
  durationMs: number;
  toolUsage: Record<string, ToolUsageStats>;
  aiUsage: Record<string, AIUsageStats>;
  exportStats: Record<string, ExportStats>;
  performance: PerformanceStats;
  totalEvents: number;
  projectCount: number;
  layerCount: number;
  saveCount: number;
  undoCount: number;
  redoCount: number;
}

export interface AnalyticsConfig {
  maxEvents: number;
  maxSessions: number;
  enableTracking: boolean;
  enablePerformanceTracking: boolean;
  enableErrorTracking: boolean;
  flushIntervalMs: number;
  enableSessionTracking: boolean;
}

export type AnalyticsListener = (event: AnalyticsEvent) => void;

export class CanvasAnalytics {
  private events: AnalyticsEvent[] = [];
  private sessions: Map<string, SessionStats> = new Map();
  private currentSessionId: string | null = null;
  private sessionStartTime: number = Date.now();
  private toolUsage: Map<string, ToolUsageStats> = new Map();
  private aiUsage: Map<string, AIUsageStats> = new Map();
  private exportStats: Map<string, ExportStats> = new Map();
  private listeners: Map<string, Set<AnalyticsListener>> = new Map();
  private config: AnalyticsConfig;
  private flushTimer: ReturnType<typeof setInterval> | null = null;
  private toolStartTime: Map<string, number> = new Map();
  private performanceMetrics: {
    fpsSamples: number[];
    frameTimeSamples: number[];
    memorySamples: number[];
    cacheHits: number;
    cacheMisses: number;
    renderCount: number;
    errorCount: number;
  } = {
    fpsSamples: [],
    frameTimeSamples: [],
    memorySamples: [],
    cacheHits: 0,
    cacheMisses: 0,
    renderCount: 0,
    errorCount: 0,
  };

  constructor(config: Partial<AnalyticsConfig> = {}) {
    this.config = {
      maxEvents: config.maxEvents || 10000,
      maxSessions: config.maxSessions || 100,
      enableTracking: config.enableTracking !== false,
      enablePerformanceTracking: config.enablePerformanceTracking !== false,
      enableErrorTracking: config.enableErrorTracking !== false,
      flushIntervalMs: config.flushIntervalMs || 60000,
      enableSessionTracking: config.enableSessionTracking !== false,
    };

    if (this.config.enableSessionTracking) {
      this.startNewSession();
    }

    if (this.config.flushIntervalMs > 0) {
      this.startFlushTimer();
    }
  }

  /**
   * Start a new analytics session
   */
  startNewSession(): string {
    const sessionId = `session_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;

    const session: SessionStats = {
      sessionId,
      startTime: Date.now(),
      endTime: null,
      durationMs: 0,
      toolUsage: {},
      aiUsage: {},
      exportStats: {},
      performance: {
        averageFps: 0,
        averageFrameTimeMs: 0,
        peakMemoryMB: 0,
        currentMemoryMB: 0,
        renderCount: 0,
        cacheHitRate: 0,
        errorCount: 0,
      },
      totalEvents: 0,
      projectCount: 0,
      layerCount: 0,
      saveCount: 0,
      undoCount: 0,
      redoCount: 0,
    };

    this.sessions.set(sessionId, session);
    this.currentSessionId = sessionId;
    this.sessionStartTime = Date.now();

    // Limit sessions
    if (this.sessions.size > this.config.maxSessions) {
      const oldestKey = this.sessions.keys().next().value;
      if (oldestKey) {
        this.sessions.delete(oldestKey);
      }
    }

    this.track({
      type: 'session_start',
      category: 'custom',
      label: sessionId,
    });

    return sessionId;
  }

  /**
   * End current session
   */
  endSession(): void {
    if (!this.currentSessionId) return;

    const session = this.sessions.get(this.currentSessionId);
    if (session) {
      session.endTime = Date.now();
      session.durationMs = session.endTime - session.startTime;
      session.performance = this.getPerformanceStats();
    }

    this.track({
      type: 'session_end',
      category: 'custom',
      label: this.currentSessionId,
      value: session?.durationMs,
    });

    this.currentSessionId = null;
  }

  /**
   * Track generic analytics event
   */
  track(event: Omit<AnalyticsEvent, 'timestamp'>): void {
    if (!this.config.enableTracking) return;

    const fullEvent: AnalyticsEvent = {
      ...event,
      timestamp: Date.now(),
    };

    this.events.push(fullEvent);

    // Update session
    if (this.currentSessionId) {
      const session = this.sessions.get(this.currentSessionId);
      if (session) {
        session.totalEvents++;
      }
    }

    // Limit events
    if (this.events.length > this.config.maxEvents) {
      this.events.shift();
    }

    // Notify listeners
    this.emit(fullEvent);
  }

  /**
   * Track tool usage
   */
  trackToolUsage(toolName: string, durationMs?: number): void {
    const existing = this.toolUsage.get(toolName) || {
      toolName,
      usageCount: 0,
      totalTimeMs: 0,
      lastUsedAt: null,
      averageDurationMs: 0,
    };

    existing.usageCount++;
    existing.lastUsedAt = Date.now();

    if (durationMs !== undefined) {
      existing.totalTimeMs += durationMs;
      existing.averageDurationMs = existing.totalTimeMs / existing.usageCount;
    }

    this.toolUsage.set(toolName, existing);

    // Update session
    if (this.currentSessionId) {
      const session = this.sessions.get(this.currentSessionId);
      if (session) {
        session.toolUsage[toolName] = existing;
      }
    }

    this.track({
      type: 'tool_used',
      category: 'tool',
      label: toolName,
      value: durationMs,
    });
  }

  /**
   * Start tool timing
   */
  startToolTiming(toolName: string): void {
    this.toolStartTime.set(toolName, Date.now());
  }

  /**
   * End tool timing and track
   */
  endToolTiming(toolName: string): void {
    const startTime = this.toolStartTime.get(toolName);
    if (startTime !== undefined) {
      const durationMs = Date.now() - startTime;
      this.trackToolUsage(toolName, durationMs);
      this.toolStartTime.delete(toolName);
    }
  }

  /**
   * Track AI feature usage
   */
  trackAIUsage(
    feature: string,
    creditsUsed: number = 0,
    processingTimeMs: number = 0,
    success: boolean = true
  ): void {
    const existing = this.aiUsage.get(feature) || {
      feature,
      usageCount: 0,
      totalCreditsUsed: 0,
      totalProcessingTimeMs: 0,
      successCount: 0,
      failureCount: 0,
      lastUsedAt: null,
    };

    existing.usageCount++;
    existing.totalCreditsUsed += creditsUsed;
    existing.totalProcessingTimeMs += processingTimeMs;
    existing.lastUsedAt = Date.now();

    if (success) {
      existing.successCount++;
    } else {
      existing.failureCount++;
    }

    this.aiUsage.set(feature, existing);

    // Update session
    if (this.currentSessionId) {
      const session = this.sessions.get(this.currentSessionId);
      if (session) {
        session.aiUsage[feature] = existing;
      }
    }

    this.track({
      type: 'ai_used',
      category: 'ai',
      label: feature,
      value: creditsUsed,
      metadata: {
        processingTimeMs,
        success,
      },
    });
  }

  /**
   * Track export operation
   */
  trackExport(
    format: string,
    fileSize: number = 0,
    processingTimeMs: number = 0,
    success: boolean = true
  ): void {
    const existing = this.exportStats.get(format) || {
      format,
      exportCount: 0,
      totalFileSize: 0,
      averageFileSize: 0,
      totalProcessingTimeMs: 0,
      lastExportedAt: null,
    };

    existing.exportCount++;
    existing.totalFileSize += fileSize;
    existing.averageFileSize = existing.totalFileSize / existing.exportCount;
    existing.totalProcessingTimeMs += processingTimeMs;
    existing.lastExportedAt = Date.now();

    this.exportStats.set(format, existing);

    // Update session
    if (this.currentSessionId) {
      const session = this.sessions.get(this.currentSessionId);
      if (session) {
        session.exportStats[format] = existing;
      }
    }

    this.track({
      type: 'export_completed',
      category: 'export',
      label: format,
      value: fileSize,
      metadata: {
        processingTimeMs,
        success,
      },
    });
  }

  /**
   * Track performance metric
   */
  trackPerformance(
    metric: 'fps' | 'frameTime' | 'memory',
    value: number
  ): void {
    if (!this.config.enablePerformanceTracking) return;

    switch (metric) {
      case 'fps':
        this.performanceMetrics.fpsSamples.push(value);
        if (this.performanceMetrics.fpsSamples.length > 100) {
          this.performanceMetrics.fpsSamples.shift();
        }
        break;
      case 'frameTime':
        this.performanceMetrics.frameTimeSamples.push(value);
        if (this.performanceMetrics.frameTimeSamples.length > 100) {
          this.performanceMetrics.frameTimeSamples.shift();
        }
        break;
      case 'memory':
        this.performanceMetrics.memorySamples.push(value);
        if (this.performanceMetrics.memorySamples.length > 100) {
          this.performanceMetrics.memorySamples.shift();
        }
        break;
    }
  }

  /**
   * Track render operation
   */
  trackRender(): void {
    this.performanceMetrics.renderCount++;
  }

  /**
   * Track cache hit
   */
  trackCacheHit(): void {
    this.performanceMetrics.cacheHits++;
  }

  /**
   * Track cache miss
   */
  trackCacheMiss(): void {
    this.performanceMetrics.cacheMisses++;
  }

  /**
   * Track error
   */
  trackError(errorType: string, context?: Record<string, any>): void {
    if (!this.config.enableErrorTracking) return;

    this.performanceMetrics.errorCount++;

    this.track({
      type: 'error',
      category: 'error',
      label: errorType,
      metadata: context,
    });
  }

  /**
   * Track editing time
   */
  trackEditingTime(): number {
    return Date.now() - this.sessionStartTime;
  }

  /**
   * Track save operation
   */
  trackSave(): void {
    if (this.currentSessionId) {
      const session = this.sessions.get(this.currentSessionId);
      if (session) {
        session.saveCount++;
      }
    }

    this.track({
      type: 'save',
      category: 'project',
      label: 'project_save',
    });
  }

  /**
   * Track undo operation
   */
  trackUndo(): void {
    if (this.currentSessionId) {
      const session = this.sessions.get(this.currentSessionId);
      if (session) {
        session.undoCount++;
      }
    }

    this.track({
      type: 'undo',
      category: 'edit',
      label: 'undo',
    });
  }

  /**
   * Track redo operation
   */
  trackRedo(): void {
    if (this.currentSessionId) {
      const session = this.sessions.get(this.currentSessionId);
      if (session) {
        session.redoCount++;
      }
    }

    this.track({
      type: 'redo',
      category: 'edit',
      label: 'redo',
    });
  }

  /**
   * Track layer operation
   */
  trackLayerOperation(operation: string, layerType?: string): void {
    this.track({
      type: 'layer_operation',
      category: 'layer',
      label: operation,
      metadata: {
        layerType,
      },
    });
  }

  /**
   * Track project operation
   */
  trackProjectOperation(operation: string, projectId?: string): void {
    if (this.currentSessionId && operation === 'create') {
      const session = this.sessions.get(this.currentSessionId);
      if (session) {
        session.projectCount++;
      }
    }

    this.track({
      type: 'project_operation',
      category: 'project',
      label: operation,
      metadata: {
        projectId,
      },
    });
  }

  /**
   * Get session statistics
   */
  getSessionStats(): SessionStats | null {
    if (!this.currentSessionId) return null;

    const session = this.sessions.get(this.currentSessionId);
    if (!session) return null;

    return {
      ...session,
      durationMs: Date.now() - session.startTime,
      performance: this.getPerformanceStats(),
    };
  }

  /**
   * Get performance statistics
   */
  getPerformanceStats(): PerformanceStats {
    const avgFps = this.performanceMetrics.fpsSamples.length > 0
      ? this.performanceMetrics.fpsSamples.reduce((a, b) => a + b, 0) /
        this.performanceMetrics.fpsSamples.length
      : 0;

    const avgFrameTime = this.performanceMetrics.frameTimeSamples.length > 0
      ? this.performanceMetrics.frameTimeSamples.reduce((a, b) => a + b, 0) /
        this.performanceMetrics.frameTimeSamples.length
      : 0;

    const peakMemory = this.performanceMetrics.memorySamples.length > 0
      ? Math.max(...this.performanceMetrics.memorySamples)
      : 0;

    const currentMemory = this.performanceMetrics.memorySamples.length > 0
      ? this.performanceMetrics.memorySamples[this.performanceMetrics.memorySamples.length - 1]
      : 0;

    const totalCacheOps = this.performanceMetrics.cacheHits + this.performanceMetrics.cacheMisses;
    const cacheHitRate = totalCacheOps > 0
      ? this.performanceMetrics.cacheHits / totalCacheOps
      : 0;

    return {
      averageFps: avgFps,
      averageFrameTimeMs: avgFrameTime,
      peakMemoryMB: peakMemory,
      currentMemoryMB: currentMemory,
      renderCount: this.performanceMetrics.renderCount,
      cacheHitRate,
      errorCount: this.performanceMetrics.errorCount,
    };
  }

  /**
   * Get tool usage statistics
   */
  getToolUsageStats(): Record<string, ToolUsageStats> {
    return Object.fromEntries(this.toolUsage);
  }

  /**
   * Get AI usage statistics
   */
  getAIUsageStats(): Record<string, AIUsageStats> {
    return Object.fromEntries(this.aiUsage);
  }

  /**
   * Get export statistics
   */
  getExportStats(): Record<string, ExportStats> {
    return Object.fromEntries(this.exportStats);
  }

  /**
   * Get events
   */
  getEvents(limit: number = 100): AnalyticsEvent[] {
    return this.events.slice(-limit);
  }

  /**
   * Get events by category
   */
  getEventsByCategory(category: AnalyticsCategory): AnalyticsEvent[] {
    return this.events.filter(e => e.category === category);
  }

  /**
   * Get events by type
   */
  getEventsByType(type: string): AnalyticsEvent[] {
    return this.events.filter(e => e.type === type);
  }

  /**
   * Get events in time range
   */
  getEventsInRange(startTime: number, endTime: number): AnalyticsEvent[] {
    return this.events.filter(
      e => e.timestamp >= startTime && e.timestamp <= endTime
    );
  }

  /**
   * Get all sessions
   */
  getAllSessions(): SessionStats[] {
    return Array.from(this.sessions.values());
  }

  /**
   * Get session by ID
   */
  getSession(sessionId: string): SessionStats | null {
    return this.sessions.get(sessionId) || null;
  }

  /**
   * Get current session ID
   */
  getCurrentSessionId(): string | null {
    return this.currentSessionId;
  }

  /**
   * Clear all events
   */
  clearEvents(): void {
    this.events = [];
  }

  /**
   * Clear all sessions
   */
  clearSessions(): void {
    this.sessions.clear();
    this.currentSessionId = null;
  }

  /**
   * Clear all statistics
   */
  clearStats(): void {
    this.toolUsage.clear();
    this.aiUsage.clear();
    this.exportStats.clear();
    this.performanceMetrics = {
      fpsSamples: [],
      frameTimeSamples: [],
      memorySamples: [],
      cacheHits: 0,
      cacheMisses: 0,
      renderCount: 0,
      errorCount: 0,
    };
  }

  /**
   * Clear all data
   */
  clearAll(): void {
    this.clearEvents();
    this.clearSessions();
    this.clearStats();
  }

  /**
   * Subscribe to analytics events
   */
  on(event: string, callback: AnalyticsListener): void {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set());
    }
    this.listeners.get(event)!.add(callback);
  }

  /**
   * Unsubscribe from analytics events
   */
  off(event: string, callback: AnalyticsListener): void {
    this.listeners.get(event)?.delete(callback);
  }

  /**
   * Emit analytics event
   */
  private emit(event: AnalyticsEvent): void {
    // Emit to type-specific listeners
    const typeListeners = this.listeners.get(event.type);
    if (typeListeners) {
      typeListeners.forEach(cb => {
        try {
          cb(event);
        } catch (error) {
          console.error('Analytics listener error:', error);
        }
      });
    }

    // Emit to category-specific listeners
    const categoryListeners = this.listeners.get(event.category);
    if (categoryListeners) {
      categoryListeners.forEach(cb => {
        try {
          cb(event);
        } catch (error) {
          console.error('Analytics listener error:', error);
        }
      });
    }

    // Emit to wildcard listeners
    const allListeners = this.listeners.get('*');
    if (allListeners) {
      allListeners.forEach(cb => {
        try {
          cb(event);
        } catch (error) {
          console.error('Analytics listener error:', error);
        }
      });
    }
  }

  /**
   * Start flush timer
   */
  private startFlushTimer(): void {
    if (this.flushTimer) return;

    this.flushTimer = setInterval(() => {
      this.flush();
    }, this.config.flushIntervalMs);
  }

  /**
   * Stop flush timer
   */
  private stopFlushTimer(): void {
    if (this.flushTimer) {
      clearInterval(this.flushTimer);
      this.flushTimer = null;
    }
  }

  /**
   * Flush analytics data (can be overridden for remote sending)
   */
  flush(): void {
    // This method can be overridden to send data to a remote server
    // For now, it's a no-op
    this.emit({
      type: 'flush',
      category: 'custom',
      label: 'analytics_flush',
      timestamp: Date.now(),
      metadata: {
        eventCount: this.events.length,
      },
    });
  }

  /**
   * Export analytics data
   */
  exportAnalytics(): string {
    return JSON.stringify(
      {
        version: '1.0.0',
        exportedAt: new Date().toISOString(),
        events: this.events,
        sessions: Object.fromEntries(this.sessions),
        toolUsage: this.getToolUsageStats(),
        aiUsage: this.getAIUsageStats(),
        exportStats: this.getExportStats(),
        performance: this.getPerformanceStats(),
      },
      null,
      2
    );
  }

  /**
   * Import analytics data
   */
  importAnalytics(json: string): boolean {
    try {
      const data = JSON.parse(json);

      if (data.events && Array.isArray(data.events)) {
        this.events = data.events;
      }

      if (data.sessions && typeof data.sessions === 'object') {
        for (const [sessionId, session] of Object.entries(data.sessions)) {
          this.sessions.set(sessionId, session as SessionStats);
        }
      }

      if (data.toolUsage && typeof data.toolUsage === 'object') {
        for (const [toolName, stats] of Object.entries(data.toolUsage)) {
          this.toolUsage.set(toolName, stats as ToolUsageStats);
        }
      }

      if (data.aiUsage && typeof data.aiUsage === 'object') {
        for (const [feature, stats] of Object.entries(data.aiUsage)) {
          this.aiUsage.set(feature, stats as AIUsageStats);
        }
      }

      if (data.exportStats && typeof data.exportStats === 'object') {
        for (const [format, stats] of Object.entries(data.exportStats)) {
          this.exportStats.set(format, stats as ExportStats);
        }
      }

      return true;
    } catch (error) {
      console.error('Failed to import analytics data:', error);
      return false;
    }
  }

  /**
   * Get configuration
   */
  getConfig(): AnalyticsConfig {
    return { ...this.config };
  }

  /**
   * Update configuration
   */
  updateConfig(updates: Partial<AnalyticsConfig>): void {
    this.config = { ...this.config, ...updates };

    // Update flush timer if interval changed
    if (updates.flushIntervalMs !== undefined) {
      this.stopFlushTimer();
      if (updates.flushIntervalMs > 0) {
        this.startFlushTimer();
      }
    }
  }

  /**
   * Get total event count
   */
  getEventCount(): number {
    return this.events.length;
  }

  /**
   * Get session count
   */
  getSessionCount(): number {
    return this.sessions.size;
  }

  /**
   * Get total editing time
   */
  getTotalEditingTime(): number {
    let total = 0;
    for (const session of this.sessions.values()) {
      total += session.durationMs;
    }
    return total;
  }

  /**
   * Get most used tool
   */
  getMostUsedTool(): string | null {
    let maxCount = 0;
    let mostUsed: string | null = null;

    for (const [toolName, stats] of this.toolUsage) {
      if (stats.usageCount > maxCount) {
        maxCount = stats.usageCount;
        mostUsed = toolName;
      }
    }

    return mostUsed;
  }

  /**
   * Get most used AI feature
   */
  getMostUsedAIFeature(): string | null {
    let maxCount = 0;
    let mostUsed: string | null = null;

    for (const [feature, stats] of this.aiUsage) {
      if (stats.usageCount > maxCount) {
        maxCount = stats.usageCount;
        mostUsed = feature;
      }
    }

    return mostUsed;
  }

  /**
   * Get total credits used
   */
  getTotalCreditsUsed(): number {
    let total = 0;
    for (const stats of this.aiUsage.values()) {
      total += stats.totalCreditsUsed;
    }
    return total;
  }

  /**
   * Get total exports
   */
  getTotalExports(): number {
    let total = 0;
    for (const stats of this.exportStats.values()) {
      total += stats.exportCount;
    }
    return total;
  }

  /**
   * Get total exported size
   */
  getTotalExportedSize(): number {
    let total = 0;
    for (const stats of this.exportStats.values()) {
      total += stats.totalFileSize;
    }
    return total;
  }

  /**
   * Destroy analytics
   */
  destroy(): void {
    this.endSession();
    this.stopFlushTimer();
    this.clearAll();
    this.listeners.clear();
  }

  /**
   * Get supported categories
   */
  static getSupportedCategories(): AnalyticsCategory[] {
    return [
      'tool',
      'ai',
      'export',
      'performance',
      'layer',
      'canvas',
      'project',
      'error',
      'custom',
    ];
  }

  /**
   * Check if category is valid
   */
  static isValidCategory(category: string): category is AnalyticsCategory {
    return this.getSupportedCategories().includes(category as AnalyticsCategory);
  }
}

export const canvasAnalytics = new CanvasAnalytics();