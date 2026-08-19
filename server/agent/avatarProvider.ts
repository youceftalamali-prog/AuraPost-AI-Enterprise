// server/agent/avatarProvider.ts
// Multilingual talking-avatar video provider for AuraPost (t169).
// HeyGen is the primary provider; D-ID is the automatic fallback. The design
// mirrors openRouterProvider.ts: the pure request builders and response
// parsers take NO I/O so they can be unit tested without any network access,
// `fetch` is injected (FetchLike) so the HTTP path is testable with a mock,
// and the live call is GATED. Without a provider API key the provider throws
// AVATAR_PROVIDER_NOT_CONFIGURED instead of making a request, mirroring the
// billing "not configured" pattern. This keeps CI green and incurs no cost
// until HEYGEN_API_KEY / DID_API_KEY are provided on the deployed VPS.
//
// Both providers are asynchronous: the submit call returns a job id that a
// later polling/webhook step resolves into a finished video URL. This module
// only owns the gated submit; polling lives with the render orchestration.
import type { ScenarioAvatarProvider } from '../templates/scenarioContract';

export const AVATAR_PROVIDER_ERROR = 'AVATAR_PROVIDER_ERROR';
export const AVATAR_PROVIDER_NOT_CONFIGURED = 'AVATAR_PROVIDER_NOT_CONFIGURED';
export const AVATAR_PROVIDER_REQUEST_INVALID = 'AVATAR_PROVIDER_REQUEST_INVALID';
export const AVATAR_PROVIDER_OUTPUT_INVALID = 'AVATAR_PROVIDER_OUTPUT_INVALID';

// Reuse the avatar provider union already defined by the scenario contract so
// the templates UI, TTS layer, and FFmpeg assembly engine all agree on names.
export type AvatarProviderName = ScenarioAvatarProvider;

export const DEFAULT_AVATAR_PROVIDER_ORDER: AvatarProviderName[] = ['heygen', 'did'];
export const HEYGEN_VIDEO_GENERATE_URL = 'https://api.heygen.com/v2/video/generate';
export const DID_TALKS_URL = 'https://api.d-id.com/talks';
export const AVATAR_VIDEO_CREDIT_COST = 40;

export class AvatarProviderError extends Error {
  constructor(
    public readonly code: string,
    message: string,
    public readonly status?: number,
  ) {
    super(message);
    this.name = 'AvatarProviderError';
  }
}

/** Minimal fetch surface we depend on, so we avoid DOM lib coupling in tsc. */
export type FetchLike = (
  url: string,
  init: {
    method: string;
    headers: Record<string, string>;
    body: string;
  },
) => Promise<{
  ok: boolean;
  status: number;
  json: () => Promise<unknown>;
  text: () => Promise<string>;
}>;

export interface AvatarRenderRequest {
  /** Localized line the avatar should speak. */
  script: string;
  /** BCP-47-ish locale tag, e.g. 'ar', 'fr', 'en'. */
  locale: string;
  width: number;
  height: number;
  /** HeyGen avatar id (required for the HeyGen path). */
  avatarId?: string;
  avatarStyle?: string;
  /** Voice id shared by HeyGen and the D-ID ElevenLabs provider. */
  voiceId?: string;
  /** Public image URL for the D-ID talking-head path. */
  sourceImageUrl?: string;
  speed?: number;
  /** Move a specific configured provider to the front of the order. */
  preferredProvider?: AvatarProviderName;
}

export interface AvatarRenderJob {
  provider: AvatarProviderName;
  jobId: string;
  status: 'processing';
  estimatedCredits: number;
}

export interface HeyGenVideoRequestBody {
  video_inputs: Array<{
    character: { type: 'avatar'; avatar_id: string; avatar_style: string };
    voice: { type: 'text'; input_text: string; voice_id: string; speed: number };
    background: { type: 'color'; value: string };
  }>;
  dimension: { width: number; height: number };
}

export interface DidTalkRequestBody {
  source_url: string;
  script: {
    type: 'text';
    input: string;
    subtitles: boolean;
    provider?: { type: 'elevenlabs'; voice_id: string };
  };
  config: { result_format: 'mp4' };
}

function requireField(value: string | undefined, provider: AvatarProviderName, field: string): string {
  if (!value || !value.trim()) {
    throw new AvatarProviderError(
      AVATAR_PROVIDER_REQUEST_INVALID,
      `${provider} avatar render requires a non-empty ${field}.`,
    );
  }
  return value;
}

/** Build a HeyGen v2 `video_inputs` payload from a render request. */
export function buildHeyGenVideoRequest(req: AvatarRenderRequest): HeyGenVideoRequestBody {
  const script = requireField(req.script, 'heygen', 'script');
  const avatarId = requireField(req.avatarId, 'heygen', 'avatarId');
  const voiceId = requireField(req.voiceId, 'heygen', 'voiceId');
  return {
    video_inputs: [
      {
        character: { type: 'avatar', avatar_id: avatarId, avatar_style: req.avatarStyle || 'normal' },
        voice: {
          type: 'text',
          input_text: script,
          voice_id: voiceId,
          speed: typeof req.speed === 'number' ? req.speed : 1,
        },
        background: { type: 'color', value: '#ffffff' },
      },
    ],
    dimension: { width: req.width, height: req.height },
  };
}

/** Build a D-ID `/talks` payload from a render request. */
export function buildDidTalkRequest(req: AvatarRenderRequest): DidTalkRequestBody {
  const script = requireField(req.script, 'did', 'script');
  const sourceUrl = requireField(req.sourceImageUrl, 'did', 'sourceImageUrl');
  const body: DidTalkRequestBody = {
    source_url: sourceUrl,
    script: { type: 'text', input: script, subtitles: false },
    config: { result_format: 'mp4' },
  };
  if (req.voiceId && req.voiceId.trim()) {
    body.script.provider = { type: 'elevenlabs', voice_id: req.voiceId };
  }
  return body;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

/** Parse a HeyGen generate response into a job id. */
export function parseHeyGenResponse(payload: unknown): { jobId: string } {
  if (!isRecord(payload)) {
    throw new AvatarProviderError(AVATAR_PROVIDER_OUTPUT_INVALID, 'HeyGen response was not a JSON object.');
  }
  if (payload.error !== null && payload.error !== undefined) {
    throw new AvatarProviderError(
      AVATAR_PROVIDER_ERROR,
      `HeyGen returned an error: ${JSON.stringify(payload.error).slice(0, 300)}`,
    );
  }
  const data = payload.data;
  const videoId = isRecord(data) && typeof data.video_id === 'string' ? data.video_id : '';
  if (!videoId) {
    throw new AvatarProviderError(AVATAR_PROVIDER_OUTPUT_INVALID, 'HeyGen response did not contain a video_id.');
  }
  return { jobId: videoId };
}

/** Parse a D-ID `/talks` response into a job id. */
export function parseDidResponse(payload: unknown): { jobId: string } {
  if (!isRecord(payload)) {
    throw new AvatarProviderError(AVATAR_PROVIDER_OUTPUT_INVALID, 'D-ID response was not a JSON object.');
  }
  const id = typeof payload.id === 'string' ? payload.id : '';
  if (!id) {
    throw new AvatarProviderError(AVATAR_PROVIDER_OUTPUT_INVALID, 'D-ID response did not contain a talk id.');
  }
  return { jobId: id };
}

export interface AvatarProviderConfig {
  heygenApiKey?: string | null;
  didApiKey?: string | null;
  /** Optional explicit provider preference order. */
  providerOrder?: AvatarProviderName[];
  fetchImpl?: FetchLike;
}

export function isAvatarProviderConfigured(config: AvatarProviderConfig): boolean {
  return Boolean(config.heygenApiKey) || Boolean(config.didApiKey);
}

/**
 * Resolve the effective provider order, keeping only providers whose API key
 * is configured. Duplicates are removed while preserving first-seen order.
 */
export function resolveAvatarProviderOrder(config: AvatarProviderConfig): AvatarProviderName[] {
  const base =
    config.providerOrder && config.providerOrder.length > 0
      ? config.providerOrder
      : DEFAULT_AVATAR_PROVIDER_ORDER;
  const seen = new Set<AvatarProviderName>();
  const ordered: AvatarProviderName[] = [];
  for (const provider of base) {
    if (seen.has(provider)) continue;
    seen.add(provider);
    if (provider === 'heygen' && config.heygenApiKey) ordered.push('heygen');
    else if (provider === 'did' && config.didApiKey) ordered.push('did');
  }
  return ordered;
}

export type AvatarComplete = (req: AvatarRenderRequest) => Promise<AvatarRenderJob>;

async function submit(
  fetchImpl: FetchLike,
  url: string,
  headers: Record<string, string>,
  body: unknown,
  label: string,
): Promise<unknown> {
  let response: { ok: boolean; status: number; json: () => Promise<unknown>; text: () => Promise<string> };
  try {
    response = await fetchImpl(url, { method: 'POST', headers, body: JSON.stringify(body) });
  } catch (error) {
    throw new AvatarProviderError(AVATAR_PROVIDER_ERROR, `Failed to reach ${label}: ${(error as Error).message}`);
  }
  if (!response.ok) {
    const text = await response.text().catch(() => '');
    throw new AvatarProviderError(
      AVATAR_PROVIDER_ERROR,
      `${label} request failed with status ${response.status}: ${text.slice(0, 300)}`,
      response.status,
    );
  }
  try {
    return await response.json();
  } catch (error) {
    throw new AvatarProviderError(AVATAR_PROVIDER_ERROR, `${label} returned invalid JSON: ${(error as Error).message}`);
  }
}

/**
 * Build an avatar renderer bound to the configured providers. The returned
 * function submits one render request, trying each configured provider in
 * order and falling back to the next when a provider errors. It throws
 * AVATAR_PROVIDER_NOT_CONFIGURED when no provider key is present.
 */
export function createAvatarProvider(config: AvatarProviderConfig = {}): AvatarComplete {
  const fetchImpl = config.fetchImpl ?? (globalThis as { fetch?: FetchLike }).fetch;

  return async (req: AvatarRenderRequest): Promise<AvatarRenderJob> => {
    let order = resolveAvatarProviderOrder(config);
    if (order.length === 0) {
      throw new AvatarProviderError(
        AVATAR_PROVIDER_NOT_CONFIGURED,
        'No avatar provider is configured. Set HEYGEN_API_KEY and/or DID_API_KEY to enable avatar rendering.',
      );
    }
    if (req.preferredProvider && order.includes(req.preferredProvider)) {
      order = [req.preferredProvider, ...order.filter((provider) => provider !== req.preferredProvider)];
    }
    if (!fetchImpl) {
      throw new AvatarProviderError(AVATAR_PROVIDER_ERROR, 'No fetch implementation available in this runtime.');
    }

    let lastError: unknown;
    for (const provider of order) {
      try {
        if (provider === 'heygen') {
          const payload = await submit(
            fetchImpl,
            HEYGEN_VIDEO_GENERATE_URL,
            { 'X-Api-Key': String(config.heygenApiKey), 'Content-Type': 'application/json' },
            buildHeyGenVideoRequest(req),
            'HeyGen',
          );
          const { jobId } = parseHeyGenResponse(payload);
          return { provider: 'heygen', jobId, status: 'processing', estimatedCredits: AVATAR_VIDEO_CREDIT_COST };
        }
        const payload = await submit(
          fetchImpl,
          DID_TALKS_URL,
          { Authorization: `Basic ${String(config.didApiKey)}`, 'Content-Type': 'application/json' },
          buildDidTalkRequest(req),
          'D-ID',
        );
        const { jobId } = parseDidResponse(payload);
        return { provider: 'did', jobId, status: 'processing', estimatedCredits: AVATAR_VIDEO_CREDIT_COST };
      } catch (error) {
        lastError = error;
      }
    }
    if (lastError instanceof AvatarProviderError) throw lastError;
    throw new AvatarProviderError(
      AVATAR_PROVIDER_ERROR,
      `All configured avatar providers failed: ${(lastError as Error)?.message ?? 'unknown error'}`,
    );
  };
}
