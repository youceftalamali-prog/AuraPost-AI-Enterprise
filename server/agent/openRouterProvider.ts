// OpenRouter (OpenAI-compatible) completion provider for the Phase 3
// tool-calling loop (t143). It adapts `runToolCallingLoop`'s injected
// `ProviderComplete` contract onto OpenRouter's `/chat/completions` endpoint.
//
// Design goals:
//  - The pure request builder and response parser take NO I/O so they can be
//    unit tested without any network access.
//  - `fetch` is injected (FetchLike) so the HTTP path is testable with a mock.
//  - The live call is GATED: without an API key the provider throws
//    AGENT_PROVIDER_NOT_CONFIGURED instead of making a request, mirroring the
//    billing "not configured" pattern. This keeps CI green and incurs no cost
//    until OPENROUTER_API_KEY is provided on the deployed VPS.
import {
  normalizeToolCalls,
  type AgentToolCall,
  type ProviderMessage,
  type ProviderTool,
} from './toolCallingModel';
import type { ProviderComplete, ProviderCompletion } from './toolCallingLoop';

export const AGENT_PROVIDER_ERROR = 'AGENT_PROVIDER_ERROR';
export const AGENT_PROVIDER_NOT_CONFIGURED = 'AGENT_PROVIDER_NOT_CONFIGURED';

export class AgentProviderError extends Error {
  constructor(
    public readonly code: string,
    message: string,
    public readonly status?: number,
  ) {
    super(message);
    this.name = 'AgentProviderError';
  }
}

// Default model: Qwen3-VL 235B A22B Instruct (Alibaba) via OpenRouter. Chosen
// for the AuraPost workload as a native vision-language model with the
// strongest Arabic support in its class (multilingual OCR + generation),
// native tool-calling, and structured outputs at a competitive price
// (~$0.30/$1.50 per 1M tokens). It powers the LLM "brain": hashtags, captions,
// product-image analysis (vision), and authoring the prompts that drive
// image/video generation. NOTE: this LLM does NOT render image pixels or
// video; those come from dedicated providers (image model such as Nano Banana
// Pro / Seedream, HeyGen/D-ID for avatars, Veo/Kling for cinematic clips,
// FFmpeg for assembly). Override per deployment with the OPENROUTER_MODEL
// environment variable (e.g. 'qwen/qwen3-vl-30b-a3b-instruct' for lower cost,
// or 'google/gemini-2.5-flash').
export const DEFAULT_OPENROUTER_MODEL = 'qwen/qwen3-vl-235b-a22b-instruct';
export const DEFAULT_OPENROUTER_BASE_URL = 'https://openrouter.ai/api/v1';

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

export interface OpenRouterConfig {
  apiKey?: string | null;
  model?: string;
  baseUrl?: string;
  /** Sent as HTTP-Referer, used by OpenRouter for attribution/ranking. */
  referer?: string;
  /** Sent as X-Title, used by OpenRouter for attribution/ranking. */
  title?: string;
  temperature?: number;
  fetchImpl?: FetchLike;
}

export interface CompletionRequestBody {
  model: string;
  messages: ProviderMessage[];
  tools: ProviderTool[];
  tool_choice: 'auto';
  temperature?: number;
}

export function buildCompletionRequest(args: {
  messages: ProviderMessage[];
  tools: ProviderTool[];
  model: string;
  temperature?: number;
}): CompletionRequestBody {
  const body: CompletionRequestBody = {
    model: args.model,
    messages: args.messages,
    tools: args.tools,
    tool_choice: 'auto',
  };
  if (typeof args.temperature === 'number') {
    body.temperature = args.temperature;
  }
  return body;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

/**
 * Parses an OpenRouter chat-completion payload into a ProviderCompletion.
 * Tool calls are normalized through the shared model helper (which parses the
 * JSON-encoded `function.arguments` and enforces id/name presence).
 */
export function parseCompletionResponse(payload: unknown): ProviderCompletion {
  if (!isRecord(payload)) {
    throw new AgentProviderError(AGENT_PROVIDER_ERROR, 'Provider response was not a JSON object.');
  }
  const choices = payload.choices;
  if (!Array.isArray(choices) || choices.length === 0) {
    throw new AgentProviderError(AGENT_PROVIDER_ERROR, 'Provider response contained no choices.');
  }
  const first = choices[0];
  const message = isRecord(first) ? first.message : undefined;
  if (!isRecord(message)) {
    throw new AgentProviderError(AGENT_PROVIDER_ERROR, 'Provider choice was missing a message.');
  }
  const content = typeof message.content === 'string' ? message.content : '';
  let toolCalls: AgentToolCall[] = [];
  if (message.tool_calls !== undefined && message.tool_calls !== null) {
    try {
      toolCalls = normalizeToolCalls(message.tool_calls);
    } catch (error) {
      throw new AgentProviderError(
        AGENT_PROVIDER_ERROR,
        `Provider returned invalid tool calls: ${(error as Error).message}`,
      );
    }
  }
  const model = typeof payload.model === 'string' ? payload.model : undefined;
  return {
    content,
    toolCalls: toolCalls.length > 0 ? toolCalls : undefined,
    provider: 'openrouter',
    model,
  };
}

export function isProviderConfigured(config: OpenRouterConfig): boolean {
  return Boolean(config.apiKey);
}

/**
 * Builds a ProviderComplete bound to OpenRouter. The returned function performs
 * a single completion call per invocation; the loop runner handles iteration.
 */
export function createOpenRouterProvider(config: OpenRouterConfig = {}): ProviderComplete {
  const apiKey = config.apiKey ?? undefined;
  const model = config.model || DEFAULT_OPENROUTER_MODEL;
  const baseUrl = (config.baseUrl || DEFAULT_OPENROUTER_BASE_URL).replace(/\/+$/, '');
  const fetchImpl = config.fetchImpl ?? (globalThis as { fetch?: FetchLike }).fetch;

  return async ({ messages, tools }) => {
    if (!apiKey) {
      throw new AgentProviderError(
        AGENT_PROVIDER_NOT_CONFIGURED,
        'OpenRouter API key is not configured. Set OPENROUTER_API_KEY to enable the live agent provider.',
      );
    }
    if (!fetchImpl) {
      throw new AgentProviderError(AGENT_PROVIDER_ERROR, 'No fetch implementation available in this runtime.');
    }

    const body = buildCompletionRequest({ messages, tools, model, temperature: config.temperature });
    const headers: Record<string, string> = {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    };
    if (config.referer) headers['HTTP-Referer'] = config.referer;
    if (config.title) headers['X-Title'] = config.title;

    let response: { ok: boolean; status: number; json: () => Promise<unknown>; text: () => Promise<string> };
    try {
      response = await fetchImpl(`${baseUrl}/chat/completions`, {
        method: 'POST',
        headers,
        body: JSON.stringify(body),
      });
    } catch (error) {
      throw new AgentProviderError(AGENT_PROVIDER_ERROR, `Failed to reach OpenRouter: ${(error as Error).message}`);
    }

    if (!response.ok) {
      const text = await response.text().catch(() => '');
      throw new AgentProviderError(
        AGENT_PROVIDER_ERROR,
        `OpenRouter request failed with status ${response.status}: ${text.slice(0, 500)}`,
        response.status,
      );
    }

    let payload: unknown;
    try {
      payload = await response.json();
    } catch (error) {
      throw new AgentProviderError(AGENT_PROVIDER_ERROR, `OpenRouter returned invalid JSON: ${(error as Error).message}`);
    }
    return parseCompletionResponse(payload);
  };
}
