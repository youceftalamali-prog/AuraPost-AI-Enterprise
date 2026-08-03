export type LogLevel = 'error' | 'warning' | 'info' | 'debug' | 'success';

export interface LogEntry {
  id: string;
  timestamp: string;
  level: LogLevel;
  service: string;
  message: string;
  metadata?: Record<string, any>;
  stack?: string;
}