/**
 * The AI feature module (ported from Image Studio) imports a
 * `PipelineLogger` from a path that doesn't exist in this repository
 * (`services/ad-engine/utils/PipelineLogger` — a dangling reference to
 * infrastructure from the module's original, separate repo; the exact same
 * issue was found and fixed in the server-side Assets/Projects modules —
 * see server/core/logger/PipelineLogger.ts). This is the client-side
 * equivalent: a console-based logger with the same instance API
 * (`.info/.warn/.error/.debug`), so the 1 call site here didn't need
 * rewriting, just repointing.
 */
export class PipelineLogger {
  constructor(private readonly component: string) {}

  info(message: string, meta?: unknown): void {
    console.log(`[INFO] [${this.component}] ${message}`, meta ?? '');
  }

  warn(message: string, meta?: unknown): void {
    console.warn(`[WARN] [${this.component}] ${message}`, meta ?? '');
  }

  error(message: string, meta?: unknown): void {
    console.error(`[ERROR] [${this.component}] ${message}`, meta ?? '');
  }

  debug(message: string, meta?: unknown): void {
    if (process.env.NODE_ENV !== 'production') {
      console.debug(`[DEBUG] [${this.component}] ${message}`, meta ?? '');
    }
  }
}
