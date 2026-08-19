import {
  HANDOFF_STORAGE_KEY,
  parseHandoff,
  serializeHandoff,
  type AgentWorkflowHandoff,
} from './handoffStorage';

export type { AgentWorkflowHandoff } from './handoffStorage';

// In-memory fallback used when persistent storage is unavailable (SSR, unit
// tests, privacy modes that throw on access, or quota-exceeded writes).
let memoryFallback: AgentWorkflowHandoff | null = null;

function storage(): Storage | null {
  try {
    return (globalThis as { localStorage?: Storage }).localStorage ?? null;
  } catch {
    return null;
  }
}

export function setAgentWorkflowHandoff(
  handoff: Omit<AgentWorkflowHandoff, 'createdAt'>,
): void {
  const full: AgentWorkflowHandoff = { ...handoff, createdAt: Date.now() };
  memoryFallback = full;

  const store = storage();
  if (store) {
    try {
      store.setItem(HANDOFF_STORAGE_KEY, serializeHandoff(full));
    } catch {
      // Keep the in-memory copy when persistence fails (e.g. quota/security).
    }
  }
}

export function getAgentWorkflowHandoff(): AgentWorkflowHandoff | null {
  const store = storage();
  if (store) {
    try {
      const raw = store.getItem(HANDOFF_STORAGE_KEY);
      if (raw !== null) {
        const parsed = parseHandoff(raw);
        if (parsed) {
          memoryFallback = parsed;
          return parsed;
        }
        // Expired or malformed: clear both layers.
        store.removeItem(HANDOFF_STORAGE_KEY);
        memoryFallback = null;
        return null;
      }
      // Nothing persisted: fall through to the in-memory fallback below.
    } catch {
      // Storage read failed: fall through to the in-memory fallback below.
    }
  }

  if (memoryFallback) {
    const stillValid = parseHandoff(serializeHandoff(memoryFallback));
    if (stillValid) return stillValid;
    memoryFallback = null;
  }
  return null;
}

export function clearAgentWorkflowHandoff(): void {
  memoryFallback = null;
  const store = storage();
  if (store) {
    try {
      store.removeItem(HANDOFF_STORAGE_KEY);
    } catch {
      // Ignore storage removal failures.
    }
  }
}
