import { randomUUID } from 'crypto';
import { sql } from 'drizzle-orm';
import { db } from '../../database';
import { Logger } from '../logger/Logger';

/**
 * Instrumentation for deprecated compatibility adapters (e.g.
 * server/projects/legacyImageStudioAdapter.ts).
 *
 * Per policy: no legacy adapter is deleted until telemetry confirms zero
 * calls across one full release cycle. Every call records:
 *   endpoint, workspaceId, userId, timestamp, adapter name, execution time,
 *   success/failure, and a deprecation warning — both as a structured log
 *   line (immediate visibility) and a row in `legacy_adapter_usage`
 *   (queryable history — see scripts/check-legacy-adapter-usage.ts).
 *
 * Recording is fire-and-forget and never throws into the caller: a
 * telemetry failure must never break the (already-deprecated, already
 * fragile-by-definition) code path it's observing.
 */

export interface LegacyAdapterCallRecord {
  adapterName: string;
  endpoint: string;
  workspaceId?: string | null;
  userId?: string | null;
}

async function persistUsageRecord(record: {
  adapterName: string;
  endpoint: string;
  workspaceId: string | null;
  userId: string | null;
  executionTimeMs: number;
  success: boolean;
  errorMessage: string | null;
  deprecationNotice: string;
}): Promise<void> {
  try {
    await db.execute(sql`
      INSERT INTO legacy_adapter_usage
        (id, adapter_name, endpoint, workspace_id, user_id, called_at, execution_time_ms, success, error_message, deprecation_notice)
      VALUES
        (${randomUUID()}, ${record.adapterName}, ${record.endpoint}, ${record.workspaceId}, ${record.userId}, NOW(), ${record.executionTimeMs}, ${record.success}, ${record.errorMessage}, ${record.deprecationNotice})
    `);
  } catch (err) {
    // Telemetry must never break the caller. Log and swallow.
    Logger.warn('Failed to persist legacy adapter usage telemetry', { err, record });
  }
}

/**
 * Wraps a deprecated adapter function so every call is fully logged, per
 * the fields above, without changing the function's signature or behavior
 * (including error behavior — rejections still propagate to the caller
 * after being recorded).
 */
export function instrumentLegacyAdapter<Args extends any[], Result>(
  info: LegacyAdapterCallRecord,
  fn: (...args: Args) => Promise<Result>
): (...args: Args) => Promise<Result> {
  const deprecationNotice =
    `DEPRECATED: "${info.adapterName}" (${info.endpoint}) is a compatibility shim scheduled for removal. ` +
    `Do not add new callers. See DEPENDENCY_REPORT_image_studio_projects.md.`;

  return async (...args: Args): Promise<Result> => {
    const startedAt = Date.now();
    let workspaceId: string | null = null;
    let userId: string | null = null;

    // Best-effort extraction: most legacy adapter functions take
    // (workspaceId, userId, ...) or an options object containing them.
    for (const arg of args) {
      if (typeof arg === 'object' && arg !== null) {
        if (typeof (arg as any).workspaceId === 'string') workspaceId = (arg as any).workspaceId;
        if (typeof (arg as any).userId === 'string') userId = (arg as any).userId;
      }
    }
    if (!workspaceId && typeof args[0] === 'string') workspaceId = args[0];
    if (!userId && typeof args[1] === 'string') userId = args[1];

    try {
      const result = await fn(...args);
      const executionTimeMs = Date.now() - startedAt;

      Logger.warn(deprecationNotice, {
        endpoint: info.endpoint,
        adapterName: info.adapterName,
        workspaceId,
        userId,
        timestamp: new Date(startedAt).toISOString(),
        executionTimeMs,
        success: true,
      });
      void persistUsageRecord({
        adapterName: info.adapterName,
        endpoint: info.endpoint,
        workspaceId,
        userId,
        executionTimeMs,
        success: true,
        errorMessage: null,
        deprecationNotice,
      });

      return result;
    } catch (err) {
      const executionTimeMs = Date.now() - startedAt;
      const errorMessage = err instanceof Error ? err.message : String(err);

      Logger.warn(deprecationNotice, {
        endpoint: info.endpoint,
        adapterName: info.adapterName,
        workspaceId,
        userId,
        timestamp: new Date(startedAt).toISOString(),
        executionTimeMs,
        success: false,
        errorMessage,
      });
      void persistUsageRecord({
        adapterName: info.adapterName,
        endpoint: info.endpoint,
        workspaceId,
        userId,
        executionTimeMs,
        success: false,
        errorMessage,
        deprecationNotice,
      });

      throw err;
    }
  };
}
