import test from 'node:test';
import assert from 'node:assert/strict';
import { runToolCallingLoop, AGENT_LOOP_LIMIT_ERROR } from '../../server/agent/toolCallingLoop.ts';

const context = { workspaceId: 'w1', userId: 'u1', conversationId: 'c1', locale: 'ar' };

function scriptedComplete(steps) {
  let i = 0;
  return async () => {
    const step = steps[Math.min(i, steps.length - 1)];
    i += 1;
    return step;
  };
}

test('runs a tool call then produces a final answer', async () => {
  const complete = scriptedComplete([
    { content: '', toolCalls: [{ id: 'call_1', name: 'import_product', arguments: { source: 'https://x', sourceType: 'url' } }], provider: 'openrouter', model: 'm' },
    { content: 'تم استيراد المنتج وإنشاء الحملة.', provider: 'openrouter', model: 'm' },
  ]);
  const executors = {
    import_product: async (call) => ({ content: 'imported', toolResult: { id: 'p1', source: call.arguments.source }, creditsCharged: 0 }),
  };
  const result = await runToolCallingLoop({ history: [{ role: 'user', content: 'استورد هذا المنتج' }], complete, executors, context });
  assert.equal(result.iterations, 2);
  assert.equal(result.toolCallsMade, 1);
  assert.equal(result.finalContent, 'تم استيراد المنتج وإنشاء الحملة.');
  assert.equal(result.appended.length, 3);
  assert.equal(result.appended[0].role, 'assistant');
  assert.deepEqual(result.appended[0].toolCalls, { calls: [{ id: 'call_1', name: 'import_product', arguments: { source: 'https://x', sourceType: 'url' } }] });
  assert.equal(result.appended[1].role, 'tool');
  assert.equal(result.appended[1].toolCallId, 'call_1');
  assert.deepEqual(result.appended[1].toolResult, { id: 'p1', source: 'https://x' });
  assert.equal(result.appended[2].role, 'assistant');
});

test('returns immediately when the model answers without tools', async () => {
  const complete = scriptedComplete([{ content: 'مرحبًا! كيف أساعدك؟' }]);
  const result = await runToolCallingLoop({ history: [{ role: 'user', content: 'مرحبا' }], complete, executors: {}, context });
  assert.equal(result.iterations, 1);
  assert.equal(result.toolCallsMade, 0);
  assert.equal(result.appended.length, 1);
  assert.equal(result.finalContent, 'مرحبًا! كيف أساعدك؟');
});

test('accumulates credits across tool executions', async () => {
  const complete = scriptedComplete([
    { content: '', toolCalls: [{ id: 'c1', name: 'analyze_market', arguments: { topic: 'abaya' } }] },
    { content: 'done' },
  ]);
  const executors = { analyze_market: async () => ({ content: 'ok', creditsCharged: 12 }) };
  const result = await runToolCallingLoop({ history: [], complete, executors, context });
  assert.equal(result.creditsCharged, 12);
  assert.equal(result.appended[1].creditsCharged, 12);
});

test('throws when no executor is registered for a requested tool', async () => {
  const complete = scriptedComplete([{ content: '', toolCalls: [{ id: 'c1', name: 'render_video', arguments: { creativeId: 'cr1' } }] }]);
  await assert.rejects(
    runToolCallingLoop({ history: [], complete, executors: {}, context }),
    (err) => err.code === AGENT_LOOP_LIMIT_ERROR && /No executor/.test(err.message),
  );
});

test('propagates validation errors for malformed tool calls', async () => {
  const complete = scriptedComplete([{ content: '', toolCalls: [{ id: 'c1', name: 'import_product', arguments: { source: 'x' } }] }]);
  await assert.rejects(
    runToolCallingLoop({ history: [], complete, executors: { import_product: async () => ({ content: 'x' }) }, context }),
    /missing required argument: sourceType/,
  );
});

test('rejects too many tool calls in a single turn', async () => {
  const many = Array.from({ length: 9 }, (_, i) => ({ id: `c${i}`, name: 'export_campaign', arguments: { campaignId: 'k' } }));
  const complete = scriptedComplete([{ content: '', toolCalls: many }]);
  await assert.rejects(
    runToolCallingLoop({ history: [], complete, executors: { export_campaign: async () => ({ content: 'x' }) }, context }),
    (err) => err.code === AGENT_LOOP_LIMIT_ERROR,
  );
});

test('enforces the iteration budget when the model keeps calling tools', async () => {
  const complete = async () => ({ content: '', toolCalls: [{ id: 'c', name: 'analyze_market', arguments: { topic: 't' } }] });
  const executors = { analyze_market: async () => ({ content: 'again', creditsCharged: 1 }) };
  await assert.rejects(
    runToolCallingLoop({ history: [], complete, executors, context, maxIterations: 3 }),
    (err) => err.code === AGENT_LOOP_LIMIT_ERROR && /iteration budget \(3\)/.test(err.message),
  );
});
