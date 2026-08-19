import test from 'node:test';
import assert from 'node:assert/strict';

import {
  DEFAULT_AVATAR_PROVIDER_ORDER,
  HEYGEN_VIDEO_GENERATE_URL,
  DID_TALKS_URL,
  AVATAR_VIDEO_CREDIT_COST,
  AVATAR_PROVIDER_NOT_CONFIGURED,
  AVATAR_PROVIDER_REQUEST_INVALID,
  AVATAR_PROVIDER_OUTPUT_INVALID,
  AvatarProviderError,
  isAvatarProviderConfigured,
  resolveAvatarProviderOrder,
  buildHeyGenVideoRequest,
  buildDidTalkRequest,
  parseHeyGenResponse,
  parseDidResponse,
  createAvatarProvider,
} from '../../server/agent/avatarProvider.ts';

const baseReq = {
  script: 'مرحبا بكم في منتجنا الجديد',
  locale: 'ar',
  width: 720,
  height: 1280,
  avatarId: 'avatar_123',
  voiceId: 'voice_ar_1',
  sourceImageUrl: 'https://cdn.example.com/face.png',
};

test('DEFAULT_AVATAR_PROVIDER_ORDER is heygen then did', () => {
  assert.deepEqual(DEFAULT_AVATAR_PROVIDER_ORDER, ['heygen', 'did']);
});

test('isAvatarProviderConfigured reflects presence of any key', () => {
  assert.equal(isAvatarProviderConfigured({}), false);
  assert.equal(isAvatarProviderConfigured({ heygenApiKey: 'k' }), true);
  assert.equal(isAvatarProviderConfigured({ didApiKey: 'k' }), true);
});

test('resolveAvatarProviderOrder returns only configured providers in order', () => {
  assert.deepEqual(resolveAvatarProviderOrder({}), []);
  assert.deepEqual(resolveAvatarProviderOrder({ heygenApiKey: 'k' }), ['heygen']);
  assert.deepEqual(resolveAvatarProviderOrder({ didApiKey: 'k' }), ['did']);
  assert.deepEqual(resolveAvatarProviderOrder({ heygenApiKey: 'k', didApiKey: 'k' }), ['heygen', 'did']);
  assert.deepEqual(
    resolveAvatarProviderOrder({ heygenApiKey: 'k', didApiKey: 'k', providerOrder: ['did', 'heygen'] }),
    ['did', 'heygen'],
  );
});

test('buildHeyGenVideoRequest builds a v2 avatar+voice payload', () => {
  const body = buildHeyGenVideoRequest(baseReq);
  assert.equal(body.video_inputs.length, 1);
  assert.equal(body.video_inputs[0].character.type, 'avatar');
  assert.equal(body.video_inputs[0].character.avatar_id, 'avatar_123');
  assert.equal(body.video_inputs[0].voice.type, 'text');
  assert.equal(body.video_inputs[0].voice.input_text, baseReq.script);
  assert.equal(body.video_inputs[0].voice.voice_id, 'voice_ar_1');
  assert.deepEqual(body.dimension, { width: 720, height: 1280 });
});

test('buildHeyGenVideoRequest requires avatarId', () => {
  assert.throws(
    () => buildHeyGenVideoRequest({ ...baseReq, avatarId: undefined }),
    (e) => e instanceof AvatarProviderError && e.code === AVATAR_PROVIDER_REQUEST_INVALID,
  );
});

test('buildDidTalkRequest builds a talk payload with elevenlabs voice', () => {
  const body = buildDidTalkRequest(baseReq);
  assert.equal(body.source_url, baseReq.sourceImageUrl);
  assert.equal(body.script.type, 'text');
  assert.equal(body.script.input, baseReq.script);
  assert.equal(body.script.provider.type, 'elevenlabs');
  assert.equal(body.script.provider.voice_id, 'voice_ar_1');
});

test('buildDidTalkRequest requires sourceImageUrl', () => {
  assert.throws(
    () => buildDidTalkRequest({ ...baseReq, sourceImageUrl: undefined }),
    (e) => e instanceof AvatarProviderError && e.code === AVATAR_PROVIDER_REQUEST_INVALID,
  );
});

test('parseHeyGenResponse extracts video_id and rejects errors', () => {
  assert.deepEqual(parseHeyGenResponse({ error: null, data: { video_id: 'vid_1' } }), { jobId: 'vid_1' });
  assert.throws(() => parseHeyGenResponse({ error: { code: 'x' }, data: null }), (e) => e instanceof AvatarProviderError);
  assert.throws(
    () => parseHeyGenResponse({ error: null, data: {} }),
    (e) => e instanceof AvatarProviderError && e.code === AVATAR_PROVIDER_OUTPUT_INVALID,
  );
});

test('parseDidResponse extracts id', () => {
  assert.deepEqual(parseDidResponse({ id: 'talk_1', status: 'created' }), { jobId: 'talk_1' });
  assert.throws(
    () => parseDidResponse({ status: 'created' }),
    (e) => e instanceof AvatarProviderError && e.code === AVATAR_PROVIDER_OUTPUT_INVALID,
  );
});

test('createAvatarProvider throws NOT_CONFIGURED with no keys', async () => {
  const provider = createAvatarProvider({
    fetchImpl: async () => {
      throw new Error('fetch should not be called when unconfigured');
    },
  });
  await assert.rejects(
    () => provider(baseReq),
    (e) => e instanceof AvatarProviderError && e.code === AVATAR_PROVIDER_NOT_CONFIGURED,
  );
});

test('createAvatarProvider uses HeyGen first when configured', async () => {
  const calls = [];
  const provider = createAvatarProvider({
    heygenApiKey: 'hk',
    didApiKey: 'dk',
    fetchImpl: async (url) => {
      calls.push(url);
      return { ok: true, status: 200, json: async () => ({ error: null, data: { video_id: 'vid_9' } }), text: async () => '' };
    },
  });
  const job = await provider(baseReq);
  assert.equal(job.provider, 'heygen');
  assert.equal(job.jobId, 'vid_9');
  assert.equal(job.status, 'processing');
  assert.equal(job.estimatedCredits, AVATAR_VIDEO_CREDIT_COST);
  assert.deepEqual(calls, [HEYGEN_VIDEO_GENERATE_URL]);
});

test('createAvatarProvider falls back to D-ID when HeyGen fails', async () => {
  const calls = [];
  const provider = createAvatarProvider({
    heygenApiKey: 'hk',
    didApiKey: 'dk',
    fetchImpl: async (url) => {
      calls.push(url);
      if (url === HEYGEN_VIDEO_GENERATE_URL) {
        return { ok: false, status: 500, json: async () => ({}), text: async () => 'heygen down' };
      }
      return { ok: true, status: 201, json: async () => ({ id: 'talk_5', status: 'created' }), text: async () => '' };
    },
  });
  const job = await provider(baseReq);
  assert.equal(job.provider, 'did');
  assert.equal(job.jobId, 'talk_5');
  assert.deepEqual(calls, [HEYGEN_VIDEO_GENERATE_URL, DID_TALKS_URL]);
});

test('createAvatarProvider honors preferredProvider', async () => {
  const calls = [];
  const provider = createAvatarProvider({
    heygenApiKey: 'hk',
    didApiKey: 'dk',
    fetchImpl: async (url) => {
      calls.push(url);
      return { ok: true, status: 201, json: async () => ({ id: 'talk_7' }), text: async () => '' };
    },
  });
  const job = await provider({ ...baseReq, preferredProvider: 'did' });
  assert.equal(job.provider, 'did');
  assert.deepEqual(calls, [DID_TALKS_URL]);
});
