import test from 'node:test';
import assert from 'node:assert/strict';
import {
  AGENT_MESSAGE_ROLES,
  MAX_CONVERSATION_TITLE_CHARS,
  MAX_MESSAGE_CONTENT_CHARS,
  deriveConversationTitle,
  normalizeAppendMessage,
  normalizeCreateConversation,
  serializeConversationRow,
  serializeMessageRow,
} from '../../server/agent/conversationContracts.ts';

test('exposes the expected message roles', () => {
  assert.deepEqual([...AGENT_MESSAGE_ROLES], ['user', 'assistant', 'tool', 'system']);
});

test('deriveConversationTitle collapses whitespace and truncates', () => {
  assert.equal(deriveConversationTitle('  Hello   world  '), 'Hello world');
  assert.equal(deriveConversationTitle(''), 'New conversation');
  assert.equal(deriveConversationTitle(null, 'محادثة جديدة'), 'محادثة جديدة');
  const long = 'x'.repeat(MAX_CONVERSATION_TITLE_CHARS + 50);
  const title = deriveConversationTitle(long);
  assert.equal(title.length, MAX_CONVERSATION_TITLE_CHARS);
  assert.ok(title.endsWith('\u2026'));
});

test('normalizeAppendMessage accepts a plain user message', () => {
  const msg = normalizeAppendMessage({ role: 'user', content: 'Import this product' });
  assert.equal(msg.role, 'user');
  assert.equal(msg.content, 'Import this product');
  assert.equal(msg.status, 'complete');
  assert.equal(msg.toolName, undefined);
});

test('normalizeAppendMessage rejects unknown roles and statuses', () => {
  assert.throws(() => normalizeAppendMessage({ role: 'robot', content: 'hi' }), /Unsupported message role/);
  assert.throws(() => normalizeAppendMessage({ role: 'user', content: 'hi', status: 'done' }), /Unsupported message status/);
});

test('normalizeAppendMessage enforces tool-message wiring', () => {
  assert.throws(() => normalizeAppendMessage({ role: 'tool', content: 'result' }), /toolName/);
  assert.throws(() => normalizeAppendMessage({ role: 'tool', content: 'result', toolName: 'import_product' }), /toolCallId/);
  const toolMsg = normalizeAppendMessage({ role: 'tool', content: '{"ok":true}', toolName: 'import_product', toolCallId: 'call_1', toolResult: { ok: true } });
  assert.equal(toolMsg.toolName, 'import_product');
  assert.equal(toolMsg.toolCallId, 'call_1');
  assert.deepEqual(toolMsg.toolResult, { ok: true });
});

test('normalizeAppendMessage blocks tool wiring on non-tool roles', () => {
  assert.throws(() => normalizeAppendMessage({ role: 'user', content: 'hi', toolName: 'x' }), /Only tool messages/);
});

test('normalizeAppendMessage allows empty assistant content with tool calls or while streaming', () => {
  const streaming = normalizeAppendMessage({ role: 'assistant', content: '', status: 'streaming' });
  assert.equal(streaming.content, '');
  const withCalls = normalizeAppendMessage({ role: 'assistant', content: '', toolCalls: { calls: [{ name: 'import_product' }] } });
  assert.deepEqual(withCalls.toolCalls, { calls: [{ name: 'import_product' }] });
  assert.throws(() => normalizeAppendMessage({ role: 'assistant', content: '' }), /content is required/);
});

test('normalizeAppendMessage enforces the content length bound', () => {
  assert.throws(() => normalizeAppendMessage({ role: 'user', content: 'x'.repeat(MAX_MESSAGE_CONTENT_CHARS + 1) }), /exceeds/);
});

test('normalizeCreateConversation defaults locale to ar and validates enums', () => {
  const convo = normalizeCreateConversation({});
  assert.equal(convo.locale, 'ar');
  const withMode = normalizeCreateConversation({ locale: 'en', sourceMode: 'url', title: 'Launch' });
  assert.equal(withMode.locale, 'en');
  assert.equal(withMode.sourceMode, 'url');
  assert.equal(withMode.title, 'Launch');
  assert.throws(() => normalizeCreateConversation({ locale: 'de' }), /Unsupported locale/);
  assert.throws(() => normalizeCreateConversation({ sourceMode: 'telepathy' }), /Unsupported sourceMode/);
});

test('normalizeCreateConversation normalizes a nested initial message', () => {
  const convo = normalizeCreateConversation({ initialMessage: { role: 'user', content: 'Start' } });
  assert.equal(convo.initialMessage?.role, 'user');
  assert.equal(convo.initialMessage?.content, 'Start');
});

test('serializeConversationRow maps snake_case to camelCase and ISO dates', () => {
  const iso = serializeConversationRow({
    id: 'c1', workspace_id: 'w1', user_id: 'u1', workflow_id: null, title: 'T', source_mode: 'url',
    locale: 'ar', status: 'active', message_count: 3, last_message_at: null,
    metadata: null, created_at: '2026-01-01T00:00:00.000Z', updated_at: '2026-01-02T00:00:00.000Z',
  });
  assert.equal(iso.id, 'c1');
  assert.equal(iso.messageCount, 3);
  assert.equal(iso.lastMessageAt, null);
  assert.deepEqual(iso.metadata, {});
  assert.equal(iso.createdAt, '2026-01-01T00:00:00.000Z');
});

test('serializeMessageRow maps fields and formats createdAt', () => {
  const out = serializeMessageRow({
    id: 'm1', conversation_id: 'c1', seq: 1, role: 'assistant', content: 'hi', tool_name: null,
    tool_call_id: null, tool_calls: null, tool_result: null, status: 'complete', provider: 'openrouter',
    model: 'gpt-4o-mini', prompt_tokens: 10, completion_tokens: 20, credits_charged: 5, error_code: null,
    created_at: '2026-01-01T00:00:00.000Z',
  });
  assert.equal(out.conversationId, 'c1');
  assert.equal(out.promptTokens, 10);
  assert.equal(out.creditsCharged, 5);
  assert.equal(out.createdAt, '2026-01-01T00:00:00.000Z');
});
