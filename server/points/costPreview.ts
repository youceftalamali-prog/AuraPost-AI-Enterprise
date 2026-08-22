// server/points/costPreview.ts
// Pre-generation cost preview for the points system (task t176). Pure logic: it
// converts a planned set of generation operations into a point cost and checks
// it against a workspace balance, so the UI can show the price before spending.
// Point costs mirror the provider credit costs used across the generation flows.

import { PointsError, POINTS_ERROR_INVALID_AMOUNT, pointsToUsd, type PointsState } from './pointsMath.ts';

export type GenerationOperationKind =
	| 'image'
	| 'video_clip'
	| 'avatar_video'
	| 'assembly_render'
	| 'tts';

/** Point cost per unit, mirroring the provider credit costs (1 credit = 1 point). */
export const OPERATION_POINT_COSTS = {
	image: 20,
	video_clip: 120,
	avatar_video: 40,
	assembly_render: 60,
	tts_per_1k_chars: 30,
} as const;

export interface GenerationOperation {
	kind: GenerationOperationKind;
	/** Number of units (images, clips, videos, renders). Defaults to 1. Ignored for tts. */
	quantity?: number;
	/** Character count for tts operations. Required when kind is 'tts'. */
	characters?: number;
}

export interface CostLineItem {
	kind: GenerationOperationKind;
	units: number;
	unitPoints: number;
	points: number;
}

export interface CostPreview {
	lineItems: CostLineItem[];
	totalPoints: number;
	totalUsd: number;
}

export interface GenerationAffordability extends CostPreview {
	availablePoints: number;
	sufficient: boolean;
	/** Points still needed when the balance is insufficient; 0 otherwise. */
	shortfallPoints: number;
	balanceAfterPoints: number;
}

function requirePositiveInt(value: number, message: string): number {
	if (!Number.isSafeInteger(value) || value <= 0) {
		throw new PointsError(POINTS_ERROR_INVALID_AMOUNT, message);
	}
	return value;
}

function lineItemFor(operation: GenerationOperation): CostLineItem {
	if (operation.kind === 'tts') {
		const characters = requirePositiveInt(
			operation.characters ?? 0,
			'tts operations require a positive character count.',
		);
		const blocks = Math.ceil(characters / 1000);
		const unitPoints = OPERATION_POINT_COSTS.tts_per_1k_chars;
		return { kind: 'tts', units: blocks, unitPoints, points: blocks * unitPoints };
	}
	const quantity = requirePositiveInt(
		operation.quantity ?? 1,
		'quantity must be a positive integer.',
	);
	const unitPoints = OPERATION_POINT_COSTS[operation.kind];
	return { kind: operation.kind, units: quantity, unitPoints, points: quantity * unitPoints };
}

/** Compute the point cost of a set of planned generation operations. */
export function estimateCost(operations: GenerationOperation[]): CostPreview {
	if (!Array.isArray(operations) || operations.length === 0) {
		throw new PointsError(POINTS_ERROR_INVALID_AMOUNT, 'At least one operation is required.');
	}
	const lineItems = operations.map(lineItemFor);
	const totalPoints = lineItems.reduce((sum, item) => sum + item.points, 0);
	return { lineItems, totalPoints, totalUsd: pointsToUsd(totalPoints) };
}

/** Preview a generation's cost and whether the current balance can afford it. */
export function previewGeneration(
	state: PointsState,
	operations: GenerationOperation[],
): GenerationAffordability {
	const preview = estimateCost(operations);
	const availablePoints = state.balancePoints;
	const sufficient = availablePoints >= preview.totalPoints;
	const shortfallPoints = sufficient ? 0 : preview.totalPoints - availablePoints;
	const balanceAfterPoints = sufficient ? availablePoints - preview.totalPoints : availablePoints;
	return {
		...preview,
		availablePoints,
		sufficient,
		shortfallPoints,
		balanceAfterPoints,
	};
}
