import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
	estimateOperationsPoints,
	pointsToUsd,
	formatUsd,
	packUnitPriceUsd,
	OPERATION_POINT_COSTS,
	SEED_PACKS,
	SEED_PLANS,
} from '../../src/features/billing/pointsCatalog.ts';

test('estimateOperationsPoints sums quantities and tts blocks', () => {
	const points = estimateOperationsPoints([
		{ kind: 'image', quantity: 2 },
		{ kind: 'video_clip' },
		{ kind: 'tts', characters: 2500 },
	]);
	// 40 + 120 + 90 = 250
	assert.equal(points, 250);
});

test('tts bills at least one started 1k block', () => {
	assert.equal(estimateOperationsPoints([{ kind: 'tts', characters: 100 }]), 30);
	assert.equal(estimateOperationsPoints([{ kind: 'tts', characters: 1200 }]), 60);
});

test('pointsToUsd and formatUsd use the 1pt=$0.01 rate', () => {
	assert.equal(pointsToUsd(2500), 25);
	assert.equal(formatUsd(pointsToUsd(2000)), '$20.00');
	assert.equal(OPERATION_POINT_COSTS.image, 20);
});

test('catalog seed has five plans and three packs, cheapest per point is the largest', () => {
	assert.equal(SEED_PLANS.length, 5);
	assert.equal(SEED_PACKS.length, 3);
	const sorted = [...SEED_PACKS].sort((a, b) => packUnitPriceUsd(a) - packUnitPriceUsd(b));
	assert.equal(sorted[0].points, 20000);
});
