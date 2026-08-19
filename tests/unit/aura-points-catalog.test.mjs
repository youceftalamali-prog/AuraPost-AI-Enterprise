import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
	POINTS_PLANS,
	POINTS_PACKS,
	listPlans,
	getPlan,
	getPack,
	packUnitPriceUsd,
	planAllowanceUsdValue,
} from '../../server/points/pointsCatalog.ts';

test('all five plans exist with the expected monthly allowances', () => {
	const byId = Object.fromEntries(POINTS_PLANS.map((p) => [p.id, p]));
	assert.equal(byId.free.monthlyPoints, 300);
	assert.equal(byId.starter.monthlyPoints, 3500);
	assert.equal(byId.pro.monthlyPoints, 11000);
	assert.equal(byId.business.monthlyPoints, 30000);
	assert.equal(byId.enterprise.isCustom, true);
	assert.equal(byId.enterprise.monthlyPriceUsd, null);
	assert.equal(listPlans().length, 5);
});

test('paid plan prices match the catalog', () => {
	assert.equal(getPlan('starter').monthlyPriceUsd, 29);
	assert.equal(getPlan('pro').monthlyPriceUsd, 79);
	assert.equal(getPlan('business').monthlyPriceUsd, 199);
});

test('getPlan throws for an unknown plan', () => {
	assert.throws(() => getPlan('ultra'));
});

test('packs are priced and larger packs are cheaper per point', () => {
	assert.equal(POINTS_PACKS.length, 3);
	assert.equal(getPack('pack_1k').priceUsd, 12);
	assert.equal(getPack('pack_5k').points, 5000);
	assert.equal(getPack('pack_20k').priceUsd, 200);
	const small = packUnitPriceUsd(getPack('pack_1k'));
	const mid = packUnitPriceUsd(getPack('pack_5k'));
	const big = packUnitPriceUsd(getPack('pack_20k'));
	assert.ok(big < mid && mid < small);
});

test('plan allowance USD value uses the 1pt=$0.01 rate', () => {
	assert.equal(planAllowanceUsdValue(getPlan('starter')), 35);
	assert.equal(planAllowanceUsdValue(getPlan('free')), 3);
});

test('getPack throws for an unknown pack', () => {
	assert.throws(() => getPack('pack_999'));
});
