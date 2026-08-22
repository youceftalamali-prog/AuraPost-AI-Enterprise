// server/agent/ttsProvider.ts
// Multilingual text-to-speech (TTS) + dubbing provider for AuraPost (t170).
// ElevenLabs is the voice engine. We default to the multilingual model so a
// single code path voices Arabic, French, and English lines; "dubbing" a
// two-person scenario into several languages is realized by generating one
// TTS clip per localized line (see buildDubbingPlan) rather than by dubbing an
// existing video. The design mirrors openRouterProvider.ts / avatarProvider.ts:
// pure builders and response handling take NO network I/O so they are unit
// testable, `fetch` is injected (TtsFetchLike), and the live call is GATED.
// Without ELEVENLABS_API_KEY the provider throws TTS_PROVIDER_NOT_CONFIGURED
// instead of making a request, keeping CI green and cost-free until the key is
// set on the deployed VPS.

export const TTS_PROVIDER_ERROR = 'TTS_PROVIDER_ERROR';
export const TTS_PROVIDER_NOT_CONFIGURED = 'TTS_PROVIDER_NOT_CONFIGURED';
export const TTS_PROVIDER_REQUEST_INVALID = 'TTS_PROVIDER_REQUEST_INVALID';
export const TTS_PROVIDER_OUTPUT_INVALID = 'TTS_PROVIDER_OUTPUT_INVALID';

export const ELEVENLABS_TTS_BASE_URL = 'https://api.elevenlabs.io/v1/text-to-speech';
// eleven_multilingual_v2 covers ar/fr/en, so it is our default "dubbing" model.
export const DEFAULT_ELEVENLABS_MODEL = 'eleven_multilingual_v2';
export const DEFAULT_TTS_OUTPUT_FORMAT = 'mp3_44100_128';
export const TTS_MIME_TYPE = 'audio/mpeg';
export const TTS_CREDIT_COST_PER_1K_CHARS = 30;

export class TtsProviderError extends Error {
  constructor(
    public readonly code: string,
    message: string,
    public readonly status?: number,
  ) {
    super(message);
    this.name = 'TtsProviderError';
  }
}

/** Minimal fetch surface for a binary (audio) response, injected for testing. */
export type TtsFetchLike = (
  url: string,
  init: {
    method: string;
    headers: Record<string, string>;
    body: string;
  },
) => Promise<{
  ok: boolean;
  status: number;
  arrayBuffer: () => Promise<ArrayBuffer>;
  text: () => Promise<string>;
}>;

export interface TtsVoiceSettings {
  stability?: number;
  similarity_boost?: number;
  style?: number;
  use_speaker_boost?: boolean;
  speed?: number;
}

export interface TtsRequest {
  text: string;
  /** ElevenLabs voice id; falls back to config.defaultVoiceId when omitted. */
  voiceId?: string;
  /** Locale tag ('ar' | 'fr' | 'en', ...) used to pick a model. */
  locale?: string;
  modelId?: string;
  outputFormat?: string;
  voiceSettings?: TtsVoiceSettings;
}

export interface ElevenLabsTtsBody {
  text: string;
  model_id: string;
  voice_settings?: {
    stability?: number;
    similarity_boost?: number;
    style?: number;
    use_speaker_boost?: boolean;
    speed?: number;
  };
}

export interface TtsAudioResult {
  provider: 'elevenlabs';
  audioBase64: string;
  mimeType: string;
  model: string;
  characters: number;
  estimatedCredits: number;
}

/**
 * Pick the TTS model. An explicit override always wins; otherwise we use the
 * multilingual model, which handles Arabic, French, and English natively.
 */
export function resolveTtsModel(locale?: string, override?: string): string {
  if (override && override.trim()) return override;
  return DEFAULT_ELEVENLABS_MODEL;
}

/** Rough credit estimate based on character count (min 1 credit for any text). */
export function estimateTtsCredits(text: string): number {
  const chars = text ? text.length : 0;
  if (chars === 0) return 0;
  return Math.max(1, Math.ceil(chars / 1000) * TTS_CREDIT_COST_PER_1K_CHARS);
}

/** Build the per-voice TTS endpoint URL, encoding the voice id and format. */
export function buildTtsUrl(voiceId: string, outputFormat: string = DEFAULT_TTS_OUTPUT_FORMAT): string {
  if (!voiceId || !voiceId.trim()) {
    throw new TtsProviderError(TTS_PROVIDER_REQUEST_INVALID, 'TTS request requires a voiceId.');
  }
  return `${ELEVENLABS_TTS_BASE_URL}/${encodeURIComponent(voiceId)}?output_format=${encodeURIComponent(outputFormat)}`;
}

/** Build the JSON body for an ElevenLabs synthesize call. */
export function buildTtsRequestBody(args: { text: string; modelId: string; voiceSettings?: TtsVoiceSettings }): ElevenLabsTtsBody {
  if (!args.text || !args.text.trim()) {
    throw new TtsProviderError(TTS_PROVIDER_REQUEST_INVALID, 'TTS request requires non-empty text.');
  }
  const body: ElevenLabsTtsBody = { text: args.text, model_id: args.modelId };
  const settings = args.voiceSettings;
  if (settings) {
    const voiceSettings: NonNullable<ElevenLabsTtsBody['voice_settings']> = {};
    if (typeof settings.stability === 'number') voiceSettings.stability = settings.stability;
    if (typeof settings.similarity_boost === 'number') voiceSettings.similarity_boost = settings.similarity_boost;
    if (typeof settings.style === 'number') voiceSettings.style = settings.style;
    if (typeof settings.use_speaker_boost === 'boolean') voiceSettings.use_speaker_boost = settings.use_speaker_boost;
    if (typeof settings.speed === 'number') voiceSettings.speed = settings.speed;
    if (Object.keys(voiceSettings).length > 0) body.voice_settings = voiceSettings;
  }
  return body;
}

export interface DubbingScriptLine {
  locale: string;
  text: string;
  voiceId?: string;
}

export interface DubbingPlanInput {
  scripts: DubbingScriptLine[];
  defaultVoiceId: string;
  modelId?: string;
  outputFormat?: string;
  voiceSettings?: TtsVoiceSettings;
}

/**
 * Expand a set of localized script lines into one TTS request per line. This
 * is the multilingual dubbing mechanism: each locale gets its own synthesized
 * clip (with its own voice when provided), voiced by the multilingual model.
 */
export function buildDubbingPlan(input: DubbingPlanInput): TtsRequest[] {
  if (!input.scripts || input.scripts.length === 0) {
    throw new TtsProviderError(TTS_PROVIDER_REQUEST_INVALID, 'Dubbing plan requires at least one script line.');
  }
  if (!input.defaultVoiceId || !input.defaultVoiceId.trim()) {
    throw new TtsProviderError(TTS_PROVIDER_REQUEST_INVALID, 'Dubbing plan requires a defaultVoiceId.');
  }
  return input.scripts.map((line) => {
    if (!line.text || !line.text.trim()) {
      throw new TtsProviderError(
        TTS_PROVIDER_REQUEST_INVALID,
        `Dubbing line for locale ${line.locale || '(unknown)'} has empty text.`,
      );
    }
    return {
      text: line.text,
      voiceId: line.voiceId && line.voiceId.trim() ? line.voiceId : input.defaultVoiceId,
      locale: line.locale,
      modelId: resolveTtsModel(line.locale, input.modelId),
      outputFormat: input.outputFormat,
      voiceSettings: input.voiceSettings,
    };
  });
}

export interface TtsProviderConfig {
  apiKey?: string | null;
  defaultVoiceId?: string;
  model?: string;
  outputFormat?: string;
  fetchImpl?: TtsFetchLike;
}

export function isTtsProviderConfigured(config: TtsProviderConfig): boolean {
  return Boolean(config.apiKey);
}

export type TtsComplete = (req: TtsRequest) => Promise<TtsAudioResult>;

/**
 * Build a TTS synthesizer bound to the configured ElevenLabs key. The returned
 * function synthesizes one line and returns base64-encoded audio. It throws
 * TTS_PROVIDER_NOT_CONFIGURED when no API key is present.
 */
export function createElevenLabsTtsProvider(config: TtsProviderConfig = {}): TtsComplete {
  const fetchImpl = config.fetchImpl ?? (globalThis as { fetch?: TtsFetchLike }).fetch;

  return async (req: TtsRequest): Promise<TtsAudioResult> => {
    if (!isTtsProviderConfigured(config)) {
      throw new TtsProviderError(
        TTS_PROVIDER_NOT_CONFIGURED,
        'ElevenLabs is not configured. Set ELEVENLABS_API_KEY to enable text-to-speech.',
      );
    }
    if (!fetchImpl) {
      throw new TtsProviderError(TTS_PROVIDER_ERROR, 'No fetch implementation available in this runtime.');
    }

    const voiceId = req.voiceId && req.voiceId.trim() ? req.voiceId : config.defaultVoiceId;
    if (!voiceId || !voiceId.trim()) {
      throw new TtsProviderError(TTS_PROVIDER_REQUEST_INVALID, 'TTS request requires a voiceId or a config.defaultVoiceId.');
    }
    const model = resolveTtsModel(req.locale, req.modelId ?? config.model);
    const outputFormat = req.outputFormat ?? config.outputFormat ?? DEFAULT_TTS_OUTPUT_FORMAT;
    const url = buildTtsUrl(voiceId, outputFormat);
    const body = buildTtsRequestBody({ text: req.text, modelId: model, voiceSettings: req.voiceSettings });

    let response: { ok: boolean; status: number; arrayBuffer: () => Promise<ArrayBuffer>; text: () => Promise<string> };
    try {
      response = await fetchImpl(url, {
        method: 'POST',
        headers: {
          'xi-api-key': String(config.apiKey),
          'Content-Type': 'application/json',
          Accept: TTS_MIME_TYPE,
        },
        body: JSON.stringify(body),
      });
    } catch (error) {
      throw new TtsProviderError(TTS_PROVIDER_ERROR, `Failed to reach ElevenLabs: ${(error as Error).message}`);
    }
    if (!response.ok) {
      const text = await response.text().catch(() => '');
      throw new TtsProviderError(
        TTS_PROVIDER_ERROR,
        `ElevenLabs request failed with status ${response.status}: ${text.slice(0, 300)}`,
        response.status,
      );
    }

    let buffer: ArrayBuffer;
    try {
      buffer = await response.arrayBuffer();
    } catch (error) {
      throw new TtsProviderError(TTS_PROVIDER_OUTPUT_INVALID, `ElevenLabs returned unreadable audio: ${(error as Error).message}`);
    }
    const bytes = new Uint8Array(buffer);
    if (bytes.byteLength === 0) {
      throw new TtsProviderError(TTS_PROVIDER_OUTPUT_INVALID, 'ElevenLabs returned an empty audio payload.');
    }

    return {
      provider: 'elevenlabs',
      audioBase64: Buffer.from(bytes).toString('base64'),
      mimeType: TTS_MIME_TYPE,
      model,
      characters: req.text.length,
      estimatedCredits: estimateTtsCredits(req.text),
    };
  };
}
