import test from 'node:test'
import assert from 'node:assert/strict'
import {
	validateScenarioScript,
	normalizeScenarioScript,
	isTwoPersonScenario,
	SCENARIO_ASPECT_RATIOS,
} from '../../server/templates/scenarioContract.ts'

const validTwoPerson = {
	version: 1,
	locale: 'ar',
	aspectRatio: '9:16',
	isPromo: false,
	actors: [
		{ id: 'a1', role: 'host', locale: 'ar', avatarProvider: 'heygen' },
		{ id: 'a2', role: 'guest', locale: 'en', avatarProvider: 'did' },
	],
	scenes: [
		{ id: 's1', order: 1, durationSeconds: 5, script: 'مرحبا', actorId: 'a1' },
		{ id: 's2', order: 2, durationSeconds: 7, script: 'Hello', actorId: 'a2' },
	],
	durationSeconds: 12,
}

test('valid two-person scenario passes validation', () => {
	const res = validateScenarioScript(validTwoPerson)
	assert.equal(res.valid, true, JSON.stringify(res.errors))
	assert.equal(res.errors.length, 0)
})

test('rejects non-object input', () => {
	assert.equal(validateScenarioScript(null).valid, false)
	assert.equal(validateScenarioScript(42).valid, false)
})

test('rejects duplicate actor and scene ids', () => {
	const bad = {
		...validTwoPerson,
		actors: [
			{ id: 'a1', role: 'x', locale: 'ar' },
			{ id: 'a1', role: 'y', locale: 'ar' },
		],
		scenes: [
			{ id: 's1', order: 1, durationSeconds: 5, script: 'hi', actorId: 'a1' },
			{ id: 's1', order: 2, durationSeconds: 5, script: 'hi', actorId: 'a1' },
		],
	}
	const res = validateScenarioScript(bad)
	assert.equal(res.valid, false)
	assert.ok(res.errors.some((e) => e.includes('actor id')))
	assert.ok(res.errors.some((e) => e.includes('scene id')))
})

test('rejects scene referencing an unknown actor', () => {
	const bad = {
		...validTwoPerson,
		scenes: [{ id: 's1', order: 1, durationSeconds: 5, script: 'hi', actorId: 'ghost' }],
	}
	const res = validateScenarioScript(bad)
	assert.equal(res.valid, false)
	assert.ok(res.errors.some((e) => e.includes('does not reference a known actor')))
})

test('rejects non-positive scene duration', () => {
	const bad = {
		...validTwoPerson,
		scenes: [{ id: 's1', order: 1, durationSeconds: 0, script: 'hi', actorId: 'a1' }],
	}
	assert.equal(validateScenarioScript(bad).valid, false)
})

test('rejects invalid aspect ratio', () => {
	const bad = { ...validTwoPerson, aspectRatio: '4:3' }
	assert.equal(validateScenarioScript(bad).valid, false)
})

test('promo scenario may omit actors and scenes', () => {
	const promo = { version: 1, locale: 'ar', aspectRatio: '9:16', isPromo: true, actors: [], scenes: [] }
	const res = validateScenarioScript(promo)
	assert.equal(res.valid, true, JSON.stringify(res.errors))
})

test('normalize fills defaults, sorts scenes and recomputes duration', () => {
	const normalized = normalizeScenarioScript({
		locale: 'ar',
		actors: [{ role: 'host' }],
		scenes: [
			{ durationSeconds: 4, script: 'b', order: 2 },
			{ durationSeconds: 6, script: 'a', order: 1 },
		],
	})
	assert.equal(normalized.version, 1)
	assert.equal(normalized.aspectRatio, '9:16')
	assert.equal(normalized.isPromo, false)
	assert.equal(normalized.actors[0].id, 'actor-1')
	assert.equal(normalized.scenes[0].script, 'a')
	assert.equal(normalized.scenes[0].order, 1)
	assert.equal(normalized.scenes[1].order, 2)
	assert.equal(normalized.durationSeconds, 10)
})

test('normalized valid scenario stays valid and is detected as two-person', () => {
	const normalized = normalizeScenarioScript(validTwoPerson)
	assert.equal(validateScenarioScript(normalized).valid, true)
	assert.equal(isTwoPersonScenario(normalized), true)
})

test('aspect ratios constant exposes the supported set', () => {
	assert.deepEqual(SCENARIO_ASPECT_RATIOS, ['9:16', '1:1', '16:9'])
})
