import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
	POINTS_SCHEMA_SQL,
	POINTS_SCHEMA_CHECKSUM,
	POINTS_SCHEMA_MIGRATION_ID,
	POINTS_SCHEMA_DESCRIPTION,
} from '../../server/points/pointsSchema.ts';

test('migration id and description are stable', () => {
	assert.equal(POINTS_SCHEMA_MIGRATION_ID, '016_workspace_points');
	assert.equal(typeof POINTS_SCHEMA_DESCRIPTION, 'string');
	assert.ok(POINTS_SCHEMA_DESCRIPTION.length > 0);
});

test('schema creates both points tables', () => {
	assert.match(POINTS_SCHEMA_SQL, /CREATE TABLE IF NOT EXISTS workspace_points_balance/);
	assert.match(POINTS_SCHEMA_SQL, /CREATE TABLE IF NOT EXISTS workspace_points_ledger/);
});

test('balance table guards against negative balances', () => {
	assert.match(POINTS_SCHEMA_SQL, /CHECK\(balance_points>=0\)/);
	assert.match(POINTS_SCHEMA_SQL, /CHECK\(reserved_points>=0\)/);
});

test('ledger enforces idempotency per workspace', () => {
	assert.match(
		POINTS_SCHEMA_SQL,
		/CREATE UNIQUE INDEX IF NOT EXISTS idx_workspace_points_ledger_idem ON workspace_points_ledger\(workspace_id,idempotency_key\) WHERE idempotency_key IS NOT NULL/,
	);
});

test('checksum is a 64-character sha-256 hex digest', () => {
	assert.match(POINTS_SCHEMA_CHECKSUM, /^[0-9a-f]{64}$/);
});
