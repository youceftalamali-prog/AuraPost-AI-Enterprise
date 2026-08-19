import type { AgentSourceMode } from './types';

export interface AgentWorkflowHandoff {
  mode: AgentSourceMode;
  prompt: string;
  templateId?: string;
  createdAt: number;
}

export const HANDOFF_TTL_MS = 30 * 60 * 1_000;
export const HANDOFF_STORAGE_KEY = 'aura.agent.handoff.v1';

const VALID_MODES: readonly AgentSourceMode[] = [
  'url',
  'image',
  'saved_product',
  'description',
  'template',
];

export function serializeHandoff(handoff: AgentWorkflowHandoff): string {
  return JSON.stringify(handoff);
}

/**
 * Parse and validate a stored handoff payload. Returns null when the payload is
 * missing, malformed, references an unknown source mode, or has expired past the
 * TTL window (measured against `now`).
 */
export function parseHandoff(
  raw: string | null,
  now: number = Date.now(),
): AgentWorkflowHandoff | null {
  if (!raw) return null;

  let data: unknown;
  try {
    data = JSON.parse(raw);
  } catch {
    return null;
  }

  if (typeof data !== 'object' || data === null) return null;

  const record = data as Record<string, unknown>;
  const { mode, prompt, templateId, createdAt } = record;

  if (typeof mode !== 'string' || !VALID_MODES.includes(mode as AgentSourceMode)) {
    return null;
  }
  if (typeof prompt !== 'string') return null;
  if (typeof createdAt !== 'number' || !Number.isFinite(createdAt)) return null;
  if (now - createdAt > HANDOFF_TTL_MS) return null;

  const result: AgentWorkflowHandoff = {
    mode: mode as AgentSourceMode,
    prompt,
    createdAt,
  };
  if (typeof templateId === 'string') {
    result.templateId = templateId;
  }
  return result;
}
