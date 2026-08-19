import test from 'node:test';
import assert from 'node:assert/strict';

import {
  ELEVENLABS_TTS_BASE_URL,
  DEFAULT_ELEVENLABS_MODEL,
  DEFAULT_TTS_OUTPUT_FORMAT,
  TTS_MIME_TYPE,
  TTS_PROVIDER_NOT_CONFIGURED,
  TTS_PROVIDER_REQUEST_INVALID,
  TTS_PROVIDER_OUTPUT_INVALID,
  TTS_PROVIDER_ERROR,
  TtsProviderError,
  resolveTtsModel,
  estimateTtsCredits,
  buildTtsUrl,
  buildTtsRequestBody,
  buildDubbingPlan,
  isTtsProviderConfigured,
  createElevenLabsTtsProvider,
} from '../../server/agent/ttsProvider.ts';

test('resolveTtsModel prefers override then falls back to multilingual', () => {
  assert.equal(resolveTtsModel('ar'), DEFAULT_ELEVENLABS_MODEL);
  assert.equal(resolveTtsModel('fr'), DEFAULT_ELEVENLABS_MODEL);
  assert.equal(resolveTtsModel('en'), DEFAULT_ELEVENLABS_MODEL);
  assert.equal(resolveTtsModel(undefined), DEFAULT_ELEVENLABS_MODEL);
  assert.equal(resolveTtsModel('ar', 'eleven_turbo_v2_5'), 'eleven_turbo_v2_5');
});

test('estimateTtsCredits is zero for empty and at least one otherwise', () => {
  assert.equal(estimateTtsCredits(''), 0);
  assert.equal(estimateTtsCredits('hello'), 30);
  assert.equal(estimateTtsCredits('x'.repeat(1500)), 60);
});

test('buildTtsUrl encodes voice id and output format', () => {
  const url = buildTtsUrl('voice_1');
  assert.ok(url.startsWith(`${ELEVENLABS_TTS_BASE_URL}/voice_1`));
  assert.ok(url.includes(`output_format=${DEFAULT_TTS_OUTPUT_FORMAT}`));
  assert.throws(
    () => buildTtsUrl(''),
    (e) => e instanceof TtsProviderError && e.code === TTS_PROVIDER_REQUEST_INVALID,
  );
});

test('buildTtsRequestBody includes only provided voice settings', () => {
  const body = buildTtsRequestBody({ text: 'مرحبا', modelId: DEFAULT_ELEVENLABS_MODEL, voiceSettings: { stability: 0.5, speed: 1.1 } });
  assert.equal(body.text, 'مرحبا');
  assert.equal(body.model_id, DEFAULT_ELEVENLABS_MODEL);
  assert.deepEqual(body.voice_settings, { stability: 0.5, speed: 1.1 });

  const bare = buildTtsRequestBody({ text: 'hi', modelId: DEFAULT_ELEVENLABS_MODEL });
  assert.equal('voice_settings' in bare, false);

  assert.throws(
    () => buildTtsRequestBody({ text: '  ', modelId: DEFAULT_ELEVENLABS_MODEL }),
    (e) => e instanceof TtsProviderError && e.code === TTS_PROVIDER_REQUEST_INVALID,
  );
});

test('buildDubbingPlan expands localized lines into per-locale requests', () => {
  const plan = buildDubbingPlan({
    defaultVoiceId: 'voice_default',
    scripts: [
      { locale: 'ar', text: 'مرحبا بالمنتج' },
      { locale: 'fr', text: 'Bonjour le produit', voiceId: 'voice_fr' },
      { locale: 'en', text: 'Hello product' },
    ],
  });
  assert.equal(plan.length, 3);
  assert.equal(plan[0].locale, 'ar');
  assert.equal(plan[0].voiceId, 'voice_default');
  assert.equal(plan[0].modelId, DEFAULT_ELEVENLABS_MODEL);
  assert.equal(plan[1].voiceId, 'voice_fr');
  assert.equal(plan[2].voiceId, 'voice_default');
});

test('buildDubbingPlan validates inputs', () => {
  assert.throws(
    () => buildDubbingPlan({ defaultVoiceId: 'v', scripts: [] }),
    (e) => e instanceof TtsProviderError && e.code === TTS_PROVIDER_REQUEST_INVALID,
  );
  assert.throws(
    () => buildDubbingPlan({ defaultVoiceId: 'v', scripts: [{ locale: 'ar', text: '   ' }] }),
    (e) => e instanceof TtsProviderError && e.code === TTS_PROVIDER_REQUEST_INVALID,
  );
  assert.throws(
    () => buildDubbingPlan({ defaultVoiceId: '', scripts: [{ locale: 'ar', text: 'x' }] }),
    (e) => e instanceof TtsProviderError && e.code === TTS_PROVIDER_REQUEST_INVALID,
  );
});

test('isTtsProviderConfigured reflects api key presence', () => {
  assert.equal(isTtsProviderConfigured({}), false);
  assert.equal(isTtsProviderConfigured({ apiKey: '' }), false);
  assert.equal(isTtsProviderConfigured({ apiKey: 'sk-eleven' }), true);
});

test('createElevenLabsTtsProvider throws NOT_CONFIGURED without a key', async () => {
  const synth = createElevenLabsTtsProvider({
    fetchImpl: async () => {
      throw new Error('fetch should not be called when unconfigured');
    },
  });
  await assert.rejects(
    () => synth({ text: 'hi', voiceId: 'voice_1' }),
    (e) => e instanceof TtsProviderError && e.code === TTS_PROVIDER_NOT_CONFIGURED,
  );
});

test('createElevenLabsTtsProvider posts audio request and returns base64 audio', async () => {
  const bytes = new Uint8Array([1, 2, 3, 4]);
  let captured;
  const synth = createElevenLabsTtsProvider({
    apiKey: 'sk-eleven',
    defaultVoiceId: 'voice_1',
    fetchImpl: async (url, init) => {
      captured = { url, init };
      return { ok: true, status: 200, arrayBuffer: async () => bytes.buffer, text: async () => '' };
    },
  });
  const result = await synth({ text: 'Hello product', locale: 'en' });
  assert.equal(result.provider, 'elevenlabs');
  assert.equal(result.audioBase64, Buffer.from(bytes).toString('base64'));
  assert.equal(result.mimeType, TTS_MIME_TYPE);
  assert.equal(result.model, DEFAULT_ELEVENLABS_MODEL);
  assert.equal(result.characters, 'Hello product'.length);
  assert.ok(result.estimatedCredits >= 1);
  assert.ok(captured.url.startsWith(`${ELEVENLABS_TTS_BASE_URL}/voice_1`));
  assert.equal(captured.init.method, 'POST');
  assert.equal(captured.init.headers['xi-api-key'], 'sk-eleven');
  const sent = JSON.parse(captured.init.body);
  assert.equal(sent.model_id, DEFAULT_ELEVENLABS_MODEL);
  assert.equal(sent.text, 'Hello product');
});

test('createElevenLabsTtsProvider raises a provider error on non-2xx', async () => {
  const synth = createElevenLabsTtsProvider({
    apiKey: 'sk-eleven',
    defaultVoiceId: 'voice_1',
    fetchImpl: async () => ({ ok: false, status: 401, arrayBuffer: async () => new ArrayBuffer(0), text: async () => 'unauthorized' }),
  });
  await assert.rejects(
    () => synth({ text: 'hi' }),
    (e) => e instanceof TtsProviderError && e.code === TTS_PROVIDER_ERROR && e.status === 401,
  );
});

test('createElevenLabsTtsProvider rejects empty audio payloads', async () => {
  const synth = createElevenLabsTtsProvider({
    apiKey: 'sk-eleven',
    defaultVoiceId: 'voice_1',
    fetchImpl: async () => ({ ok: true, status: 200, arrayBuffer: async () => new ArrayBuffer(0), text: async () => '' }),
  });
  await assert.rejects(
    () => synth({ text: 'hi' }),
    (e) => e instanceof TtsProviderError && e.code === TTS_PROVIDER_OUTPUT_INVALID,
  );
});
