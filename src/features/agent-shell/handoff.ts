import type { AgentSourceMode } from './types';

export interface AgentWorkflowHandoff {
  mode: AgentSourceMode;
  prompt: string;
  templateId?: string;
  createdAt: number;
}

let currentHandoff: AgentWorkflowHandoff | null = null;
const HANDOFF_TTL_MS = 30 * 60 * 1_000;

export function setAgentWorkflowHandoff(
  handoff: Omit<AgentWorkflowHandoff, 'createdAt'>,
): void {
  currentHandoff = { ...handoff, createdAt: Date.now() };
}

export function getAgentWorkflowHandoff(): AgentWorkflowHandoff | null {
  if (!currentHandoff) return null;
  if (Date.now() - currentHandoff.createdAt > HANDOFF_TTL_MS) {
    currentHandoff = null;
    return null;
  }
  return { ...currentHandoff };
}
