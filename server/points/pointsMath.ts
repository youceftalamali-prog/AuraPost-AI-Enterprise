// server/points/pointsMath.ts
// Pure, dependency-free arithmetic for the reserve-then-debit points engine.
// 1 point = $0.01. All amounts are integer points; fractional points are invalid.
// This module never touches the database, so it is fully unit-testable and is the
// single source of truth for how balances and reservations change.

export const POINTS_LEDGER_SCHEMA = 'aurapost.points-ledger.v1';
export const USD_CENTS_PER_POINT = 1; // 1 point = $0.01

export type PointsEntryType =
	| 'grant'
	| 'reserve'
	| 'commit'
	| 'release'
	| 'refund'
	| 'adjust'
	| 'expire';

export interface PointsState {
	balancePoints: number;
	reservedPoints: number;
}

export interface PointsMutation {
	entryType: PointsEntryType;
	/** Signed delta applied to the available balance. */
	points: number;
	/** Signed delta applied to reserved points. */
	reservedDelta: number;
	next: PointsState;
}

export class PointsError extends Error {
	constructor(public readonly code: string, message: string) {
		super(message);
		this.name = 'PointsError';
	}
}

export const POINTS_ERROR_INVALID_AMOUNT = 'POINTS_INVALID_AMOUNT';
export const POINTS_ERROR_INSUFFICIENT = 'POINTS_INSUFFICIENT';
export const POINTS_ERROR_RESERVATION_EXCEEDED = 'POINTS_RESERVATION_EXCEEDED';
export const POINTS_ERROR_INVALID_STATE = 'POINTS_INVALID_STATE';

function assertState(state: PointsState): void {
	if (!Number.isSafeInteger(state.balancePoints) || !Number.isSafeInteger(state.reservedPoints)) {
		throw new PointsError(POINTS_ERROR_INVALID_STATE, 'Points state must use safe integers.');
	}
	if (state.balancePoints < 0 || state.reservedPoints < 0) {
		throw new PointsError(POINTS_ERROR_INVALID_STATE, 'Points state cannot be negative.');
	}
}

function assertPositiveAmount(amount: number): void {
	if (!Number.isSafeInteger(amount) || amount <= 0) {
		throw new PointsError(POINTS_ERROR_INVALID_AMOUNT, 'Amount must be a positive integer number of points.');
	}
}

/** Convert a USD amount to whole points, rounding to the nearest point. */
export function usdToPoints(usd: number): number {
	if (!Number.isFinite(usd) || usd < 0) {
		throw new PointsError(POINTS_ERROR_INVALID_AMOUNT, 'USD amount must be a non-negative number.');
	}
	return Math.round((usd * 100) / USD_CENTS_PER_POINT);
}

/** Convert whole points back to their USD value. */
export function pointsToUsd(points: number): number {
	if (!Number.isSafeInteger(points) || points < 0) {
		throw new PointsError(POINTS_ERROR_INVALID_AMOUNT, 'Points must be a non-negative integer.');
	}
	return (points * USD_CENTS_PER_POINT) / 100;
}

/** Hold points: move them from the available balance into reservation. */
export function reserve(state: PointsState, amount: number): PointsMutation {
	assertState(state);
	assertPositiveAmount(amount);
	if (state.balancePoints < amount) {
		throw new PointsError(POINTS_ERROR_INSUFFICIENT, 'Not enough available points to reserve.');
	}
	const next: PointsState = {
		balancePoints: state.balancePoints - amount,
		reservedPoints: state.reservedPoints + amount,
	};
	return { entryType: 'reserve', points: -amount, reservedDelta: amount, next };
}

/** Finalize consumption of a reservation: reserved points leave the system. */
export function commit(state: PointsState, amount: number): PointsMutation {
	assertState(state);
	assertPositiveAmount(amount);
	if (state.reservedPoints < amount) {
		throw new PointsError(POINTS_ERROR_RESERVATION_EXCEEDED, 'Cannot commit more than is reserved.');
	}
	const next: PointsState = {
		balancePoints: state.balancePoints,
		reservedPoints: state.reservedPoints - amount,
	};
	return { entryType: 'commit', points: 0, reservedDelta: -amount, next };
}

/** Cancel a reservation: reserved points return to the available balance. */
export function release(state: PointsState, amount: number): PointsMutation {
	assertState(state);
	assertPositiveAmount(amount);
	if (state.reservedPoints < amount) {
		throw new PointsError(POINTS_ERROR_RESERVATION_EXCEEDED, 'Cannot release more than is reserved.');
	}
	const next: PointsState = {
		balancePoints: state.balancePoints + amount,
		reservedPoints: state.reservedPoints - amount,
	};
	return { entryType: 'release', points: amount, reservedDelta: -amount, next };
}

/** Add points to the available balance (plan grant, pack purchase, bonus). */
export function grant(state: PointsState, amount: number): PointsMutation {
	assertState(state);
	assertPositiveAmount(amount);
	const next: PointsState = {
		balancePoints: state.balancePoints + amount,
		reservedPoints: state.reservedPoints,
	};
	return { entryType: 'grant', points: amount, reservedDelta: 0, next };
}

/** Return already-committed points to the available balance. */
export function refund(state: PointsState, amount: number): PointsMutation {
	assertState(state);
	assertPositiveAmount(amount);
	const next: PointsState = {
		balancePoints: state.balancePoints + amount,
		reservedPoints: state.reservedPoints,
	};
	return { entryType: 'refund', points: amount, reservedDelta: 0, next };
}

export interface ReservationSettlement {
	commitAmount: number;
	releaseAmount: number;
	mutations: PointsMutation[];
	next: PointsState;
}

/**
 * Settle a reservation where the actual cost may be lower than the reserved
 * estimate: commit the actual amount and release the remainder. Passing an
 * actual of 0 releases the whole reservation.
 */
export function settleReservation(
	state: PointsState,
	reservedAmount: number,
	actualAmount: number,
): ReservationSettlement {
	assertState(state);
	assertPositiveAmount(reservedAmount);
	if (!Number.isSafeInteger(actualAmount) || actualAmount < 0) {
		throw new PointsError(POINTS_ERROR_INVALID_AMOUNT, 'Actual amount must be a non-negative integer.');
	}
	if (actualAmount > reservedAmount) {
		throw new PointsError(POINTS_ERROR_RESERVATION_EXCEEDED, 'Actual cost cannot exceed the reserved amount.');
	}
	if (state.reservedPoints < reservedAmount) {
		throw new PointsError(POINTS_ERROR_RESERVATION_EXCEEDED, 'Reservation is smaller than expected.');
	}
	const mutations: PointsMutation[] = [];
	let current = state;
	const releaseAmount = reservedAmount - actualAmount;
	if (actualAmount > 0) {
		const m = commit(current, actualAmount);
		mutations.push(m);
		current = m.next;
	}
	if (releaseAmount > 0) {
		const m = release(current, releaseAmount);
		mutations.push(m);
		current = m.next;
	}
	return { commitAmount: actualAmount, releaseAmount, mutations, next: current };
}
