type LogLevel = 'debug' | 'info' | 'warn' | 'error';

interface LogEntry {
  level: LogLevel;
  module: string;
  message: string;
  timestamp: string;
  meta?: Record<string, unknown>;
  error?: { name: string; message: string; stack?: string };
}

const LEVELS: Record<LogLevel, number> = { debug: 0, info: 1, warn: 2, error: 3 };

function configuredLevel(): LogLevel {
  const level = process.env.LOG_LEVEL as LogLevel | undefined;
  return level && LEVELS[level] !== undefined ? level : 'info';
}

/**
 * Structured JSON logger. Honors LOG_LEVEL (silent|error|warn|info|debug).
 * Each module gets its own named logger instance.
 */
class VideoLogger {
  private module: string;

  constructor(module: string) {
    this.module = module;
  }

  private shouldLog(level: LogLevel): boolean {
    if (process.env.LOG_LEVEL === 'silent') return false;
    return LEVELS[level] >= LEVELS[configuredLevel()];
  }

  private emit(level: LogLevel, message: string, meta?: Record<string, unknown>, error?: Error): void {
    if (!this.shouldLog(level)) return;

    const entry: LogEntry = {
      level,
      module: this.module,
      message,
      timestamp: new Date().toISOString(),
      meta,
    };
    if (error) {
      entry.error = { name: error.name, message: error.message, stack: error.stack };
    }

    const line = JSON.stringify(entry);
    if (level === 'error') console.error(line);
    else if (level === 'warn') console.warn(line);
    else if (level === 'debug') console.debug(line);
    else console.info(line);
  }

  debug(message: string, meta?: Record<string, unknown>): void {
    this.emit('debug', message, meta);
  }

  info(message: string, meta?: Record<string, unknown>): void {
    this.emit('info', message, meta);
  }

  warn(message: string, meta?: Record<string, unknown>): void {
    this.emit('warn', message, meta);
  }

  error(message: string, error?: Error, meta?: Record<string, unknown>): void {
    this.emit('error', message, meta, error);
  }
}

export function createVideoLogger(module: string): VideoLogger {
  return new VideoLogger(module);
}