// server/points/pointsSchema.ts
// Self-contained migration for the unified points system (task t174).
// Introduces workspace_points_balance and workspace_points_ledger, which replace
// the legacy workspace_credit_pools model. Registered under the shared
// aura_schema_migrations registry (id 016) and applied lazily exactly once per
// process via ensurePointsSchema(), so it runs without editing the large
// migration monolith. All statements use IF NOT EXISTS and are idempotent.

import crypto from 'node:crypto';
import type { Pool, PoolClient } from 'pg';

export const POINTS_SCHEMA_MIGRATION_ID = '016_workspace_points';
export const POINTS_SCHEMA_DESCRIPTION =
	'Workspace points balance and ledger for reserve-then-debit billing';

export const POINTS_SCHEMA_SQL = `CREATE TABLE IF NOT EXISTS workspace_points_balance(workspace_id TEXT PRIMARY KEY REFERENCES workspaces(id) ON DELETE CASCADE,balance_points BIGINT NOT NULL DEFAULT 0,reserved_points BIGINT NOT NULL DEFAULT 0,lifetime_granted BIGINT NOT NULL DEFAULT 0,lifetime_spent BIGINT NOT NULL DEFAULT 0,lifetime_refunded BIGINT NOT NULL DEFAULT 0,updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),CONSTRAINT chk_workspace_points_balance_nonneg CHECK(balance_points>=0),CONSTRAINT chk_workspace_points_reserved_nonneg CHECK(reserved_points>=0));
CREATE TABLE IF NOT EXISTS workspace_points_ledger(id TEXT PRIMARY KEY,workspace_id TEXT NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,user_id TEXT REFERENCES users(id) ON DELETE SET NULL,entry_type TEXT NOT NULL,points BIGINT NOT NULL,reserved_delta BIGINT NOT NULL DEFAULT 0,balance_after BIGINT NOT NULL,reserved_after BIGINT NOT NULL,reason TEXT NOT NULL DEFAULT '',reference_type TEXT,reference_id TEXT,idempotency_key TEXT,metadata JSONB NOT NULL DEFAULT '{}'::jsonb,created_at TIMESTAMPTZ NOT NULL DEFAULT NOW());
CREATE UNIQUE INDEX IF NOT EXISTS idx_workspace_points_ledger_idem ON workspace_points_ledger(workspace_id,idempotency_key) WHERE idempotency_key IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_workspace_points_ledger_recent ON workspace_points_ledger(workspace_id,created_at DESC);
CREATE INDEX IF NOT EXISTS idx_workspace_points_ledger_reference ON workspace_points_ledger(reference_type,reference_id) WHERE reference_type IS NOT NULL;`;

function digest(sql: string): string {
	return crypto.createHash('sha256').update(sql).digest('hex');
}

export const POINTS_SCHEMA_CHECKSUM = digest(POINTS_SCHEMA_SQL);

async function applyMigration(pool: Pool): Promise<void> {
	const client: PoolClient = await pool.connect();
	try {
		await client.query('BEGIN');
		await client.query("SELECT pg_advisory_xact_lock(hashtext('aurapost:aura-schema-migrations'))");
		await client.query(
			'CREATE TABLE IF NOT EXISTS aura_schema_migrations(id TEXT PRIMARY KEY,description TEXT NOT NULL,checksum TEXT NOT NULL,applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW())',
		);
		const existing = (
			await client.query<{ checksum: string }>(
				'SELECT checksum FROM aura_schema_migrations WHERE id=$1 LIMIT 1',
				[POINTS_SCHEMA_MIGRATION_ID],
			)
		).rows[0];
		if (existing) {
			if (existing.checksum !== POINTS_SCHEMA_CHECKSUM) {
				throw new Error(`Aura migration checksum mismatch: ${POINTS_SCHEMA_MIGRATION_ID}`);
			}
		} else {
			await client.query(POINTS_SCHEMA_SQL);
			await client.query(
				'INSERT INTO aura_schema_migrations(id,description,checksum) VALUES($1,$2,$3)',
				[POINTS_SCHEMA_MIGRATION_ID, POINTS_SCHEMA_DESCRIPTION, POINTS_SCHEMA_CHECKSUM],
			);
		}
		await client.query('COMMIT');
	} catch (error) {
		await client.query('ROLLBACK');
		throw error;
	} finally {
		client.release();
	}
}

/** Run the points schema migration immediately (idempotent). */
export function runPointsSchemaMigration(pool: Pool): Promise<void> {
	return applyMigration(pool);
}

let migrationPromise: Promise<void> | null = null;

/** Ensure the points schema exists exactly once per process; safe to call often. */
export function ensurePointsSchema(pool: Pool): Promise<void> {
	if (!migrationPromise) {
		migrationPromise = applyMigration(pool).catch((error) => {
			migrationPromise = null;
			throw error;
		});
	}
	return migrationPromise;
}
