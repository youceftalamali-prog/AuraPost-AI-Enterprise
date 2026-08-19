// PostgreSQL persistence layer for the Phase 3 agent chat (t143).
//
// Backs the aura_agent_conversations / aura_agent_messages tables created by
// migration 013. To stay unit testable WITHOUT a live database, this module:
//  - imports nothing from `pg`;
//  - exposes pure SQL/param builders (buildInsert*, NEXT_SEQ_SQL, ...) that are
//    asserted directly in tests so parameter drift is caught;
//  - executes through an injected `PoolLike` (satisfied by a real pg Pool at the
//    router, and by a scripted fake pool in tests).
// Row (de)serialization is delegated to the already-tested contracts module.
import crypto from 'node:crypto';
import {
  serializeConversationRow,
  serializeMessageRow,
  deriveConversationTitle,
  DEFAULT_CONVERSATION_TITLE,
  AgentConversationError,
  type ConversationRow,
  type MessageRow,
  type CreateConversationInput,
  type AppendMessageInput,
} from './conversationContracts';

export const CONVERSATION_ID_PREFIX = 'aconv';
export const MESSAGE_ID_PREFIX = 'amsg';
export const DEFAULT_CONVERSATION_PAGE_SIZE = 20;
export const MAX_CONVERSATION_PAGE_SIZE = 50;

export const AGENT_CONVERSATION_NOT_FOUND = 'AGENT_CONVERSATION_NOT_FOUND';
export const AGENT_CONVERSATION_WRITE_FAILED = 'AGENT_CONVERSATION_WRITE_FAILED';

/** Minimal query surface satisfied by pg Pool and PoolClient. */
export interface Queryable {
  query<R extends Record<string, unknown> = Record<string, unknown>>(
    text: string,
    params?: unknown[],
  ): Promise<{ rows: R[]; rowCount?: number | null }>;
}

export interface PoolClientLike extends Queryable {
  release(): void;
}

export interface PoolLike extends Queryable {
  connect(): Promise<PoolClientLike>;
}

export interface SqlStatement {
  text: string;
  values: unknown[];
}

export function generateId(prefix: string): string {
  return `${prefix}_${crypto.randomUUID()}`;
}

export function clampPageSize(limit?: number): number {
  if (typeof limit !== 'number' || !Number.isFinite(limit) || limit <= 0) {
    return DEFAULT_CONVERSATION_PAGE_SIZE;
  }
  return Math.min(Math.floor(limit), MAX_CONVERSATION_PAGE_SIZE);
}

// --- Pure SQL builders ------------------------------------------------------

export function buildInsertConversationSql(row: {
  id: string;
  workspaceId: string;
  userId: string;
  workflowId: string | null;
  title: string;
  sourceMode: string | null;
  locale: string;
  metadata: Record<string, unknown>;
}): SqlStatement {
  return {
    text: `INSERT INTO aura_agent_conversations
      (id, workspace_id, user_id, workflow_id, title, source_mode, locale, metadata)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8::jsonb)
      RETURNING *`,
    values: [
      row.id,
      row.workspaceId,
      row.userId,
      row.workflowId,
      row.title,
      row.sourceMode,
      row.locale,
      JSON.stringify(row.metadata ?? {}),
    ],
  };
}

export const NEXT_SEQ_SQL =
  'SELECT COALESCE(MAX(seq), 0) + 1 AS next_seq FROM aura_agent_messages WHERE conversation_id = $1';

export function buildInsertMessageSql(row: {
  id: string;
  conversationId: string;
  workspaceId: string;
  userId: string;
  seq: number;
  message: AppendMessageInput;
  creditsCharged: number;
}): SqlStatement {
  const { message } = row;
  return {
    text: `INSERT INTO aura_agent_messages
      (id, conversation_id, workspace_id, user_id, seq, role, content, tool_name,
       tool_call_id, tool_calls, tool_result, status, provider, model, credits_charged)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10::jsonb, $11::jsonb, $12, $13, $14, $15)
      RETURNING *`,
    values: [
      row.id,
      row.conversationId,
      row.workspaceId,
      row.userId,
      row.seq,
      message.role,
      message.content,
      message.toolName ?? null,
      message.toolCallId ?? null,
      message.toolCalls ? JSON.stringify(message.toolCalls) : null,
      message.toolResult ? JSON.stringify(message.toolResult) : null,
      message.status,
      message.provider ?? null,
      message.model ?? null,
      row.creditsCharged,
    ],
  };
}

export function buildTouchConversationSql(row: {
  conversationId: string;
  workspaceId: string;
  userId: string;
}): SqlStatement {
  return {
    text: `UPDATE aura_agent_conversations
      SET message_count = message_count + 1, last_message_at = NOW(), updated_at = NOW()
      WHERE id = $1 AND workspace_id = $2 AND user_id = $3
      RETURNING *`,
    values: [row.conversationId, row.workspaceId, row.userId],
  };
}

export function buildListConversationsSql(row: {
  workspaceId: string;
  userId: string;
  limit: number;
}): SqlStatement {
  return {
    text: `SELECT * FROM aura_agent_conversations
      WHERE workspace_id = $1 AND user_id = $2 AND status <> 'deleted'
      ORDER BY last_message_at DESC NULLS LAST, created_at DESC
      LIMIT $3`,
    values: [row.workspaceId, row.userId, row.limit],
  };
}

export function buildLoadConversationSql(row: {
  conversationId: string;
  workspaceId: string;
  userId: string;
}): SqlStatement {
  return {
    text: `SELECT * FROM aura_agent_conversations
      WHERE id = $1 AND workspace_id = $2 AND user_id = $3 AND status <> 'deleted'
      LIMIT 1`,
    values: [row.conversationId, row.workspaceId, row.userId],
  };
}

export function buildLoadMessagesSql(conversationId: string): SqlStatement {
  return {
    text: 'SELECT * FROM aura_agent_messages WHERE conversation_id = $1 ORDER BY seq ASC',
    values: [conversationId],
  };
}

// --- Transaction helper -----------------------------------------------------

async function withTransaction<T>(pool: PoolLike, fn: (client: Queryable) => Promise<T>): Promise<T> {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const result = await fn(client);
    await client.query('COMMIT');
    return result;
  } catch (error) {
    try {
      await client.query('ROLLBACK');
    } catch {
      // Preserve the original error below.
    }
    throw error;
  } finally {
    client.release();
  }
}

async function insertMessage(
  client: Queryable,
  args: {
    conversationId: string;
    workspaceId: string;
    userId: string;
    seq: number;
    message: AppendMessageInput;
    creditsCharged: number;
  },
): Promise<MessageRow> {
  const stmt = buildInsertMessageSql({
    id: generateId(MESSAGE_ID_PREFIX),
    conversationId: args.conversationId,
    workspaceId: args.workspaceId,
    userId: args.userId,
    seq: args.seq,
    message: args.message,
    creditsCharged: args.creditsCharged,
  });
  const inserted = (await client.query<MessageRow>(stmt.text, stmt.values)).rows[0];
  if (!inserted) {
    throw new AgentConversationError(AGENT_CONVERSATION_WRITE_FAILED, 'Failed to persist message.');
  }
  return inserted;
}

// --- Store API --------------------------------------------------------------

export interface CreateConversationArgs {
  workspaceId: string;
  userId: string;
  input: CreateConversationInput;
}

export interface AppendMessageArgs {
  conversationId: string;
  workspaceId: string;
  userId: string;
  message: AppendMessageInput;
  creditsCharged?: number;
}

export interface ListConversationsArgs {
  workspaceId: string;
  userId: string;
  limit?: number;
}

export interface LoadConversationArgs {
  conversationId: string;
  workspaceId: string;
  userId: string;
}

async function createConversation(pool: PoolLike, args: CreateConversationArgs) {
  const { workspaceId, userId, input } = args;
  const id = generateId(CONVERSATION_ID_PREFIX);
  const title = input.title || deriveConversationTitle(input.initialMessage?.content, DEFAULT_CONVERSATION_TITLE);

  return withTransaction(pool, async (client) => {
    const insert = buildInsertConversationSql({
      id,
      workspaceId,
      userId,
      workflowId: input.workflowId ?? null,
      title,
      sourceMode: input.sourceMode ?? null,
      locale: input.locale,
      metadata: input.metadata ?? {},
    });
    let conversation = (await client.query<ConversationRow>(insert.text, insert.values)).rows[0];
    if (!conversation) {
      throw new AgentConversationError(AGENT_CONVERSATION_WRITE_FAILED, 'Failed to create conversation.');
    }

    const messages: MessageRow[] = [];
    if (input.initialMessage) {
      messages.push(
        await insertMessage(client, {
          conversationId: id,
          workspaceId,
          userId,
          seq: 1,
          message: input.initialMessage,
          creditsCharged: 0,
        }),
      );
      const touch = buildTouchConversationSql({ conversationId: id, workspaceId, userId });
      const touched = (await client.query<ConversationRow>(touch.text, touch.values)).rows[0];
      if (touched) conversation = touched;
    }

    return {
      conversation: serializeConversationRow(conversation),
      messages: messages.map(serializeMessageRow),
    };
  });
}

async function appendMessage(pool: PoolLike, args: AppendMessageArgs) {
  const { conversationId, workspaceId, userId, message } = args;
  const creditsCharged = args.creditsCharged ?? 0;

  return withTransaction(pool, async (client) => {
    const seqRow = (await client.query<{ next_seq: number }>(NEXT_SEQ_SQL, [conversationId])).rows[0];
    const seq = seqRow ? Number(seqRow.next_seq) : 1;

    const inserted = await insertMessage(client, {
      conversationId,
      workspaceId,
      userId,
      seq,
      message,
      creditsCharged,
    });

    const touch = buildTouchConversationSql({ conversationId, workspaceId, userId });
    const touched = (await client.query<ConversationRow>(touch.text, touch.values)).rows[0];
    if (!touched) {
      throw new AgentConversationError(AGENT_CONVERSATION_NOT_FOUND, 'Conversation not found for this user.');
    }

    return {
      message: serializeMessageRow(inserted),
      conversation: serializeConversationRow(touched),
    };
  });
}

async function listConversations(pool: PoolLike, args: ListConversationsArgs) {
  const stmt = buildListConversationsSql({
    workspaceId: args.workspaceId,
    userId: args.userId,
    limit: clampPageSize(args.limit),
  });
  const rows = (await pool.query<ConversationRow>(stmt.text, stmt.values)).rows;
  return rows.map(serializeConversationRow);
}

async function loadConversation(pool: PoolLike, args: LoadConversationArgs) {
  const convStmt = buildLoadConversationSql(args);
  const conversation = (await pool.query<ConversationRow>(convStmt.text, convStmt.values)).rows[0];
  if (!conversation) return null;
  const msgStmt = buildLoadMessagesSql(args.conversationId);
  const messages = (await pool.query<MessageRow>(msgStmt.text, msgStmt.values)).rows;
  return {
    conversation: serializeConversationRow(conversation),
    messages: messages.map(serializeMessageRow),
  };
}

export interface ConversationStore {
  createConversation: (args: CreateConversationArgs) => ReturnType<typeof createConversation>;
  appendMessage: (args: AppendMessageArgs) => ReturnType<typeof appendMessage>;
  listConversations: (args: ListConversationsArgs) => ReturnType<typeof listConversations>;
  loadConversation: (args: LoadConversationArgs) => ReturnType<typeof loadConversation>;
}

export function createConversationStore(pool: PoolLike): ConversationStore {
  return {
    createConversation: (args) => createConversation(pool, args),
    appendMessage: (args) => appendMessage(pool, args),
    listConversations: (args) => listConversations(pool, args),
    loadConversation: (args) => loadConversation(pool, args),
  };
}
