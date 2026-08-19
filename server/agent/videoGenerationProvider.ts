// server/agent/videoGenerationProvider.ts
// Cinematic AI video-clip generation provider for AuraPost (t171).
//
// This is the *generation* stage that produces raw cinematic clips from a text
// prompt (authored by the agent from the product/market analysis) and an
// optional product image. Those clips are later stitched, captioned, and mixed
// with TTS audio by videoRenderEngine.ts (FFmpeg assembly, t172).
//
// Primary provider: Google Veo 3.1. Fallback provider: Kling. Both run as async
// jobs (submit -> job/operation id -> poll), so this module only *submits* and
// returns a job handle; polling/fetching is handled by videoRenderJobs.
//
// Design mirrors openRouterProvider.ts / avatarProvider.ts / ttsProvider.ts:
//   * pure builders + response parsers take NO network I/O (unit testable),
//   * `fetch` is injected (VideoFetchLike),
//   * the live call is GATED behind provider API keys, so without keys the
//     provider throws VIDEO_GEN_NOT_CONFIGURED and CI stays green + cost-free.
//
// Endpoint base URLs and model ids are CONFIGURABLE (env-overridable). Provider
// APIs evolve quickly, so defaults are best-effort and can be corrected on the
// deployed VPS via env without a code change.

export const VIDEO_GEN_ERROR = 'VIDEO_GEN_ERROR';
export const VIDEO_GEN_NOT_CONFIGURED = 'VIDEO_GEN_NOT_CONFIGURED';
export const VIDEO_GEN_REQUEST_INVALID = 'VIDEO_GEN_REQUEST_INVALID';
export const VIDEO_GEN_OUTPUT_INVALID = 'VIDEO_GEN_OUTPUT_INVALID';

export type VideoGenProviderName = 'veo' | 'kling';

export const DEFAULT_VIDEO_PROVIDER_ORDER: VideoGenProviderName[] = ['veo', 'kling'];

// --- Veo (Google Generative Language API) defaults ---
export const DEFAULT_VEO_BASE_URL = 'https://generativelanguage.googleapis.com/v1beta';
export const DEFAULT_VEO_MODEL = 'veo-3.1-generate-preview';

// --- Kling defaults ---
export const DEFAULT_KLING_BASE_URL = 'https://api.klingai.com';
export const DEFAULT_KLING_MODEL = 'kling-v2';

// A cinematic clip is billed as a flat cost per generated clip.
export const VIDEO_CLIP_CREDIT_COST = 120;
export const DEFAULT_VIDEO_ASPECT_RATIO = '9:16';
export const DEFAULT_VIDEO_DURATION_SECONDS = 5;

export class VideoGenError extends Error {
  constructor(
    public readonly code: string,
    message: string,
    public readonly status?: number,
  ) {
    super(message);
    this.name = 'VideoGenError';
  }
}

/** Minimal injected fetch surface for a JSON response. */
export type VideoFetchLike = (
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

export interface VideoGenRequest {
  /** Cinematic prompt authored by the agent. */
  prompt: string;
  aspectRatio?: string;
  durationSeconds?: number;
  negativePrompt?: string;
  /** Optional product still to animate (image-to-video). */
  imageBase64?: string;
  imageMimeType?: string;
  /** Model override; otherwise the provider default is used. */
  model?: string;
}

export interface VideoGenJob {
  provider: VideoGenProviderName;
  /** Provider job/operation handle to poll later. */
  jobId: string;
  status: 'processing';
  model: string;
  estimatedCredits: number;
}

/** Estimate credits for one clip (flat cost, min one clip). */
export function estimateVideoCredits(clips: number = 1): number {
  const count = Number.isFinite(clips) && clips > 0 ? Math.ceil(clips) : 1;
  return count * VIDEO_CLIP_CREDIT_COST;
}

function requirePrompt(prompt: string): void {
  if (!prompt || !prompt.trim()) {
    throw new VideoGenError(VIDEO_GEN_REQUEST_INVALID, 'Video generation requires a non-empty prompt.');
  }
}

// --- Veo request/response (pure) ---

export interface VeoRequestBody {
  instances: Array<{
    prompt: string;
    image?: { imageBytes: string; mimeType: string };
  }>;
  parameters: {
    aspectRatio: string;
    durationSeconds: number;
    negativePrompt?: string;
  };
}

export function buildVeoUrl(baseUrl: string, model: string, apiKey: string): string {
  const base = (baseUrl || DEFAULT_VEO_BASE_URL).replace(/\/+$/, '');
  return `${base}/models/${encodeURIComponent(model)}:predictLongRunning?key=${encodeURIComponent(apiKey)}`;
}

export function buildVeoRequestBody(req: VideoGenRequest): VeoRequestBody {
  requirePrompt(req.prompt);
  const instance: VeoRequestBody['instances'][number] = { prompt: req.prompt };
  if (req.imageBase64 && req.imageBase64.trim()) {
    instance.image = { imageBytes: req.imageBase64, mimeType: req.imageMimeType || 'image/png' };
  }
  const parameters: VeoRequestBody['parameters'] = {
    aspectRatio: req.aspectRatio || DEFAULT_VIDEO_ASPECT_RATIO,
    durationSeconds: req.durationSeconds && req.durationSeconds > 0 ? Math.ceil(req.durationSeconds) : DEFAULT_VIDEO_DURATION_SECONDS,
  };
  if (req.negativePrompt && req.negativePrompt.trim()) parameters.negativePrompt = req.negativePrompt;
  return { instances: [instance], parameters };
}

/** Veo returns a long-running operation; its `name` is the poll handle. */
export function parseVeoResponse(payload: unknown): string {
  const name = (payload as { name?: unknown })?.name;
  if (typeof name !== 'string' || !name.trim()) {
    throw new VideoGenError(VIDEO_GEN_OUTPUT_INVALID, 'Veo response did not include an operation name.');
  }
  return name;
}

// --- Kling request/response (pure) ---

export interface KlingRequestBody {
  model_name: string;
  prompt: string;
  aspect_ratio: string;
  duration: string;
  negative_prompt?: string;
  image?: string;
}

/** Kling uses different endpoints for text2video vs image2video. */
export function buildKlingUrl(baseUrl: string, hasImage: boolean): string {
  const base = (baseUrl || DEFAULT_KLING_BASE_URL).replace(/\/+$/, '');
  return `${base}/v1/videos/${hasImage ? 'image2video' : 'text2video'}`;
}

export function buildKlingRequestBody(req: VideoGenRequest, model: string): KlingRequestBody {
  requirePrompt(req.prompt);
  const body: KlingRequestBody = {
    model_name: model,
    prompt: req.prompt,
    aspect_ratio: req.aspectRatio || DEFAULT_VIDEO_ASPECT_RATIO,
    duration: String(req.durationSeconds && req.durationSeconds > 0 ? Math.ceil(req.durationSeconds) : DEFAULT_VIDEO_DURATION_SECONDS),
  };
  if (req.negativePrompt && req.negativePrompt.trim()) body.negative_prompt = req.negativePrompt;
  if (req.imageBase64 && req.imageBase64.trim()) body.image = req.imageBase64;
  return body;
}

/** Kling wraps results in { code, message, data: { task_id } }. */
export function parseKlingResponse(payload: unknown): string {
  const data = payload as { code?: unknown; message?: unknown; data?: { task_id?: unknown } };
  if (typeof data?.code === 'number' && data.code !== 0) {
    throw new VideoGenError(VIDEO_GEN_ERROR, `Kling returned error code ${data.code}: ${String(data.message ?? '')}`);
  }
  const taskId = data?.data?.task_id;
  if (typeof taskId !== 'string' || !taskId.trim()) {
    throw new VideoGenError(VIDEO_GEN_OUTPUT_INVALID, 'Kling response did not include a task_id.');
  }
  return taskId;
}

// --- Provider config + orchestration ---

export interface VideoGenProviderConfig {
  veoApiKey?: string | null;
  klingApiKey?: string | null;
  veoBaseUrl?: string;
  klingBaseUrl?: string;
  veoModel?: string;
  klingModel?: string;
  fetchImpl?: VideoFetchLike;
}

export function isVideoProviderConfigured(
  config: VideoGenProviderConfig,
  provider: VideoGenProviderName,
): boolean {
  return provider === 'veo' ? Boolean(config.veoApiKey) : Boolean(config.klingApiKey);
}

/**
 * Resolve the provider order, honoring a preferred provider and dropping any
 * providers that lack an API key. Returns an empty array when nothing is
 * configured.
 */
export function resolveVideoProviderOrder(
  config: VideoGenProviderConfig,
  preferred?: VideoGenProviderName,
): VideoGenProviderName[] {
  let order = [...DEFAULT_VIDEO_PROVIDER_ORDER];
  if (preferred) order = [preferred, ...order.filter((p) => p !== preferred)];
  return order.filter((p) => isVideoProviderConfigured(config, p));
}

export type VideoGenerate = (
  req: VideoGenRequest,
  preferred?: VideoGenProviderName,
) => Promise<VideoGenJob>;

async function submitVeo(
  config: VideoGenProviderConfig,
  fetchImpl: VideoFetchLike,
  req: VideoGenRequest,
): Promise<VideoGenJob> {
  const model = req.model || config.veoModel || DEFAULT_VEO_MODEL;
  const url = buildVeoUrl(config.veoBaseUrl || DEFAULT_VEO_BASE_URL, model, String(config.veoApiKey));
  const body = buildVeoRequestBody(req);
  const response = await fetchImpl(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!response.ok) {
    const text = await response.text().catch(() => '');
    throw new VideoGenError(VIDEO_GEN_ERROR, `Veo request failed with status ${response.status}: ${text.slice(0, 300)}`, response.status);
  }
  const jobId = parseVeoResponse(await response.json());
  return { provider: 'veo', jobId, status: 'processing', model, estimatedCredits: estimateVideoCredits(1) };
}

async function submitKling(
  config: VideoGenProviderConfig,
  fetchImpl: VideoFetchLike,
  req: VideoGenRequest,
): Promise<VideoGenJob> {
  const model = req.model || config.klingModel || DEFAULT_KLING_MODEL;
  const hasImage = Boolean(req.imageBase64 && req.imageBase64.trim());
  const url = buildKlingUrl(config.klingBaseUrl || DEFAULT_KLING_BASE_URL, hasImage);
  const body = buildKlingRequestBody(req, model);
  const response = await fetchImpl(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${String(config.klingApiKey)}`,
    },
    body: JSON.stringify(body),
  });
  if (!response.ok) {
    const text = await response.text().catch(() => '');
    throw new VideoGenError(VIDEO_GEN_ERROR, `Kling request failed with status ${response.status}: ${text.slice(0, 300)}`, response.status);
  }
  const jobId = parseKlingResponse(await response.json());
  return { provider: 'kling', jobId, status: 'processing', model, estimatedCredits: estimateVideoCredits(1) };
}

/**
 * Build a cinematic video-clip generator. It submits a generation job to the
 * first configured provider (Veo by default), falling back to the next
 * provider on a provider-side error. Throws VIDEO_GEN_NOT_CONFIGURED when no
 * provider has an API key.
 */
export function createVideoGenerationProvider(config: VideoGenProviderConfig = {}): VideoGenerate {
  const fetchImpl = config.fetchImpl ?? (globalThis as { fetch?: VideoFetchLike }).fetch;

  return async (req: VideoGenRequest, preferred?: VideoGenProviderName): Promise<VideoGenJob> => {
    requirePrompt(req.prompt);
    const order = resolveVideoProviderOrder(config, preferred);
    if (order.length === 0) {
      throw new VideoGenError(
        VIDEO_GEN_NOT_CONFIGURED,
        'No video provider configured. Set VEO_API_KEY and/or KLING_API_KEY to enable cinematic video generation.',
      );
    }
    if (!fetchImpl) {
      throw new VideoGenError(VIDEO_GEN_ERROR, 'No fetch implementation available in this runtime.');
    }

    let lastError: unknown;
    for (const provider of order) {
      try {
        return provider === 'veo'
          ? await submitVeo(config, fetchImpl, req)
          : await submitKling(config, fetchImpl, req);
      } catch (error) {
        // A request-shape problem is not recoverable by switching providers.
        if (error instanceof VideoGenError && error.code === VIDEO_GEN_REQUEST_INVALID) throw error;
        lastError = error;
      }
    }
    throw new VideoGenError(
      VIDEO_GEN_ERROR,
      `All configured video providers failed. Last error: ${(lastError as Error)?.message ?? 'unknown'}`,
    );
  };
}
