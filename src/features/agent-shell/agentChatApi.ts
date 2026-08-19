import type { AgentLocale } from './types';

// Client API for the Phase 3 conversational agent. Mirrors the fetch
// conventions in agentWorkflowApi.ts (credentials, JSON, Idempotency-Key on
// writes, UUID guard). The concrete server routes are wired alongside the
// conversation store; these types match the server persistence + tool-calling
// contracts so the UI and backend stay in lockstep.

export type AgentChatRole = 'user' | 'assistant' | 'tool' | 'system';
export type AgentChatMessageStatus = 'streaming' | 'complete' | 'error';

export interface AgentChatToolCall {
  id: string;
  name: string;
  arguments: Record<string, unknown>;
}

export interface AgentChatMessage {
  id: string;
  role: AgentChatRole;
  content: string;
  toolName?: string | null;
  toolCallId?: string | null;
  toolCalls?: AgentChatToolCall[];
  status?: AgentChatMessageStatus;
  createdAt?: string;
}

export interface AgentConversation {
  id: string;
  title: string;
  locale: AgentLocale;
  status: 'active' | 'archived' | 'deleted';
  workflowId: string | null;
  messageCount: number;
  lastMessageAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface AgentChatTurn {
  conversation: AgentConversation;
  messages: AgentChatMessage[];
}

interface ConversationListEnvelope {
  conversations: AgentConversation[];
}

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function conversationPath(conversationId: string): string {
  if (!UUID_PATTERN.test(conversationId)) throw new Error('Aura returned an invalid conversation identifier.');
  return `/api/agent/conversations/${encodeURIComponent(conversationId)}`;
}

async function requestJson<T>(url: string, init?: RequestInit): Promise<T> {
  const response = await fetch(url, {
    credentials: 'include',
    ...init,
    headers: { 'Content-Type': 'application/json', ...(init?.headers || {}) },
  });
  const payload = (await response.json().catch(() => ({}))) as T & { error?: string; code?: string };
  if (!response.ok) {
    const error = new Error(payload.error || 'Aura chat request failed.') as Error & { code?: string };
    error.code = payload.code;
    throw error;
  }
  return payload;
}

export async function listAgentConversations(signal?: AbortSignal): Promise<AgentConversation[]> {
  const result = await requestJson<ConversationListEnvelope>('/api/agent/conversations', { method: 'GET', signal });
  return result.conversations ?? [];
}

export async function loadAgentConversation(conversationId: string, signal?: AbortSignal): Promise<AgentChatTurn> {
  return requestJson<AgentChatTurn>(conversationPath(conversationId), { method: 'GET', signal });
}

export async function createAgentConversation(input: {
  locale: AgentLocale;
  workflowId?: string;
  message?: string;
}): Promise<AgentChatTurn> {
  return requestJson<AgentChatTurn>('/api/agent/conversations', {
    method: 'POST',
    headers: { 'Idempotency-Key': globalThis.crypto.randomUUID() },
    body: JSON.stringify(input),
  });
}

export async function sendAgentChatMessage(
  conversationId: string,
  content: string,
  signal?: AbortSignal,
): Promise<AgentChatTurn> {
  return requestJson<AgentChatTurn>(`${conversationPath(conversationId)}/messages`, {
    method: 'POST',
    headers: { 'Idempotency-Key': globalThis.crypto.randomUUID() },
    body: JSON.stringify({ content }),
    signal,
  });
}
