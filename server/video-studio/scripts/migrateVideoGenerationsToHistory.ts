import { DatabaseManager } from '../../db.js';
import { createVideoLogger } from '../utils/videoLogger.js';

const logger = createVideoLogger('MigrateVideoHistory');

/**
 * One-off, idempotent data migration: copies rows from the old, pre-merge
 * `video_generations` table (raw-SQL era) into the new `video_history` table
 * (Video Studio module, Drizzle-managed) so existing render history isn't
 * lost after the module swap.
 *
 * Honest scope note: `video_generations` has no `user_id` column (it was
 * only ever workspace-scoped), but `video_history.user_id` is NOT NULL. This
 * script resolves each workspace's owner (workspace_members.role = 'owner')
 * as the best available attribution and records that mapping choice in the
 * log. Workspaces with no resolvable owner are skipped and reported at the
 * end for manual review rather than guessed at.
 *
 * Does NOT migrate provider API keys/settings (workspace_ai_providers →
 * Video Studio provider config) - that involves AuraPost's existing
 * encryption scheme and is intentionally left as a manual step: reconnect
 * providers via the new Providers panel instead of attempting an automated
 * re-encryption that could silently corrupt keys.
 *
 * Safe to re-run: uses a NOT EXISTS guard keyed on the source row id stashed
 * in video_history's platform+created_at+video_url triple isn't reliable
 * enough, so this migration instead tags migrated rows via a dedicated
 * marker table to guarantee idempotency.
 */
async function run(): Promise<void> {
  const dbManager = await DatabaseManager.getInstance();
  const pool = dbManager.getPool();

  await pool.query(`
    CREATE TABLE IF NOT EXISTS video_history_migration_log (
      source_id TEXT PRIMARY KEY,
      migrated_at TIMESTAMPTZ NOT NULL DEFAULT now()
    );
  `);

  const { rows: sourceRows } = await pool.query(`
    SELECT vg.*
    FROM video_generations vg
    LEFT JOIN video_history_migration_log log ON log.source_id = vg.id
    WHERE log.source_id IS NULL
      AND vg.status = 'completed'
      AND (vg.video_url IS NOT NULL OR vg.download_url IS NOT NULL)
    ORDER BY vg.created_at ASC;
  `);

  logger.info(`Found ${sourceRows.length} video_generations row(s) to migrate.`);

  let migrated = 0;
  const skippedWorkspaces = new Set<string>();

  for (const row of sourceRows) {
    const { rows: ownerRows } = await pool.query(
      `SELECT user_id FROM workspace_members WHERE workspace_id = $1 AND role = 'owner' ORDER BY created_at ASC LIMIT 1`,
      [row.workspace_id]
    );

    if (ownerRows.length === 0) {
      skippedWorkspaces.add(row.workspace_id);
      continue;
    }

    const ownerUserId = ownerRows[0].user_id;

    await pool.query(
      `INSERT INTO video_history
        (job_id, user_id, workspace_id, product_id, video_url, thumbnail_url, title, provider, estimated_cost, is_favorite, created_at)
       VALUES
        (NULL, $1, $2, $3, $4, $5, $6, $7, $8, false, $9)`,
      [
        ownerUserId,
        row.workspace_id,
        row.product_id,
        row.video_url ?? row.download_url,
        row.thumbnail_url,
        row.title,
        row.provider,
        row.credits_used ?? null,
        row.created_at,
      ]
    );

    await pool.query(`INSERT INTO video_history_migration_log (source_id) VALUES ($1)`, [row.id]);
    migrated++;
  }

  logger.info('Migration complete', {
    migrated,
    skipped: sourceRows.length - migrated,
    skippedWorkspaces: [...skippedWorkspaces],
  });
  console.log(
    `Migrated ${migrated}/${sourceRows.length} video_generations rows into video_history.` +
      (skippedWorkspaces.size > 0
        ? ` Skipped workspaces with no resolvable owner: ${[...skippedWorkspaces].join(', ')}`
        : '')
  );
  process.exit(0);
}

run().catch((error) => {
  logger.error('Migration failed', error as Error);
  console.error('Migration failed:', error);
  process.exit(1);
});
