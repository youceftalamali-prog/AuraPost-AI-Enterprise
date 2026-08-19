// server/points/pointsLedgerStore.ts
// Transactional persistence for the reserve-then-debit points engine (task t175).
// Uses SELECT ... FOR UPDATE row locking so concurrent generations can never
// drive a workspace balance negative. All arithmetic is delegated to the pure
// pointsMath module; this layer only handles the database and idempotency.

import crypto from 'node:crypto';
import type { Pool, PoolClient } from 'pg';
import { ensurePointsSchema } from './pointsSchema.ts';
import {
	reserve,
	commit,
	release,
	grant,
	refund,
	type PointsMutation,
	type PointsState,
	PointsError,
	POINTS_ERROR_INVALID_STATE,
} from './pointsMath.ts';

export interface PointsBalanceRecord extends PointsState {
	workspaceId: string;
	lifetimeGranted: number;
	lifetimeSpent: number;
	lifetimeRefunded: number;
}

export interface LedgerContext {
	userId?: string | null;
	reason?: string;
	referenceType?: string | null;
	referenceId?: string | null;
	idempotencyKey?: string | null;
	metadata?: Record<string, unknown>;
}

export interface ApplyResult {
	mutation: PointsMutation;
	balance: PointsBalanceRecord;
	ledgerId: string;
	idempotentReplay: boolean;
}

interface BalanceRow {
	workspace_id: string;
	balance_points: string | number;
	reserved_points: string | number;
	lifetime_granted: string | number;
	lifetime_spent: string | number;
	lifetime_refunded: string | number;
}

function toInt(value: string | number): number {
	const n = typeof value === 'string' ? Number.parseInt(value, 10) : value;
	if (!Number.isSafeInteger(n)) {
		throw new PointsError(POINTS_ERROR_INVALID_STATE, 'Stored points value is not a safe integer.');
	}
	return n;
}

function mapRow(row: BalanceRow): PointsBalanceRecord {
	return {
		workspaceId: row.workspace_id,
		balancePoints: toInt(row.balance_points),
		reservedPoints: toInt(row.reserved_points),
		lifetimeGranted: toInt(row.lifetime_granted),
		lifetimeSpent: toInt(row.lifetime_spent),
		lifetimeRefunded: toInt(row.lifetime_refunded),
	};
}

const BALANCE_COLUMNS =
	'workspace_id,balance_points,reserved_points,lifetime_granted,lifetime_spent,lifetime_refunded';

export async function readBalance(pool: Pool, workspaceId: string): Promise<PointsBalanceRecord> {
	await ensurePointsSchema(pool);
	const { rows } = await pool.query<BalanceRow>(
		`SELECT ${BALANCE_COLUMNS} FROM workspace_points_balance WHERE workspace_id=$1`,
		[workspaceId],
	);
	if (!rows[0]) {
		return {
			workspaceId,
			balancePoints: 0,
			reservedPoints: 0,
			lifetimeGranted: 0,
			lifetimeSpent: 0,
			lifetimeRefunded: 0,
		};
	}
	return mapRow(rows[0]);
}

async function lockBalance(client: PoolClient, workspaceId: string): Promise<PointsBalanceRecord> {
	await client.query(
		'INSERT INTO workspace_points_balance(workspace_id) VALUES($1) ON CONFLICT (workspace_id) DO NOTHING',
		[workspaceId],
	);
	const { rows } = await client.query<BalanceRow>(
		`SELECT ${BALANCE_COLUMNS} FROM workspace_points_balance WHERE workspace_id=$1 FOR UPDATE`,
		[workspaceId],
	);
	return mapRow(rows[0]);
}

async function findExistingLedger(
	client: PoolClient,
	workspaceId: string,
	idempotencyKey: string,
): Promise<string | null> {
	const { rows } = await client.query<{ id: string }>(
		'SELECT id FROM workspace_points_ledger WHERE workspace_id=$1 AND idempotency_key=$2 LIMIT 1',
		[workspaceId, idempotencyKey],
	);
	return rows[0] ? rows[0].id : null;
}

type MutationFactory = (state: PointsState) => PointsMutation;

async function applyMutation(
	pool: Pool,
	workspaceId: string,
	factory: MutationFactory,
	context: LedgerContext,
): Promise<ApplyResult> {
	await ensurePointsSchema(pool);
	const client: PoolClient = await pool.connect();
	try {
		await client.query('BEGIN');
		if (context.idempotencyKey) {
			const existingId = await findExistingLedger(client, workspaceId, context.idempotencyKey);
			if (existingId) {
				const balance = await lockBalance(client, workspaceId);
				await client.query('COMMIT');
				return {
					mutation: {
						entryType: 'adjust',
						points: 0,
						reservedDelta: 0,
						next: {
							balancePoints: balance.balancePoints,
							reservedPoints: balance.reservedPoints,
						},
					},
					balance,
					ledgerId: existingId,
					idempotentReplay: true,
				};
			}
		}
		const current = await lockBalance(client, workspaceId);
		const mutation = factory({
			balancePoints: current.balancePoints,
			reservedPoints: current.reservedPoints,
		});
		const ledgerId = crypto.randomUUID();
		const grantedDelta = mutation.entryType === 'grant' ? mutation.points : 0;
		const refundedDelta = mutation.entryType === 'refund' ? mutation.points : 0;
		// On commit the reservedDelta is negative; the committed points are spent.
		const spentDelta = mutation.entryType === 'commit' ? -mutation.reservedDelta : 0;
		await client.query(
			`UPDATE workspace_points_balance SET balance_points=$2,reserved_points=$3,lifetime_granted=lifetime_granted+$4,lifetime_spent=lifetime_spent+$5,lifetime_refunded=lifetime_refunded+$6,updated_at=NOW() WHERE workspace_id=$1`,
			[
				workspaceId,
				mutation.next.balancePoints,
				mutation.next.reservedPoints,
				grantedDelta,
				spentDelta,
				refundedDelta,
			],
		);
		await client.query(
			`INSERT INTO workspace_points_ledger(id,workspace_id,user_id,entry_type,points,reserved_delta,balance_after,reserved_after,reason,reference_type,reference_id,idempotency_key,metadata) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13::jsonb)`,
			[
				ledgerId,
				workspaceId,
				context.userId ?? null,
				mutation.entryType,
				mutation.points,
				mutation.reservedDelta,
				mutation.next.balancePoints,
				mutation.next.reservedPoints,
				context.reason ?? '',
				context.referenceType ?? null,
				context.referenceId ?? null,
				context.idempotencyKey ?? null,
				JSON.stringify(context.metadata ?? {}),
			],
		);
		const balance = await lockBalance(client, workspaceId);
		await client.query('COMMIT');
		return { mutation, balance, ledgerId, idempotentReplay: false };
	} catch (error) {
		await client.query('ROLLBACK');
		throw error;
	} finally {
		client.release();
	}
}

/** Hold points for a pending generation. Throws POINTS_INSUFFICIENT if too low. */
export function reservePoints(
	pool: Pool,
	workspaceId: string,
	amount: number,
	context: LedgerContext = {},
): Promise<ApplyResult> {
	return applyMutation(pool, workspaceId, (state) => reserve(state, amount), {
		...context,
		reason: context.reason ?? 'reserve',
	});
}

/** Consume a reservation permanently after a generation succeeds. */
export function commitPoints(
	pool: Pool,
	workspaceId: string,
	amount: number,
	context: LedgerContext = {},
): Promise<ApplyResult> {
	return applyMutation(pool, workspaceId, (state) => commit(state, amount), {
		...context,
		reason: context.reason ?? 'commit',
	});
}

/** Return a reservation to the available balance after a failure or cancel. */
export function releasePoints(
	pool: Pool,
	workspaceId: string,
	amount: number,
	context: LedgerContext = {},
): Promise<ApplyResult> {
	return applyMutation(pool, workspaceId, (state) => release(state, amount), {
		...context,
		reason: context.reason ?? 'release',
	});
}

/** Add points from a plan grant, pack purchase, or bonus. */
export function grantPoints(
	pool: Pool,
	workspaceId: string,
	amount: number,
	context: LedgerContext = {},
): Promise<ApplyResult> {
	return applyMutation(pool, workspaceId, (state) => grant(state, amount), {
		...context,
		reason: context.reason ?? 'grant',
	});
}

/** Return already-committed points (e.g. a post-hoc correction). */
export function refundPoints(
	pool: Pool,
	workspaceId: string,
	amount: number,
	context: LedgerContext = {},
): Promise<ApplyResult> {
	return applyMutation(pool, workspaceId, (state) => refund(state, amount), {
		...context,
		reason: context.reason ?? 'refund',
	});
}
