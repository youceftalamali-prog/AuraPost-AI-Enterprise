import test from 'node:test';
import assert from 'node:assert/strict';

import {
  DEFAULT_VEO_BASE_URL,
  DEFAULT_VEO_MODEL,
  DEFAULT_KLING_BASE_URL,
  DEFAULT_VIDEO_ASPECT_RATIO,
  DEFAULT_VIDEO_DURATION_SECONDS,
  VIDEO_CLIP_CREDIT_COST,
  VIDEO_GEN_NOT_CONFIGURED,
  VIDEO_GEN_REQUEST_INVALID,
  VIDEO_GEN_OUTPUT_INVALID,
  VIDEO_GEN_ERROR,
  VideoGenError,
  estimateVideoCredits,
  buildVeoUrl,
  buildVeoRequestBody,
  parseVeoResponse,
  buildKlingUrl,
  buildKlingRequestBody,
  parseKlingResponse,
  isVideoProviderConfigured,
  resolveVideoProviderOrder,
  createVideoGenerationProvider,
} from '../../server/agent/videoGenerationProvider.ts';

test('estimateVideoCredits is a flat per-clip cost', () => {
  assert.equal(estimateVideoCredits(), VIDEO_CLIP_CREDIT_COST);
  assert.equal(estimateVideoCredits(3), VIDEO_CLIP_CREDIT_COST * 3);
  assert.equal(estimateVideoCredits(0), VIDEO_CLIP_CREDIT_COST);
});

test('buildVeoUrl targets predictLongRunning with the key', () => {
  const url = buildVeoUrl(DEFAULT_VEO_BASE_URL, DEFAULT_VEO_MODEL, 'key123');
  assert.ok(url.includes(`/models/${DEFAULT_VEO_MODEL}:predictLongRunning`));
  assert.ok(url.includes('key=key123'));
});

test('buildVeoRequestBody applies defaults and optional image', () => {
  const body = buildVeoRequestBody({ prompt: 'cinematic product shot' });
  assert.equal(body.instances[0].prompt, 'cinematic product shot');
  assert.equal(body.parameters.aspectRatio, DEFAULT_VIDEO_ASPECT_RATIO);
  assert.equal(body.parameters.durationSeconds, DEFAULT_VIDEO_DURATION_SECONDS);
  assert.equal('image' in body.instances[0], false);

  const withImage = buildVeoRequestBody({ prompt: 'p', imageBase64: 'AAAA', imageMimeType: 'image/jpeg', durationSeconds: 8, aspectRatio: '16:9', negativePrompt: 'blurry' });
  assert.deepEqual(withImage.instances[0].image, { imageBytes: 'AAAA', mimeType: 'image/jpeg' });
  assert.equal(withImage.parameters.durationSeconds, 8);
  assert.equal(withImage.parameters.aspectRatio, '16:9');
  assert.equal(withImage.parameters.negativePrompt, 'blurry');

  assert.throws(
    () => buildVeoRequestBody({ prompt: '   ' }),
    (e) => e instanceof VideoGenError && e.code === VIDEO_GEN_REQUEST_INVALID,
  );
});

test('parseVeoResponse extracts the operation name', () => {
  assert.equal(parseVeoResponse({ name: 'models/veo/operations/abc' }), 'models/veo/operations/abc');
  assert.throws(
    () => parseVeoResponse({}),
    (e) => e instanceof VideoGenError && e.code === VIDEO_GEN_OUTPUT_INVALID,
  );
});

test('buildKlingUrl switches between text2video and image2video', () => {
  assert.ok(buildKlingUrl(DEFAULT_KLING_BASE_URL, false).endsWith('/v1/videos/text2video'));
  assert.ok(buildKlingUrl(DEFAULT_KLING_BASE_URL, true).endsWith('/v1/videos/image2video'));
});

test('buildKlingRequestBody serializes duration as string and passes image', () => {
  const body = buildKlingRequestBody({ prompt: 'p', durationSeconds: 10 }, 'kling-v2');
  assert.equal(body.model_name, 'kling-v2');
  assert.equal(body.duration, '10');
  assert.equal(body.aspect_ratio, DEFAULT_VIDEO_ASPECT_RATIO);
  assert.equal('image' in body, false);

  const img = buildKlingRequestBody({ prompt: 'p', imageBase64: 'ZZZ' }, 'kling-v2');
  assert.equal(img.image, 'ZZZ');
});

test('parseKlingResponse extracts task_id and rejects error codes', () => {
  assert.equal(parseKlingResponse({ code: 0, data: { task_id: 'task_9' } }), 'task_9');
  assert.throws(
    () => parseKlingResponse({ code: 10, message: 'bad' }),
    (e) => e instanceof VideoGenError && e.code === VIDEO_GEN_ERROR,
  );
  assert.throws(
    () => parseKlingResponse({ code: 0, data: {} }),
    (e) => e instanceof VideoGenError && e.code === VIDEO_GEN_OUTPUT_INVALID,
  );
});

test('isVideoProviderConfigured / resolveVideoProviderOrder honor keys and preference', () => {
  assert.equal(isVideoProviderConfigured({ veoApiKey: 'k' }, 'veo'), true);
  assert.equal(isVideoProviderConfigured({}, 'veo'), false);
  assert.equal(isVideoProviderConfigured({ klingApiKey: 'k' }, 'kling'), true);

  assert.deepEqual(resolveVideoProviderOrder({}), []);
  assert.deepEqual(resolveVideoProviderOrder({ veoApiKey: 'a', klingApiKey: 'b' }), ['veo', 'kling']);
  assert.deepEqual(resolveVideoProviderOrder({ veoApiKey: 'a', klingApiKey: 'b' }, 'kling'), ['kling', 'veo']);
  assert.deepEqual(resolveVideoProviderOrder({ klingApiKey: 'b' }, 'veo'), ['kling']);
});

test('createVideoGenerationProvider throws NOT_CONFIGURED without keys', async () => {
  const gen = createVideoGenerationProvider({
    fetchImpl: async () => {
      throw new Error('fetch should not be called when unconfigured');
    },
  });
  await assert.rejects(
    () => gen({ prompt: 'p' }),
    (e) => e instanceof VideoGenError && e.code === VIDEO_GEN_NOT_CONFIGURED,
  );
});

test('createVideoGenerationProvider submits to Veo and returns a job handle', async () => {
  let captured;
  const gen = createVideoGenerationProvider({
    veoApiKey: 'veo-key',
    fetchImpl: async (url, init) => {
      captured = { url, init };
      return { ok: true, status: 200, json: async () => ({ name: 'models/veo/operations/xyz' }), text: async () => '' };
    },
  });
  const job = await gen({ prompt: 'cinematic promo' });
  assert.equal(job.provider, 'veo');
  assert.equal(job.jobId, 'models/veo/operations/xyz');
  assert.equal(job.status, 'processing');
  assert.equal(job.model, DEFAULT_VEO_MODEL);
  assert.equal(job.estimatedCredits, VIDEO_CLIP_CREDIT_COST);
  assert.ok(captured.url.includes(':predictLongRunning'));
  assert.equal(captured.init.method, 'POST');
});

test('createVideoGenerationProvider falls back from Veo to Kling on provider error', async () => {
  const calls = [];
  const gen = createVideoGenerationProvider({
    veoApiKey: 'veo-key',
    klingApiKey: 'kling-key',
    fetchImpl: async (url) => {
      calls.push(url);
      if (url.includes('generativelanguage')) {
        return { ok: false, status: 500, json: async () => ({}), text: async () => 'boom' };
      }
      return { ok: true, status: 200, json: async () => ({ code: 0, data: { task_id: 'task_1' } }), text: async () => '' };
    },
  });
  const job = await gen({ prompt: 'cinematic promo' });
  assert.equal(job.provider, 'kling');
  assert.equal(job.jobId, 'task_1');
  assert.equal(calls.length, 2);
});

test('createVideoGenerationProvider respects preferred provider', async () => {
  const gen = createVideoGenerationProvider({
    veoApiKey: 'veo-key',
    klingApiKey: 'kling-key',
    fetchImpl: async (url) => {
      if (url.includes('klingai')) {
        return { ok: true, status: 200, json: async () => ({ code: 0, data: { task_id: 'task_k' } }), text: async () => '' };
      }
      return { ok: true, status: 200, json: async () => ({ name: 'op' }), text: async () => '' };
    },
  });
  const job = await gen({ prompt: 'p' }, 'kling');
  assert.equal(job.provider, 'kling');
  assert.equal(job.jobId, 'task_k');
});

test('createVideoGenerationProvider surfaces request-invalid without fallback', async () => {
  let calls = 0;
  const gen = createVideoGenerationProvider({
    veoApiKey: 'veo-key',
    klingApiKey: 'kling-key',
    fetchImpl: async () => {
      calls += 1;
      return { ok: true, status: 200, json: async () => ({ name: 'op' }), text: async () => '' };
    },
  });
  await assert.rejects(
    () => gen({ prompt: '   ' }),
    (e) => e instanceof VideoGenError && e.code === VIDEO_GEN_REQUEST_INVALID,
  );
  assert.equal(calls, 0);
});
