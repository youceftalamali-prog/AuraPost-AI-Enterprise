// Pure, dependency-free contracts for the agent chat persistence layer (Phase 3).
// Deliberately imports nothing from `pg` or any I/O module so it can be unit
// tested in isolation (see tests/unit/aura-conversation-contracts.test.mjs) and
// reused by both the HTTP router and the tool-calling loop.
import { AGENT_LOCALES, AGENT_SOURCE_MODES, type AgentLocale, type AgentSourceMode } from './contracts';

export const AGENT_MESSAGE_ROLES = ['user', 'assistant', 'tool', 'system'] as const;
export type AgentMessageRole = (typeof AGENT_MESSAGE_ROLES)[number];

export const AGENT_MESSAGE_STATUSES = ['streaming', 'complete', 'error'] as const;
export type AgentMessageStatus = (typeof AGENT_MESSAGE_STATUSES)[number];

export const AGENT_CONVERSATION_STATUSES = ['active', 'archived', 'deleted'] as const;
export type AgentConversationStatus = (typeof AGENT_CONVERSATION_STATUSES)[number];

export const MAX_MESSAGE_CONTENT_CHARS = 32_000;
export const MAX_CONVERSATION_TITLE_CHARS = 120;
export const MAX_JSON_FIELD_BYTES = 64 * 1024;
export const DEFAULT_CONVERSATION_TITLE = 'New conversation';

export class AgentConversationError extends Error {
  constructor(public readonly code: string, message: string) {
    super(message);
    this.name = 'AgentConversationError';
  }
}

const CONTROL_CHARS = /[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g;

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function cleanText(value: unknown, field: string, maxLength: number, required = false): string | undefined {
  if (value === undefined || value === null) {
    if (required) throw new AgentConversationError('INVALID_AGENT_CONVERSATION', `${field} is required.`);
    return undefined;
  }
  if (typeof value !== 'string') throw new AgentConversationError('INVALID_AGENT_CONVERSATION', `${field} must be a string.`);
  const cleaned = value.replace(CONTROL_CHARS, '').trim();
  if (required && !cleaned) throw new AgentConversationError('INVALID_AGENT_CONVERSATION', `${field} is required.`);
  if (cleaned.length > maxLength) throw new AgentConversationError('INVALID_AGENT_CONVERSATION', `${field} exceeds ${maxLength} characters.`);
  return cleaned;
}

function boundedJson(value: unknown, field: string): Record<string, unknown> | undefined {
  if (value === undefined || value === null) return undefined;
  if (!isRecord(value)) throw new AgentConversationError('INVALID_AGENT_CONVERSATION', `${field} must be an object.`);
  if (Buffer.byteLength(JSON.stringify(value), 'utf8') > MAX_JSON_FIELD_BYTES) {
    throw new AgentConversationError('INVALID_AGENT_CONVERSATION', `${field} exceeds ${MAX_JSON_FIELD_BYTES} bytes.`);
  }
  return value;
}

/**
 * Derives a short, human-readable conversation title from the first user
 * message. Collapses whitespace, strips control characters, and truncates with
 * an ellipsis. Falls back to a caller-provided default when there is no usable
 * text (so the UI can localize the empty-conversation label).
 */
export function deriveConversationTitle(firstUserMessage: unknown, fallback: string = DEFAULT_CONVERSATION_TITLE): string {
  const text = typeof firstUserMessage === 'string' ? firstUserMessage.replace(CONTROL_CHARS, '').replace(/\s+/g, ' ').trim() : '';
  if (!text) return fallback;
  if (text.length <= MAX_CONVERSATION_TITLE_CHARS) return text;
  return `${text.slice(0, MAX_CONVERSATION_TITLE_CHARS - 1).trimEnd()}\u2026`;
}

export interface AppendMessageInput {
  role: AgentMessageRole;
  content: string;
  status: AgentMessageStatus;
  toolName?: string;
  toolCallId?: string;
  toolCalls?: Record<string, unknown>;
  toolResult?: Record<string, unknown>;
  provider?: string;
  model?: string;
}

/**
 * Validates and normalizes a single message before it is persisted. `tool`
 * messages must carry both a toolName and the toolCallId they answer; all other
 * roles must not smuggle tool wiring in. Assistant messages may have empty
 * content only while they are still streaming or when they carry tool calls.
 */
export function normalizeAppendMessage(value: unknown): AppendMessageInput {
  if (!isRecord(value)) throw new AgentConversationError('INVALID_AGENT_CONVERSATION', 'Message body must be an object.');
  if (!AGENT_MESSAGE_ROLES.includes(value.role as AgentMessageRole)) {
    throw new AgentConversationError('INVALID_AGENT_CONVERSATION', 'Unsupported message role.');
  }
  const role = value.role as AgentMessageRole;
  const status: AgentMessageStatus = value.status === undefined
    ? 'complete'
    : (() => {
        if (!AGENT_MESSAGE_STATUSES.includes(value.status as AgentMessageStatus)) {
          throw new AgentConversationError('INVALID_AGENT_CONVERSATION', 'Unsupported message status.');
        }
        return value.status as AgentMessageStatus;
      })();
  const content = cleanText(value.content ?? '', 'content', MAX_MESSAGE_CONTENT_CHARS) ?? '';
  const toolName = cleanText(value.toolName, 'toolName', 100);
  const toolCallId = cleanText(value.toolCallId, 'toolCallId', 200);
  const toolCalls = boundedJson(value.toolCalls, 'toolCalls');
  const toolResult = boundedJson(value.toolResult, 'toolResult');

  if (role === 'tool') {
    if (!toolName) throw new AgentConversationError('INVALID_AGENT_CONVERSATION', 'tool messages require toolName.');
    if (!toolCallId) throw new AgentConversationError('INVALID_AGENT_CONVERSATION', 'tool messages require toolCallId.');
  } else if (toolName || toolResult) {
    throw new AgentConversationError('INVALID_AGENT_CONVERSATION', 'Only tool messages may carry toolName/toolResult.');
  }

  const hasToolCalls = Boolean(toolCalls);
  const contentOptional = status === 'streaming' || (role === 'assistant' && hasToolCalls) || role === 'tool';
  if (!content && !contentOptional) {
    throw new AgentConversationError('INVALID_AGENT_CONVERSATION', 'content is required.');
  }

  return {
    role,
    content,
    status,
    toolName,
    toolCallId,
    toolCalls,
    toolResult,
    provider: cleanText(value.provider, 'provider', 100),
    model: cleanText(value.model, 'model', 200),
  };
}

export interface CreateConversationInput {
  title?: string;
  locale: AgentLocale;
  sourceMode?: AgentSourceMode;
  workflowId?: string;
  metadata?: Record<string, unknown>;
  initialMessage?: AppendMessageInput;
}

export function normalizeCreateConversation(value: unknown): CreateConversationInput {
  if (!isRecord(value)) throw new AgentConversationError('INVALID_AGENT_CONVERSATION', 'Request body must be an object.');
  const locale: AgentLocale = value.locale === undefined
    ? 'ar'
    : (() => {
        if (!AGENT_LOCALES.includes(value.locale as AgentLocale)) {
          throw new AgentConversationError('INVALID_AGENT_CONVERSATION', 'Unsupported locale.');
        }
        return value.locale as AgentLocale;
      })();
  let sourceMode: AgentSourceMode | undefined;
  if (value.sourceMode !== undefined) {
    if (!AGENT_SOURCE_MODES.includes(value.sourceMode as AgentSourceMode)) {
      throw new AgentConversationError('INVALID_AGENT_CONVERSATION', 'Unsupported sourceMode.');
    }
    sourceMode = value.sourceMode as AgentSourceMode;
  }
  return {
    title: cleanText(value.title, 'title', MAX_CONVERSATION_TITLE_CHARS),
    locale,
    sourceMode,
    workflowId: cleanText(value.workflowId, 'workflowId', 200),
    metadata: boundedJson(value.metadata, 'metadata'),
    initialMessage: value.initialMessage === undefined ? undefined : normalizeAppendMessage(value.initialMessage),
  };
}

export interface ConversationRow {
  id: string;
  workspace_id: string;
  user_id: string;
  workflow_id: string | null;
  title: string;
  source_mode: string | null;
  locale: string;
  status: string;
  message_count: number;
  last_message_at: Date | string | null;
  metadata: Record<string, unknown> | null;
  created_at: Date | string;
  updated_at: Date | string;
}

export interface MessageRow {
  id: string;
  conversation_id: string;
  seq: number;
  role: string;
  content: string;
  tool_name: string | null;
  tool_call_id: string | null;
  tool_calls: Record<string, unknown> | null;
  tool_result: Record<string, unknown> | null;
  status: string;
  provider: string | null;
  model: string | null;
  prompt_tokens: number | null;
  completion_tokens: number | null;
  credits_charged: number;
  error_code: string | null;
  created_at: Date | string;
}

function toIso(value: Date | string | null): string | null {
  if (value === null || value === undefined) return null;
  return new Date(value).toISOString();
}

export function serializeConversationRow(row: ConversationRow) {
  return {
    id: row.id,
    workflowId: row.workflow_id,
    title: row.title,
    sourceMode: row.source_mode,
    locale: row.locale,
    status: row.status,
    messageCount: row.message_count,
    lastMessageAt: toIso(row.last_message_at),
    metadata: row.metadata || {},
    createdAt: new Date(row.created_at).toISOString(),
    updatedAt: new Date(row.updated_at).toISOString(),
  };
}

export function serializeMessageRow(row: MessageRow) {
  return {
    id: row.id,
    conversationId: row.conversation_id,
    seq: row.seq,
    role: row.role,
    content: row.content,
    toolName: row.tool_name,
    toolCallId: row.tool_call_id,
    toolCalls: row.tool_calls,
    toolResult: row.tool_result,
    status: row.status,
    provider: row.provider,
    model: row.model,
    promptTokens: row.prompt_tokens,
    completionTokens: row.completion_tokens,
    creditsCharged: row.credits_charged,
    errorCode: row.error_code,
    createdAt: new Date(row.created_at).toISOString(),
  };
}
