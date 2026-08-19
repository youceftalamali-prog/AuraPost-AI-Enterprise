import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
	reserve,
	commit,
	release,
	grant,
	refund,
	settleReservation,
	usdToPoints,
	pointsToUsd,
	PointsError,
	POINTS_ERROR_INSUFFICIENT,
	POINTS_ERROR_INVALID_AMOUNT,
	POINTS_ERROR_RESERVATION_EXCEEDED,
	POINTS_ERROR_INVALID_STATE,
	USD_CENTS_PER_POINT,
} from '../../server/points/pointsMath.ts';

test('1 point equals 1 USD cent', () => {
	assert.equal(USD_CENTS_PER_POINT, 1);
	assert.equal(usdToPoints(1), 100);
	assert.equal(usdToPoints(0.01), 1);
	assert.equal(usdToPoints(29), 2900);
	assert.equal(pointsToUsd(100), 1);
	assert.equal(pointsToUsd(3500), 35);
});

test('reserve moves points from balance into reservation', () => {
	const m = reserve({ balancePoints: 100, reservedPoints: 0 }, 30);
	assert.equal(m.entryType, 'reserve');
	assert.equal(m.points, -30);
	assert.equal(m.reservedDelta, 30);
	assert.deepEqual(m.next, { balancePoints: 70, reservedPoints: 30 });
});

test('reserve refuses to overspend the available balance', () => {
	assert.throws(
		() => reserve({ balancePoints: 10, reservedPoints: 0 }, 11),
		(e) => e instanceof PointsError && e.code === POINTS_ERROR_INSUFFICIENT,
	);
});

test('reserve rejects non-positive and fractional amounts', () => {
	for (const bad of [0, -5, 2.5, Number.NaN]) {
		assert.throws(
			() => reserve({ balancePoints: 100, reservedPoints: 0 }, bad),
			(e) => e instanceof PointsError && e.code === POINTS_ERROR_INVALID_AMOUNT,
		);
	}
});

test('commit consumes reserved points without touching the balance', () => {
	const m = commit({ balancePoints: 70, reservedPoints: 30 }, 30);
	assert.equal(m.points, 0);
	assert.equal(m.reservedDelta, -30);
	assert.deepEqual(m.next, { balancePoints: 70, reservedPoints: 0 });
});

test('commit cannot exceed the reservation', () => {
	assert.throws(
		() => commit({ balancePoints: 70, reservedPoints: 30 }, 31),
		(e) => e instanceof PointsError && e.code === POINTS_ERROR_RESERVATION_EXCEEDED,
	);
});

test('release returns reserved points to the balance', () => {
	const m = release({ balancePoints: 70, reservedPoints: 30 }, 30);
	assert.equal(m.points, 30);
	assert.equal(m.reservedDelta, -30);
	assert.deepEqual(m.next, { balancePoints: 100, reservedPoints: 0 });
});

test('grant and refund credit the available balance', () => {
	assert.deepEqual(grant({ balancePoints: 0, reservedPoints: 0 }, 3500).next, {
		balancePoints: 3500,
		reservedPoints: 0,
	});
	assert.deepEqual(refund({ balancePoints: 10, reservedPoints: 5 }, 20).next, {
		balancePoints: 30,
		reservedPoints: 5,
	});
});

test('settleReservation commits the actual cost and releases the remainder', () => {
	const settlement = settleReservation({ balancePoints: 70, reservedPoints: 30 }, 30, 18);
	assert.equal(settlement.commitAmount, 18);
	assert.equal(settlement.releaseAmount, 12);
	assert.equal(settlement.mutations.length, 2);
	assert.deepEqual(settlement.next, { balancePoints: 82, reservedPoints: 0 });
});

test('settleReservation with a zero actual releases the whole reservation', () => {
	const settlement = settleReservation({ balancePoints: 70, reservedPoints: 30 }, 30, 0);
	assert.equal(settlement.commitAmount, 0);
	assert.equal(settlement.releaseAmount, 30);
	assert.equal(settlement.mutations.length, 1);
	assert.deepEqual(settlement.next, { balancePoints: 100, reservedPoints: 0 });
});

test('settleReservation rejects an actual larger than the reservation', () => {
	assert.throws(
		() => settleReservation({ balancePoints: 70, reservedPoints: 30 }, 30, 31),
		(e) => e instanceof PointsError && e.code === POINTS_ERROR_RESERVATION_EXCEEDED,
	);
});

test('reserve then full settle conserves the total points', () => {
	const start = { balancePoints: 500, reservedPoints: 0 };
	const reserved = reserve(start, 120);
	const settlement = settleReservation(reserved.next, 120, 120);
	assert.deepEqual(settlement.next, { balancePoints: 380, reservedPoints: 0 });
});

test('operations reject a negative stored state', () => {
	assert.throws(
		() => reserve({ balancePoints: -1, reservedPoints: 0 }, 1),
		(e) => e instanceof PointsError && e.code === POINTS_ERROR_INVALID_STATE,
	);
});
