export interface SettingsMetricsData {
  apiLatency: number[];
  saveLatency: number[];
  retryCount: number;
  failureCount: number;
  successCount: number;
}

class SettingsMetrics {
  private data: SettingsMetricsData = {
    apiLatency: [],
    saveLatency: [],
    retryCount: 0,
    failureCount: 0,
    successCount: 0,
  };

  recordApiLatency(ms: number) {
    this.data.apiLatency.push(ms);
    if (this.data.apiLatency.length > 100) this.data.apiLatency.shift();
  }

  recordSaveLatency(ms: number) {
    this.data.saveLatency.push(ms);
    if (this.data.saveLatency.length > 100) this.data.saveLatency.shift();
  }

  incrementRetry() { this.data.retryCount++; }
  incrementFailure() { this.data.failureCount++; }
  incrementSuccess() { this.data.successCount++; }

  getMetrics(): SettingsMetricsData {
    return { ...this.data };
  }
}

export const settingsMetrics = new SettingsMetrics();