// server/points/pointsCatalog.ts
// Monthly subscription plans and one-off point packs for the unified points
// system (task t177). Pure data + helpers, no database access. 1 point = $0.01.
// Plans grant a monthly point allowance; packs are additive top-ups that never
// expire. Enterprise is custom-quoted.

import { pointsToUsd } from './pointsMath.ts';

export type PointsPlanId = 'free' | 'starter' | 'pro' | 'business' | 'enterprise';

export interface PointsPlanDefinition {
	id: PointsPlanId;
	label: string;
	description: string;
	/** Monthly USD price, or null when custom-quoted (enterprise). */
	monthlyPriceUsd: number | null;
	/** Yearly USD price, or null when custom-quoted. */
	yearlyPriceUsd: number | null;
	/** Monthly point allowance granted by the plan. 0 when custom-quoted. */
	monthlyPoints: number;
	/** True when the plan is negotiated (no fixed price or allowance). */
	isCustom: boolean;
	highlights: string[];
}

export interface PointsPackDefinition {
	id: string;
	label: string;
	points: number;
	priceUsd: number;
}

export const POINTS_PLANS: readonly PointsPlanDefinition[] = [
	{
		id: 'free',
		label: 'Free',
		description: 'Explore the platform with a monthly starter allowance.',
		monthlyPriceUsd: 0,
		yearlyPriceUsd: 0,
		monthlyPoints: 300,
		isCustom: false,
		highlights: ['300 points / month', 'Product import & analysis', 'Ready templates'],
	},
	{
		id: 'starter',
		label: 'Starter',
		description: 'For solo operators running weekly AI campaigns.',
		monthlyPriceUsd: 29,
		yearlyPriceUsd: 290,
		monthlyPoints: 3500,
		isCustom: false,
		highlights: ['3,500 points / month', 'Full content studio', 'Short-form video'],
	},
	{
		id: 'pro',
		label: 'Pro',
		description: 'For brands running always-on AI acquisition.',
		monthlyPriceUsd: 79,
		yearlyPriceUsd: 790,
		monthlyPoints: 11000,
		isCustom: false,
		highlights: ['11,000 points / month', 'Advanced analytics', 'Long-form workflows'],
	},
	{
		id: 'business',
		label: 'Business',
		description: 'For teams scaling multi-brand production.',
		monthlyPriceUsd: 199,
		yearlyPriceUsd: 1990,
		monthlyPoints: 30000,
		isCustom: false,
		highlights: ['30,000 points / month', 'Higher concurrency', 'Priority support'],
	},
	{
		id: 'enterprise',
		label: 'Enterprise',
		description: 'Custom volume, controls, and support for large teams.',
		monthlyPriceUsd: null,
		yearlyPriceUsd: null,
		monthlyPoints: 0,
		isCustom: true,
		highlights: ['Custom point volume', 'Enterprise controls', 'Dedicated support'],
	},
];

export const POINTS_PACKS: readonly PointsPackDefinition[] = [
	{ id: 'pack_1k', label: '1,000 points', points: 1000, priceUsd: 12 },
	{ id: 'pack_5k', label: '5,000 points', points: 5000, priceUsd: 55 },
	{ id: 'pack_20k', label: '20,000 points', points: 20000, priceUsd: 200 },
];

export function listPlans(): readonly PointsPlanDefinition[] {
	return POINTS_PLANS;
}

export function getPlan(id: PointsPlanId): PointsPlanDefinition {
	const plan = POINTS_PLANS.find((item) => item.id === id);
	if (!plan) {
		throw new Error(`Unknown points plan: ${id}`);
	}
	return plan;
}

export function listPacks(): readonly PointsPackDefinition[] {
	return POINTS_PACKS;
}

export function getPack(id: string): PointsPackDefinition {
	const pack = POINTS_PACKS.find((item) => item.id === id);
	if (!pack) {
		throw new Error(`Unknown points pack: ${id}`);
	}
	return pack;
}

/** USD price per point for a pack; lower is a better deal. */
export function packUnitPriceUsd(pack: PointsPackDefinition): number {
	return pack.priceUsd / pack.points;
}

/** Effective USD value of a plan's monthly allowance at the base 1pt=$0.01 rate. */
export function planAllowanceUsdValue(plan: PointsPlanDefinition): number {
	return pointsToUsd(plan.monthlyPoints);
}
