interface Metrics {
  renderDurations: number[];
  apiLatencies: number[];
  retryCounts: number[];
  cacheHits: number;
  cacheMisses: number;
  duplicateRequests: number;
  saveDurations: number[];
  activeRequests: number;
}

class PerformanceMonitor {
  private metrics: Metrics = {
    renderDurations: [],
    apiLatencies: [],
    retryCounts: [],
    cacheHits: 0,
    cacheMisses: 0,
    duplicateRequests: 0,
    saveDurations: [],
    activeRequests: 0,
  };

  trackRender(durationMs: number) {
    this.metrics.renderDurations.push(durationMs);
    if (this.metrics.renderDurations.length > 100) this.metrics.renderDurations.shift();
  }

  trackApiLatency(durationMs: number) {
    this.metrics.apiLatencies.push(durationMs);
    if (this.metrics.apiLatencies.length > 100) this.metrics.apiLatencies.shift();
  }

  trackRetry(count: number) {
    this.metrics.retryCounts.push(count);
  }

  trackCacheHit() {
    this.metrics.cacheHits++;
  }

  trackCacheMiss() {
    this.metrics.cacheMisses++;
  }

  trackDuplicateRequest() {
    this.metrics.duplicateRequests++;
  }

  trackSaveDuration(durationMs: number) {
    this.metrics.saveDurations.push(durationMs);
  }

  incrementActiveRequests() {
    this.metrics.activeRequests++;
  }

  decrementActiveRequests() {
    this.metrics.activeRequests = Math.max(0, this.metrics.activeRequests - 1);
  }

  getMetrics(): Metrics {
    return { ...this.metrics };
  }

  getAverageApiLatency(): number {
    if (this.metrics.apiLatencies.length === 0) return 0;
    return this.metrics.apiLatencies.reduce((a, b) => a + b, 0) / this.metrics.apiLatencies.length;
  }

  getAverageSaveDuration(): number {
    if (this.metrics.saveDurations.length === 0) return 0;
    return this.metrics.saveDurations.reduce((a, b) => a + b, 0) / this.metrics.saveDurations.length;
  }
}

export const performanceMonitor = new PerformanceMonitor();