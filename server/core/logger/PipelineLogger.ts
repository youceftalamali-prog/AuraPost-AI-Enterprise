import { Logger } from './Logger';

/**
 * The Assets and Projects modules (ported from Image Studio) import a
 * `PipelineLogger` class from a path that doesn't exist anywhere in this
 * repository (`services/ad-engine/utils/PipelineLogger` — a dangling
 * reference to infrastructure from the module's original, separate repo).
 * All 23 call sites use it as `new PipelineLogger('ComponentName')` with
 * instance methods `.info/.warn/.error/.debug`.
 *
 * Rather than rewrite every call site, this shim reproduces that exact
 * instance API and delegates to the app's real static `Logger`
 * (server/core/logger/Logger.ts), prefixing messages with the component
 * name so log output stays as informative as the original intent.
 */
export class PipelineLogger {
  constructor(private readonly component: string) {}

  info(message: string, meta?: unknown): void {
    Logger.info(`[${this.component}] ${message}`, meta);
  }

  warn(message: string, meta?: unknown): void {
    Logger.warn(`[${this.component}] ${message}`, meta);
  }

  error(message: string, meta?: unknown): void {
    Logger.error(`[${this.component}] ${message}`, meta);
  }

  debug(message: string, meta?: unknown): void {
    Logger.debug(`[${this.component}] ${message}`, meta);
  }
}
