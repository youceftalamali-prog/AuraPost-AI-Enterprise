// server/points/pointsRouter.ts
// HTTP surface for the unified points system. Mounted under the authenticated
// agent router (createAuraAgentRouter), so req.workspaceId and req.user.userId
// are already populated by upstream auth middleware. Routes:
//   GET  /catalog       -> static plans + packs + operation costs (no DB)
//   GET  /balance       -> the caller's workspace points balance
//   POST /cost-preview  -> price a planned set of operations vs. the balance
// All heavy lifting lives in already-unit-tested pure modules; this file is
// thin request parsing + error mapping only.
import { Router, type Request, type Response } from 'express';
import type { Pool } from 'pg';
import { readBalance } from './pointsLedgerStore.ts';
import { listPacks, listPlans } from './pointsCatalog.ts';
import {
	previewGeneration,
	OPERATION_POINT_COSTS,
	type GenerationOperation,
	type GenerationOperationKind,
} from './costPreview.ts';
import { PointsError, pointsToUsd } from './pointsMath.ts';

type AuthenticatedRequest = Request & {
	workspaceId?: string;
	user?: { userId?: string };
};

const OPERATION_KINDS: GenerationOperationKind[] = [
	'image',
	'video_clip',
	'avatar_video',
	'assembly_render',
	'tts',
];

/** Thrown for malformed requests or missing auth context; carries an HTTP status. */
export class PointsRequestError extends Error {
	constructor(
		public readonly status: number,
		public readonly code: string,
		message: string,
	) {
		super(message);
		this.name = 'PointsRequestError';
	}
}

function requireWorkspace(req: AuthenticatedRequest): string {
	const workspaceId = req.workspaceId;
	if (!workspaceId) {
		throw new PointsRequestError(
			401,
			'POINTS_AUTH_CONTEXT_MISSING',
			'Authenticated workspace context is required.',
		);
	}
	return workspaceId;
}

/** Parse and validate a cost-preview request body into typed operations. */
export function normalizeOperations(body: unknown): GenerationOperation[] {
	const raw = (body as { operations?: unknown } | null | undefined)?.operations;
	if (!Array.isArray(raw) || raw.length === 0) {
		throw new PointsRequestError(
			400,
			'POINTS_INVALID_OPERATIONS',
			'operations must be a non-empty array.',
		);
	}
	return raw.map((item, index) => {
		const record = (item ?? {}) as Record<string, unknown>;
		const kind = record.kind;
		if (typeof kind !== 'string' || !OPERATION_KINDS.includes(kind as GenerationOperationKind)) {
			throw new PointsRequestError(
				400,
				'POINTS_INVALID_OPERATIONS',
				`operations[${index}].kind is invalid.`,
			);
		}
		const operation: GenerationOperation = { kind: kind as GenerationOperationKind };
		if (record.quantity !== undefined) operation.quantity = Number(record.quantity);
		if (record.characters !== undefined) operation.characters = Number(record.characters);
		return operation;
	});
}

function sendError(res: Response, error: unknown) {
	if (error instanceof PointsRequestError) {
		return res.status(error.status).json({ error: error.message, code: error.code });
	}
	if (error instanceof PointsError) {
		return res.status(400).json({ error: error.message, code: error.code });
	}
	throw error;
}

export function createAuraPointsRouter(pool: Pool): Router {
	const router = Router();

	router.get('/catalog', (_req, res) => {
		res.json({
			unit: { pointsPerUsd: 100, usdPerPoint: pointsToUsd(1) },
			plans: listPlans(),
			packs: listPacks(),
			operationCosts: OPERATION_POINT_COSTS,
		});
	});

	router.get('/balance', async (req: AuthenticatedRequest, res) => {
		try {
			const workspaceId = requireWorkspace(req);
			const balance = await readBalance(pool, workspaceId);
			return res.json({ balance });
		} catch (error) {
			return sendError(res, error);
		}
	});

	router.post('/cost-preview', async (req: AuthenticatedRequest, res) => {
		try {
			const workspaceId = requireWorkspace(req);
			const operations = normalizeOperations(req.body);
			const balance = await readBalance(pool, workspaceId);
			const preview = previewGeneration(
				{ balancePoints: balance.balancePoints, reservedPoints: balance.reservedPoints },
				operations,
			);
			return res.json({ preview });
		} catch (error) {
			return sendError(res, error);
		}
	});

	return router;
}
