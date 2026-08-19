// server/agent/twoPersonSceneAssembly.ts
// Two-person (dialogue) scenario assembly planner for AuraPost (t172).
//
// videoRenderEngine.ts already assembles a single track with FFmpeg. A
// two-person scenario (isTwoPersonScenario -> exactly two actors) needs a
// dialogue layout: either a shot/reverse-shot SEQUENTIAL cut that alternates
// between the two speakers, or a SPLIT-screen hero shot showing both actors
// side by side. Rather than editing the large existing engine, this module is
// an additive, pure planner: it takes a normalized ScenarioScript plus the
// per-scene generated clips/audio and produces a structured assembly plan
// (segments + an FFmpeg filter_complex string) that the render engine executes.
//
// Everything here is pure and dependency-free (no network / no ffmpeg spawn),
// so it is fully unit-testable and safe in CI. Actual rendering stays gated in
// videoRenderEngine.ts behind VIDEO_RENDER_ENGINE_VERIFIED / TEST_MODE.

import {
  type ScenarioScript,
  type ScenarioActor,
  type ScenarioAspectRatio,
  isTwoPersonScenario,
} from '../templates/scenarioContract.ts';

export const ASSEMBLY_ERROR = 'ASSEMBLY_ERROR';
export const ASSEMBLY_REQUEST_INVALID = 'ASSEMBLY_REQUEST_INVALID';
export const ASSEMBLY_NOT_TWO_PERSON = 'ASSEMBLY_NOT_TWO_PERSON';

export const TWO_PERSON_ASSEMBLY_SCHEMA = 'aurapost.two-person-assembly.v1';
export const DEFAULT_ASSEMBLY_FPS = 30;
export const ASSEMBLY_RENDER_CREDIT_COST = 60;

export type AssemblyLayout = 'sequential' | 'split';

export class AssemblyError extends Error {
  constructor(
    public readonly code: string,
    message: string,
  ) {
    super(message);
    this.name = 'AssemblyError';
  }
}

/** Rendered media for a single scene, produced by the video/avatar/TTS stages. */
export interface SceneMediaRef {
  sceneId: string;
  videoPath: string;
  audioPath?: string;
}

export interface TwoPersonSegment {
  order: number;
  sceneId: string;
  actorId: string;
  role: string;
  videoPath: string;
  audioPath?: string;
  caption: string;
  startSeconds: number;
  durationSeconds: number;
}

export interface AssemblyDimensions {
  width: number;
  height: number;
}

export interface TwoPersonAssemblyPlan {
  schema: typeof TWO_PERSON_ASSEMBLY_SCHEMA;
  aspectRatio: ScenarioAspectRatio;
  layout: AssemblyLayout;
  width: number;
  height: number;
  fps: number;
  totalDurationSeconds: number;
  actors: ScenarioActor[];
  segments: TwoPersonSegment[];
  filterComplex: string;
  estimatedCredits: number;
}

/** Map an aspect ratio to concrete vertical/social output dimensions. */
export function resolveAssemblyDimensions(aspectRatio: ScenarioAspectRatio): AssemblyDimensions {
  switch (aspectRatio) {
    case '1:1':
      return { width: 1080, height: 1080 };
    case '16:9':
      return { width: 1920, height: 1080 };
    case '9:16':
    default:
      return { width: 1080, height: 1920 };
  }
}

/**
 * Build the FFmpeg filter_complex that concatenates N uniformly-scaled scene
 * clips into one track (the shot/reverse-shot dialogue cut). Each input is
 * scaled + padded to the target frame so mismatched sources concat cleanly.
 */
export function buildConcatFilterComplex(count: number, dims: AssemblyDimensions, withAudio: boolean): string {
  if (!Number.isInteger(count) || count < 1) {
    throw new AssemblyError(ASSEMBLY_REQUEST_INVALID, 'Concat requires at least one input.');
  }
  const { width, height } = dims;
  const scales: string[] = [];
  const concatInputs: string[] = [];
  for (let i = 0; i < count; i += 1) {
    scales.push(
      `[${i}:v]scale=${width}:${height}:force_original_aspect_ratio=decrease,` +
        `pad=${width}:${height}:(ow-iw)/2:(oh-ih)/2,setsar=1,fps=${DEFAULT_ASSEMBLY_FPS}[v${i}]`,
    );
    concatInputs.push(withAudio ? `[v${i}][${i}:a]` : `[v${i}]`);
  }
  const concat = withAudio
    ? `${concatInputs.join('')}concat=n=${count}:v=1:a=1[vout][aout]`
    : `${concatInputs.join('')}concat=n=${count}:v=1:a=0[vout]`;
  return `${scales.join(';')};${concat}`;
}

/**
 * Build the FFmpeg filter_complex for a side-by-side split-screen hero shot of
 * the two actors (input 0 on the left, input 1 on the right).
 */
export function buildSplitScreenFilterComplex(dims: AssemblyDimensions): string {
  const { width, height } = dims;
  const half = Math.floor(width / 2);
  return (
    `[0:v]scale=${half}:${height}:force_original_aspect_ratio=increase,crop=${half}:${height},setsar=1[l];` +
    `[1:v]scale=${half}:${height}:force_original_aspect_ratio=increase,crop=${half}:${height},setsar=1[r];` +
    `[l][r]hstack=inputs=2[vout]`
  );
}

export interface TwoPersonAssemblyInput {
  scenario: ScenarioScript;
  media: SceneMediaRef[];
  layout?: AssemblyLayout;
}

/** Decide the layout: honor an override, else default to a sequential cut. */
export function resolveAssemblyLayout(override?: AssemblyLayout): AssemblyLayout {
  return override === 'split' ? 'split' : 'sequential';
}

/**
 * Build a two-person assembly plan from a normalized scenario and the rendered
 * per-scene media. Scenes are ordered by their `order`; when a scene omits
 * actorId we alternate between the two actors (shot/reverse-shot). Throws when
 * the scenario is not two-person or a scene has no rendered media.
 */
export function buildTwoPersonAssemblyPlan(input: TwoPersonAssemblyInput): TwoPersonAssemblyPlan {
  const { scenario } = input;
  if (!scenario || !Array.isArray(scenario.actors) || !Array.isArray(scenario.scenes)) {
    throw new AssemblyError(ASSEMBLY_REQUEST_INVALID, 'A normalized scenario with actors and scenes is required.');
  }
  if (!isTwoPersonScenario(scenario)) {
    throw new AssemblyError(
      ASSEMBLY_NOT_TWO_PERSON,
      `Two-person assembly requires exactly two actors; got ${scenario.actors.length}.`,
    );
  }
  if (scenario.scenes.length === 0) {
    throw new AssemblyError(ASSEMBLY_REQUEST_INVALID, 'Assembly requires at least one scene.');
  }

  const mediaBySceneId = new Map<string, SceneMediaRef>();
  for (const m of input.media || []) {
    if (m && typeof m.sceneId === 'string') mediaBySceneId.set(m.sceneId, m);
  }

  const [actorA, actorB] = scenario.actors;
  const actorsById = new Map<string, ScenarioActor>(scenario.actors.map((a) => [a.id, a]));
  const orderedScenes = [...scenario.scenes].sort((a, b) => a.order - b.order);

  let cursor = 0;
  const segments: TwoPersonSegment[] = orderedScenes.map((scene, index) => {
    const media = mediaBySceneId.get(scene.id);
    if (!media || !media.videoPath || !media.videoPath.trim()) {
      throw new AssemblyError(ASSEMBLY_REQUEST_INVALID, `Scene "${scene.id}" has no rendered video media.`);
    }
    // Resolve the speaking actor: explicit actorId wins, else alternate.
    let actor: ScenarioActor | undefined = scene.actorId ? actorsById.get(scene.actorId) : undefined;
    if (!actor) actor = index % 2 === 0 ? actorA : actorB;
    const durationSeconds = scene.durationSeconds > 0 ? scene.durationSeconds : 0;
    const segment: TwoPersonSegment = {
      order: index + 1,
      sceneId: scene.id,
      actorId: actor.id,
      role: actor.role,
      videoPath: media.videoPath,
      caption: scene.script,
      startSeconds: cursor,
      durationSeconds,
    };
    if (media.audioPath && media.audioPath.trim()) segment.audioPath = media.audioPath;
    cursor += durationSeconds;
    return segment;
  });

  const layout = resolveAssemblyLayout(input.layout);
  const dims = resolveAssemblyDimensions(scenario.aspectRatio);
  const withAudio = segments.every((s) => Boolean(s.audioPath));
  const filterComplex =
    layout === 'split'
      ? buildSplitScreenFilterComplex(dims)
      : buildConcatFilterComplex(segments.length, dims, withAudio);

  const totalDurationSeconds = segments.reduce((sum, s) => sum + s.durationSeconds, 0);

  return {
    schema: TWO_PERSON_ASSEMBLY_SCHEMA,
    aspectRatio: scenario.aspectRatio,
    layout,
    width: dims.width,
    height: dims.height,
    fps: DEFAULT_ASSEMBLY_FPS,
    totalDurationSeconds,
    actors: scenario.actors,
    segments,
    filterComplex,
    estimatedCredits: ASSEMBLY_RENDER_CREDIT_COST,
  };
}
