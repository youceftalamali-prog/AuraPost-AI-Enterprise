// src/features/billing/pointsCatalog.ts
// Frontend seed catalog + pure helpers for the points/billing view. Mirrors the
// server modules (server/points/pointsCatalog.ts + costPreview.ts) so the UI
// always renders even before the /api/agent/points endpoints respond. The base
// rate is 1 point = $0.01. Plans/packs here are static marketing data; the live
// balance and authoritative cost preview come from the API.
import type { AgentLocale } from '../agent-shell/types';

export type PointsPlanId = 'free' | 'starter' | 'pro' | 'business' | 'enterprise';

export interface PointsPlan {
	id: PointsPlanId;
	label: string;
	monthlyPriceUsd: number | null;
	yearlyPriceUsd: number | null;
	monthlyPoints: number;
	isCustom: boolean;
	highlights: Record<AgentLocale, string[]>;
}

export interface PointsPack {
	id: string;
	label: string;
	points: number;
	priceUsd: number;
}

export type GenerationOperationKind =
	| 'image'
	| 'video_clip'
	| 'avatar_video'
	| 'assembly_render'
	| 'tts';

export const OPERATION_POINT_COSTS: Record<string, number> = {
	image: 20,
	video_clip: 120,
	avatar_video: 40,
	assembly_render: 60,
	tts_per_1k_chars: 30,
};

export const USD_PER_POINT = 0.01;

export const SEED_PLANS: PointsPlan[] = [
	{
		id: 'free',
		label: 'Free',
		monthlyPriceUsd: 0,
		yearlyPriceUsd: 0,
		monthlyPoints: 300,
		isCustom: false,
		highlights: {
			ar: ['300 نقطة شهريًا', 'استيراد وتحليل المنتجات', 'القوالب الجاهزة'],
			fr: ['300 points / mois', 'Import & analyse produit', 'Modèles prêts'],
			en: ['300 points / month', 'Product import & analysis', 'Ready templates'],
		},
	},
	{
		id: 'starter',
		label: 'Starter',
		monthlyPriceUsd: 29,
		yearlyPriceUsd: 290,
		monthlyPoints: 3500,
		isCustom: false,
		highlights: {
			ar: ['3,500 نقطة شهريًا', 'استوديو محتوى كامل', 'فيديو قصير'],
			fr: ['3 500 points / mois', 'Studio de contenu complet', 'Vidéo courte'],
			en: ['3,500 points / month', 'Full content studio', 'Short-form video'],
		},
	},
	{
		id: 'pro',
		label: 'Pro',
		monthlyPriceUsd: 79,
		yearlyPriceUsd: 790,
		monthlyPoints: 11000,
		isCustom: false,
		highlights: {
			ar: ['11,000 نقطة شهريًا', 'تحليلات متقدمة', 'تدفقات طويلة'],
			fr: ['11 000 points / mois', 'Analytique avancée', 'Workflows longs'],
			en: ['11,000 points / month', 'Advanced analytics', 'Long-form workflows'],
		},
	},
	{
		id: 'business',
		label: 'Business',
		monthlyPriceUsd: 199,
		yearlyPriceUsd: 1990,
		monthlyPoints: 30000,
		isCustom: false,
		highlights: {
			ar: ['30,000 نقطة شهريًا', 'تزامن أعلى', 'دعم ذو أولوية'],
			fr: ['30 000 points / mois', 'Concurrence accrue', 'Support prioritaire'],
			en: ['30,000 points / month', 'Higher concurrency', 'Priority support'],
		},
	},
	{
		id: 'enterprise',
		label: 'Enterprise',
		monthlyPriceUsd: null,
		yearlyPriceUsd: null,
		monthlyPoints: 0,
		isCustom: true,
		highlights: {
			ar: ['حجم نقاط مخصص', 'ضوابط للمؤسسات', 'دعم مخصص'],
			fr: ['Volume de points sur mesure', 'Contrôles entreprise', 'Support dédié'],
			en: ['Custom point volume', 'Enterprise controls', 'Dedicated support'],
		},
	},
];

export const SEED_PACKS: PointsPack[] = [
	{ id: 'pack_1k', label: '1,000', points: 1000, priceUsd: 12 },
	{ id: 'pack_5k', label: '5,000', points: 5000, priceUsd: 55 },
	{ id: 'pack_20k', label: '20,000', points: 20000, priceUsd: 200 },
];

export function formatPoints(points: number): string {
	return new Intl.NumberFormat('en-US').format(points);
}

export function formatUsd(usd: number): string {
	return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(usd);
}

export function pointsToUsd(points: number): number {
	return Math.round(points * USD_PER_POINT * 100) / 100;
}

export function packUnitPriceUsd(pack: PointsPack): number {
	return pack.priceUsd / pack.points;
}

export interface EstimatorOperation {
	kind: GenerationOperationKind;
	quantity?: number;
	characters?: number;
}

/** Live client-side point estimate mirroring the server cost preview. */
export function estimateOperationsPoints(operations: EstimatorOperation[]): number {
	return operations.reduce((sum, op) => {
		if (op.kind === 'tts') {
			const blocks = Math.max(1, Math.ceil((op.characters ?? 0) / 1000));
			return sum + blocks * OPERATION_POINT_COSTS.tts_per_1k_chars;
		}
		const quantity = Math.max(1, op.quantity ?? 1);
		return sum + quantity * (OPERATION_POINT_COSTS[op.kind] ?? 0);
	}, 0);
}
