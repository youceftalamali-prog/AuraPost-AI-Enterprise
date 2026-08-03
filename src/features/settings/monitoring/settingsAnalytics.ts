export type AnalyticsEvent = 
  | 'module_opened' 
  | 'module_closed' 
  | 'save' 
  | 'cancel' 
  | 'retry' 
  | 'permission_denied' 
  | 'api_failure' 
  | 'validation_error';

export interface AnalyticsPayload {
  event: AnalyticsEvent;
  module?: string;
  details?: Record<string, any>;
  timestamp: string;
}

class SettingsAnalytics {
  private queue: AnalyticsPayload[] = [];

  track(event: AnalyticsEvent, module?: string, details?: Record<string, any>) {
    const payload: AnalyticsPayload = {
      event,
      module,
      details,
      timestamp: new Date().toISOString(),
    };
    this.queue.push(payload);
  }

  getQueue(): AnalyticsPayload[] {
    return [...this.queue];
  }

  flush() {
    this.queue = [];
  }
}

export const settingsAnalytics = new SettingsAnalytics();