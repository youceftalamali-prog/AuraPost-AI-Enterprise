import test from 'node:test';
import assert from 'node:assert/strict';

import {
  buildInsertConversationSql,
  buildInsertMessageSql,
  buildTouchConversationSql,
  buildListConversationsSql,
  buildLoadConversationSql,
  buildLoadMessagesSql,
  clampPageSize,
  generateId,
  createConversationStore,
  NEXT_SEQ_SQL,
  DEFAULT_CONVERSATION_PAGE_SIZE,
  MAX_CONVERSATION_PAGE_SIZE,
  AGENT_CONVERSATION_NOT_FOUND,
} from '../../server/agent/conversationStore.ts';

function convRow(overrides = {}) {
  return {
    id: 'aconv_1',
    workspace_id: 'ws_1',
    user_id: 'u_1',
    workflow_id: null,
    title: 'Hello',
    source_mode: null,
    locale: 'ar',
    status: 'active',
    message_count: 0,
    last_message_at: null,
    metadata: {},
    created_at: '2026-01-01T00:00:00.000Z',
    updated_at: '2026-01-01T00:00:00.000Z',
    ...overrides,
  };
}

function msgRow(overrides = {}) {
  return {
    id: 'amsg_1',
    conversation_id: 'aconv_1',
    seq: 1,
    role: 'user',
    content: 'Hello',
    tool_name: null,
    tool_call_id: null,
    tool_calls: null,
    tool_result: null,
    status: 'complete',
    provider: null,
    model: null,
    prompt_tokens: null,
    completion_tokens: null,
    credits_charged: 0,
    error_code: null,
    created_at: '2026-01-01T00:00:00.000Z',
    ...overrides,
  };
}

// Scripted fake pool: returns the queued responses in order, skipping the
// transaction control statements (BEGIN/COMMIT/ROLLBACK).
function fakePool(responses) {
  const calls = [];
  let index = 0;
  const client = {
    query: async (text, params) => {
      if (/^\s*(BEGIN|COMMIT|ROLLBACK)/i.test(text)) return { rows: [] };
      calls.push({ text, params });
      return responses[index++] ?? { rows: [] };
    },
    release: () => {},
  };
  return {
    calls,
    pool: {
      connect: async () => client,
      query: async (text, params) => {
        calls.push({ text, params });
        return responses[index++] ?? { rows: [] };
      },
    },
  };
}

test('generateId prefixes a random uuid', () => {
  const id = generateId('aconv');
  assert.match(id, /^aconv_[0-9a-f-]{36}$/);
  assert.notEqual(generateId('aconv'), generateId('aconv'));
});

test('clampPageSize applies defaults and the ceiling', () => {
  assert.equal(clampPageSize(undefined), DEFAULT_CONVERSATION_PAGE_SIZE);
  assert.equal(clampPageSize(0), DEFAULT_CONVERSATION_PAGE_SIZE);
  assert.equal(clampPageSize(-5), DEFAULT_CONVERSATION_PAGE_SIZE);
  assert.equal(clampPageSize(10), 10);
  assert.equal(clampPageSize(9999), MAX_CONVERSATION_PAGE_SIZE);
});

test('buildInsertConversationSql stringifies metadata and returns the row', () => {
  const stmt = buildInsertConversationSql({
    id: 'aconv_1',
    workspaceId: 'ws_1',
    userId: 'u_1',
    workflowId: null,
    title: 'T',
    sourceMode: 'url',
    locale: 'ar',
    metadata: { a: 1 },
  });
  assert.equal(stmt.values.length, 8);
  assert.equal(stmt.values[7], JSON.stringify({ a: 1 }));
  assert.match(stmt.text, /RETURNING \*/);
  assert.match(stmt.text, /\$8::jsonb/);
});

test('buildInsertMessageSql places seq, jsonb tool fields, and credits correctly', () => {
  const stmt = buildInsertMessageSql({
    id: 'amsg_1',
    conversationId: 'aconv_1',
    workspaceId: 'ws_1',
    userId: 'u_1',
    seq: 3,
    message: {
      role: 'tool',
      content: 'ok',
      status: 'complete',
      toolName: 'import_product',
      toolCallId: 'call_1',
      toolResult: { productId: 'p1' },
    },
    creditsCharged: 12,
  });
  assert.equal(stmt.values[4], 3); // seq
  assert.equal(stmt.values[5], 'tool'); // role
  assert.equal(stmt.values[7], 'import_product'); // tool_name
  assert.equal(stmt.values[8], 'call_1'); // tool_call_id
  assert.equal(stmt.values[9], null); // tool_calls absent
  assert.equal(stmt.values[10], JSON.stringify({ productId: 'p1' })); // tool_result
  assert.equal(stmt.values[14], 12); // credits_charged
  assert.match(stmt.text, /\$10::jsonb, \$11::jsonb/);
});

test('buildInsertMessageSql serializes tool_calls when present', () => {
  const stmt = buildInsertMessageSql({
    id: 'amsg_2',
    conversationId: 'aconv_1',
    workspaceId: 'ws_1',
    userId: 'u_1',
    seq: 2,
    message: {
      role: 'assistant',
      content: '',
      status: 'complete',
      toolCalls: { calls: [{ id: 'call_1', name: 'import_product', arguments: {} }] },
    },
    creditsCharged: 0,
  });
  assert.equal(stmt.values[9], JSON.stringify({ calls: [{ id: 'call_1', name: 'import_product', arguments: {} }] }));
  assert.equal(stmt.values[10], null);
});

test('list/load/touch builders are scoped to workspace + user', () => {
  const list = buildListConversationsSql({ workspaceId: 'ws_1', userId: 'u_1', limit: 15 });
  assert.deepEqual(list.values, ['ws_1', 'u_1', 15]);
  assert.match(list.text, /status <> 'deleted'/);
  assert.match(list.text, /NULLS LAST/);

  const load = buildLoadConversationSql({ conversationId: 'aconv_1', workspaceId: 'ws_1', userId: 'u_1' });
  assert.deepEqual(load.values, ['aconv_1', 'ws_1', 'u_1']);

  const touch = buildTouchConversationSql({ conversationId: 'aconv_1', workspaceId: 'ws_1', userId: 'u_1' });
  assert.match(touch.text, /message_count = message_count \+ 1/);

  const msgs = buildLoadMessagesSql('aconv_1');
  assert.deepEqual(msgs.values, ['aconv_1']);
  assert.match(msgs.text, /ORDER BY seq ASC/);

  assert.match(NEXT_SEQ_SQL, /COALESCE\(MAX\(seq\), 0\) \+ 1/);
});

test('createConversation persists the conversation and initial message', async () => {
  const { pool, calls } = fakePool([
    { rows: [convRow()] },
    { rows: [msgRow()] },
    { rows: [convRow({ message_count: 1, last_message_at: '2026-01-01T00:05:00.000Z' })] },
  ]);
  const store = createConversationStore(pool);
  const result = await store.createConversation({
    workspaceId: 'ws_1',
    userId: 'u_1',
    input: {
      locale: 'ar',
      initialMessage: { role: 'user', content: 'Hello', status: 'complete' },
    },
  });
  assert.equal(result.conversation.messageCount, 1);
  assert.equal(result.messages.length, 1);
  assert.equal(result.messages[0].content, 'Hello');
  // insert conversation, insert message, touch conversation
  assert.equal(calls.length, 3);
  assert.match(calls[0].text, /INSERT INTO aura_agent_conversations/);
  assert.match(calls[1].text, /INSERT INTO aura_agent_messages/);
  assert.equal(calls[1].params[4], 1); // seq of initial message
});

test('createConversation without an initial message writes only the conversation', async () => {
  const { pool, calls } = fakePool([{ rows: [convRow()] }]);
  const store = createConversationStore(pool);
  const result = await store.createConversation({
    workspaceId: 'ws_1',
    userId: 'u_1',
    input: { locale: 'ar', title: 'Manual' },
  });
  assert.equal(result.messages.length, 0);
  assert.equal(calls.length, 1);
});

test('appendMessage computes the next seq and touches the conversation', async () => {
  const { pool, calls } = fakePool([
    { rows: [{ next_seq: 4 }] },
    { rows: [msgRow({ id: 'amsg_4', seq: 4, role: 'assistant', content: 'Reply' })] },
    { rows: [convRow({ message_count: 4 })] },
  ]);
  const store = createConversationStore(pool);
  const result = await store.appendMessage({
    conversationId: 'aconv_1',
    workspaceId: 'ws_1',
    userId: 'u_1',
    message: { role: 'assistant', content: 'Reply', status: 'complete' },
  });
  assert.equal(result.message.seq, 4);
  assert.equal(result.conversation.messageCount, 4);
  assert.equal(calls[0].text, NEXT_SEQ_SQL);
  assert.equal(calls[1].params[4], 4); // seq applied to insert
});

test('appendMessage throws when the conversation is missing', async () => {
  const { pool } = fakePool([
    { rows: [{ next_seq: 1 }] },
    { rows: [msgRow()] },
    { rows: [] }, // touch matched no conversation
  ]);
  const store = createConversationStore(pool);
  await assert.rejects(
    store.appendMessage({
      conversationId: 'missing',
      workspaceId: 'ws_1',
      userId: 'u_1',
      message: { role: 'assistant', content: 'x', status: 'complete' },
    }),
    (e) => e.code === AGENT_CONVERSATION_NOT_FOUND,
  );
});

test('loadConversation returns null when not found and rows otherwise', async () => {
  const missing = fakePool([{ rows: [] }]);
  const emptyStore = createConversationStore(missing.pool);
  assert.equal(
    await emptyStore.loadConversation({ conversationId: 'x', workspaceId: 'ws_1', userId: 'u_1' }),
    null,
  );

  const found = fakePool([{ rows: [convRow()] }, { rows: [msgRow(), msgRow({ id: 'amsg_2', seq: 2, role: 'assistant', content: 'Hi' })] }]);
  const store = createConversationStore(found.pool);
  const result = await store.loadConversation({ conversationId: 'aconv_1', workspaceId: 'ws_1', userId: 'u_1' });
  assert.equal(result.messages.length, 2);
  assert.equal(result.messages[1].content, 'Hi');
});

test('listConversations serializes each row', async () => {
  const { pool } = fakePool([{ rows: [convRow(), convRow({ id: 'aconv_2', title: 'Second' })] }]);
  const store = createConversationStore(pool);
  const rows = await store.listConversations({ workspaceId: 'ws_1', userId: 'u_1' });
  assert.equal(rows.length, 2);
  assert.equal(rows[1].title, 'Second');
});
