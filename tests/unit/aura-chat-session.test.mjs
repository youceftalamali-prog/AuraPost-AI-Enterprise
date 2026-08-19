import test from 'node:test';
import assert from 'node:assert/strict';
import { optimisticUserMessage, mergeTurnMessages } from '../../src/features/agent-shell/chatSession.ts';

test('optimisticUserMessage builds a complete user message with unique ids', () => {
  const a = optimisticUserMessage('hello');
  const b = optimisticUserMessage('world');
  assert.equal(a.role, 'user');
  assert.equal(a.content, 'hello');
  assert.equal(a.status, 'complete');
  assert.notEqual(a.id, b.id);
});

test('mergeTurnMessages replaces the optimistic message when the turn echoes the user', () => {
  const optimistic = { id: 'optimistic-1', role: 'user', content: 'hi', status: 'complete' };
  const turn = [
    { id: 'm1', role: 'user', content: 'hi' },
    { id: 'm2', role: 'assistant', content: 'hello there' },
  ];
  const merged = mergeTurnMessages([optimistic], 'optimistic-1', turn);
  assert.deepEqual(merged.map((message) => message.id), ['m1', 'm2']);
});

test('mergeTurnMessages keeps the optimistic message when the turn has no user message', () => {
  const optimistic = { id: 'optimistic-1', role: 'user', content: 'hi' };
  const turn = [{ id: 'm2', role: 'assistant', content: 'working' }];
  const merged = mergeTurnMessages([optimistic], 'optimistic-1', turn);
  assert.deepEqual(merged.map((message) => message.id), ['optimistic-1', 'm2']);
});

test('mergeTurnMessages de-duplicates by id and preserves order', () => {
  const existing = [{ id: 'm1', role: 'user', content: 'hi' }];
  const turn = [
    { id: 'm1', role: 'user', content: 'hi' },
    { id: 'm2', role: 'assistant', content: 'hello' },
  ];
  const merged = mergeTurnMessages(existing, 'optimistic-x', turn);
  assert.deepEqual(merged.map((message) => message.id), ['m1', 'm2']);
});
