// src/features/billing/pointsApi.ts
// Client for the points HTTP API mounted under the authenticated agent router
// (/api/agent/points). Balance and cost-preview degrade gracefully to null so
// the billing view still renders (with the seed catalog) when the endpoint is
// unavailable, e.g. before the workspace has any ledger activity.
import {
	OPERATION_POINT_COSTS,
	SEED_PACKS,
	SEED_PLANS,
	type EstimatorOperation,
	type PointsPack,
	type PointsPlan,
} from './pointsCatalog';

export interface PointsBalance {
	workspaceId: string;
	balancePoints: number;
	reservedPoints: number;
	lifetimeGranted: number;
	lifetimeSpent: number;
	lifetimeRefunded: number;
}

export interface PointsCatalogResponse {
	plans: PointsPlan[];
	packs: PointsPack[];
	operationCosts: Record<string, number>;
}

export interface CostPreviewResult {
	totalPoints: number;
	totalUsd: number;
	availablePoints: number;
	sufficient: boolean;
	shortfallPoints: number;
	balanceAfterPoints: number;
}

const JSON_HEADERS = { Accept: 'application/json' } as const;

export async function loadPointsCatalog(signal?: AbortSignal): Promise<PointsCatalogResponse> {
	const fallback: PointsCatalogResponse = {
		plans: SEED_PLANS,
		packs: SEED_PACKS,
		operationCosts: OPERATION_POINT_COSTS,
	};
	try {
		const response = await fetch('/api/agent/points/catalog', {
			signal,
			credentials: 'include',
			headers: JSON_HEADERS,
		});
		if (!response.ok) return fallback;
		const payload = (await response.json()) as { operationCosts?: Record<string, number> };
		return {
			plans: SEED_PLANS,
			packs: SEED_PACKS,
			operationCosts: payload.operationCosts ?? OPERATION_POINT_COSTS,
		};
	} catch {
		return fallback;
	}
}

export async function loadPointsBalance(signal?: AbortSignal): Promise<PointsBalance | null> {
	try {
		const response = await fetch('/api/agent/points/balance', {
			signal,
			credentials: 'include',
			headers: JSON_HEADERS,
		});
		if (!response.ok) return null;
		const payload = (await response.json()) as { balance?: PointsBalance };
		return payload.balance ?? null;
	} catch {
		return null;
	}
}

export async function previewCost(
	operations: EstimatorOperation[],
	signal?: AbortSignal,
): Promise<CostPreviewResult | null> {
	try {
		const response = await fetch('/api/agent/points/cost-preview', {
			method: 'POST',
			signal,
			credentials: 'include',
			headers: { ...JSON_HEADERS, 'Content-Type': 'application/json' },
			body: JSON.stringify({ operations }),
		});
		if (!response.ok) return null;
		const payload = (await response.json()) as { preview?: CostPreviewResult };
		return payload.preview ?? null;
	} catch {
		return null;
	}
}
