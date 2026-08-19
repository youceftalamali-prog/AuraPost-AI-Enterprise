import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
	estimateCost,
	previewGeneration,
	OPERATION_POINT_COSTS,
	POINTS_ERROR_INVALID_AMOUNT,
} from '../../server/points/costPreview.ts';
import { PointsError } from '../../server/points/pointsMath.ts';

test('a single image costs its unit price', () => {
	const preview = estimateCost([{ kind: 'image' }]);
	assert.equal(preview.totalPoints, OPERATION_POINT_COSTS.image);
	assert.equal(preview.totalPoints, 20);
	assert.equal(preview.totalUsd, 0.2);
});

test('quantity multiplies the unit cost', () => {
	const preview = estimateCost([{ kind: 'image', quantity: 3 }]);
	assert.equal(preview.totalPoints, 60);
	assert.equal(preview.lineItems[0].units, 3);
});

test('tts is billed per started 1k characters', () => {
	const preview = estimateCost([{ kind: 'tts', characters: 2500 }]);
	assert.equal(preview.lineItems[0].units, 3);
	assert.equal(preview.totalPoints, 90);
});

test('a mixed production sums every line item', () => {
	const preview = estimateCost([
		{ kind: 'image', quantity: 2 },
		{ kind: 'video_clip', quantity: 1 },
		{ kind: 'avatar_video' },
		{ kind: 'assembly_render' },
		{ kind: 'tts', characters: 1200 },
	]);
	// 40 + 120 + 40 + 60 + 60 = 320
	assert.equal(preview.totalPoints, 320);
	assert.equal(preview.lineItems.length, 5);
});

test('previewGeneration reports an affordable request', () => {
	const result = previewGeneration({ balancePoints: 500, reservedPoints: 0 }, [
		{ kind: 'video_clip', quantity: 2 },
	]);
	assert.equal(result.totalPoints, 240);
	assert.equal(result.sufficient, true);
	assert.equal(result.shortfallPoints, 0);
	assert.equal(result.balanceAfterPoints, 260);
});

test('previewGeneration reports a shortfall when the balance is too low', () => {
	const result = previewGeneration({ balancePoints: 100, reservedPoints: 0 }, [
		{ kind: 'video_clip', quantity: 2 },
	]);
	assert.equal(result.sufficient, false);
	assert.equal(result.shortfallPoints, 140);
	assert.equal(result.balanceAfterPoints, 100);
});

test('invalid quantities and empty plans are rejected', () => {
	assert.throws(
		() => estimateCost([]),
		(e) => e instanceof PointsError && e.code === POINTS_ERROR_INVALID_AMOUNT,
	);
	assert.throws(
		() => estimateCost([{ kind: 'image', quantity: 0 }]),
		(e) => e instanceof PointsError && e.code === POINTS_ERROR_INVALID_AMOUNT,
	);
	assert.throws(
		() => estimateCost([{ kind: 'tts' }]),
		(e) => e instanceof PointsError && e.code === POINTS_ERROR_INVALID_AMOUNT,
	);
});
