import { test } from 'node:test';
import assert from 'node:assert/strict';
import { normalizeOperations, PointsRequestError } from '../../server/points/pointsRouter.ts';

test('normalizeOperations parses a valid operation list', () => {
	const ops = normalizeOperations({
		operations: [
			{ kind: 'image', quantity: 2 },
			{ kind: 'tts', characters: 1500 },
		],
	});
	assert.equal(ops.length, 2);
	assert.deepEqual(ops[0], { kind: 'image', quantity: 2 });
	assert.equal(ops[1].kind, 'tts');
	assert.equal(ops[1].characters, 1500);
});

test('normalizeOperations rejects an empty or non-array payload', () => {
	assert.throws(
		() => normalizeOperations({}),
		(e) => e instanceof PointsRequestError && e.status === 400,
	);
	assert.throws(
		() => normalizeOperations({ operations: [] }),
		(e) => e instanceof PointsRequestError,
	);
});

test('normalizeOperations rejects an unknown operation kind', () => {
	assert.throws(
		() => normalizeOperations({ operations: [{ kind: 'hologram' }] }),
		(e) => e instanceof PointsRequestError && e.code === 'POINTS_INVALID_OPERATIONS',
	);
});
