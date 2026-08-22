import test from 'node:test';
import assert from 'node:assert/strict';

import {
  TWO_PERSON_ASSEMBLY_SCHEMA,
  DEFAULT_ASSEMBLY_FPS,
  ASSEMBLY_RENDER_CREDIT_COST,
  ASSEMBLY_REQUEST_INVALID,
  ASSEMBLY_NOT_TWO_PERSON,
  AssemblyError,
  resolveAssemblyDimensions,
  buildConcatFilterComplex,
  buildSplitScreenFilterComplex,
  resolveAssemblyLayout,
  buildTwoPersonAssemblyPlan,
} from '../../server/agent/twoPersonSceneAssembly.ts';

import { normalizeScenarioScript } from '../../server/templates/scenarioContract.ts';

function twoPersonScenario() {
  return normalizeScenarioScript({
    version: 1,
    locale: 'ar',
    aspectRatio: '9:16',
    isPromo: false,
    actors: [
      { id: 'a1', role: 'host', locale: 'ar' },
      { id: 'a2', role: 'guest', locale: 'fr' },
    ],
    scenes: [
      { id: 's1', order: 1, durationSeconds: 3, script: 'مرحبا', actorId: 'a1' },
      { id: 's2', order: 2, durationSeconds: 4, script: 'Bonjour', actorId: 'a2' },
      { id: 's3', order: 3, durationSeconds: 2, script: 'شكرا', actorId: 'a1' },
    ],
  });
}

test('resolveAssemblyDimensions maps aspect ratios', () => {
  assert.deepEqual(resolveAssemblyDimensions('9:16'), { width: 1080, height: 1920 });
  assert.deepEqual(resolveAssemblyDimensions('1:1'), { width: 1080, height: 1080 });
  assert.deepEqual(resolveAssemblyDimensions('16:9'), { width: 1920, height: 1080 });
});

test('resolveAssemblyLayout defaults to sequential', () => {
  assert.equal(resolveAssemblyLayout(), 'sequential');
  assert.equal(resolveAssemblyLayout('split'), 'split');
  assert.equal(resolveAssemblyLayout('sequential'), 'sequential');
});

test('buildConcatFilterComplex scales each input and concatenates with audio', () => {
  const fc = buildConcatFilterComplex(2, { width: 1080, height: 1920 }, true);
  assert.ok(fc.includes('[0:v]scale=1080:1920'));
  assert.ok(fc.includes(`fps=${DEFAULT_ASSEMBLY_FPS}`));
  assert.ok(fc.includes('[v0][0:a][v1][1:a]concat=n=2:v=1:a=1[vout][aout]'));
});

test('buildConcatFilterComplex supports video-only concat', () => {
  const fc = buildConcatFilterComplex(3, { width: 1080, height: 1080 }, false);
  assert.ok(fc.includes('[v0][v1][v2]concat=n=3:v=1:a=0[vout]'));
  assert.throws(
    () => buildConcatFilterComplex(0, { width: 1, height: 1 }, false),
    (e) => e instanceof AssemblyError && e.code === ASSEMBLY_REQUEST_INVALID,
  );
});

test('buildSplitScreenFilterComplex stacks two halves', () => {
  const fc = buildSplitScreenFilterComplex({ width: 1080, height: 1920 });
  assert.ok(fc.includes('[0:v]scale=540:1920'));
  assert.ok(fc.includes('[1:v]scale=540:1920'));
  assert.ok(fc.includes('hstack=inputs=2[vout]'));
});

test('buildTwoPersonAssemblyPlan builds a sequential dialogue plan', () => {
  const scenario = twoPersonScenario();
  const plan = buildTwoPersonAssemblyPlan({
    scenario,
    media: [
      { sceneId: 's1', videoPath: '/clips/s1.mp4', audioPath: '/audio/s1.mp3' },
      { sceneId: 's2', videoPath: '/clips/s2.mp4', audioPath: '/audio/s2.mp3' },
      { sceneId: 's3', videoPath: '/clips/s3.mp4', audioPath: '/audio/s3.mp3' },
    ],
  });
  assert.equal(plan.schema, TWO_PERSON_ASSEMBLY_SCHEMA);
  assert.equal(plan.layout, 'sequential');
  assert.equal(plan.width, 1080);
  assert.equal(plan.height, 1920);
  assert.equal(plan.fps, DEFAULT_ASSEMBLY_FPS);
  assert.equal(plan.totalDurationSeconds, 9);
  assert.equal(plan.estimatedCredits, ASSEMBLY_RENDER_CREDIT_COST);
  assert.equal(plan.segments.length, 3);
  assert.equal(plan.segments[0].actorId, 'a1');
  assert.equal(plan.segments[0].role, 'host');
  assert.equal(plan.segments[0].startSeconds, 0);
  assert.equal(plan.segments[1].actorId, 'a2');
  assert.equal(plan.segments[1].startSeconds, 3);
  assert.equal(plan.segments[2].startSeconds, 7);
  assert.ok(plan.filterComplex.includes('concat=n=3:v=1:a=1'));
});

test('buildTwoPersonAssemblyPlan alternates actors when actorId is missing', () => {
  const scenario = normalizeScenarioScript({
    version: 1,
    locale: 'ar',
    aspectRatio: '9:16',
    isPromo: false,
    actors: [
      { id: 'a1', role: 'host', locale: 'ar' },
      { id: 'a2', role: 'guest', locale: 'ar' },
    ],
    scenes: [
      { id: 's1', order: 1, durationSeconds: 2, script: 'one' },
      { id: 's2', order: 2, durationSeconds: 2, script: 'two' },
      { id: 's3', order: 3, durationSeconds: 2, script: 'three' },
    ],
  });
  const plan = buildTwoPersonAssemblyPlan({
    scenario,
    media: [
      { sceneId: 's1', videoPath: '/c/s1.mp4' },
      { sceneId: 's2', videoPath: '/c/s2.mp4' },
      { sceneId: 's3', videoPath: '/c/s3.mp4' },
    ],
  });
  assert.deepEqual(plan.segments.map((s) => s.actorId), ['a1', 'a2', 'a1']);
  // No audio provided -> video-only concat.
  assert.ok(plan.filterComplex.includes('concat=n=3:v=1:a=0'));
});

test('buildTwoPersonAssemblyPlan supports split layout', () => {
  const scenario = twoPersonScenario();
  const plan = buildTwoPersonAssemblyPlan({
    scenario,
    layout: 'split',
    media: [
      { sceneId: 's1', videoPath: '/clips/s1.mp4' },
      { sceneId: 's2', videoPath: '/clips/s2.mp4' },
      { sceneId: 's3', videoPath: '/clips/s3.mp4' },
    ],
  });
  assert.equal(plan.layout, 'split');
  assert.ok(plan.filterComplex.includes('hstack=inputs=2[vout]'));
});

test('buildTwoPersonAssemblyPlan rejects non-two-person scenarios', () => {
  const solo = normalizeScenarioScript({
    version: 1,
    locale: 'ar',
    aspectRatio: '9:16',
    isPromo: false,
    actors: [{ id: 'a1', role: 'host', locale: 'ar' }],
    scenes: [{ id: 's1', order: 1, durationSeconds: 2, script: 'solo', actorId: 'a1' }],
  });
  assert.throws(
    () => buildTwoPersonAssemblyPlan({ scenario: solo, media: [{ sceneId: 's1', videoPath: '/c/s1.mp4' }] }),
    (e) => e instanceof AssemblyError && e.code === ASSEMBLY_NOT_TWO_PERSON,
  );
});

test('buildTwoPersonAssemblyPlan requires media for every scene', () => {
  const scenario = twoPersonScenario();
  assert.throws(
    () => buildTwoPersonAssemblyPlan({
      scenario,
      media: [
        { sceneId: 's1', videoPath: '/clips/s1.mp4' },
        { sceneId: 's3', videoPath: '/clips/s3.mp4' },
      ],
    }),
    (e) => e instanceof AssemblyError && e.code === ASSEMBLY_REQUEST_INVALID,
  );
});
