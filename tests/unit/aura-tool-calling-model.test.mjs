import test from 'node:test';
import assert from 'node:assert/strict';
import {
  AGENT_TOOLS,
  AGENT_TOOL_NAMES,
  AGENT_TOOL_LOOP,
  getToolDefinition,
  toProviderTools,
  serializeToolCalls,
  normalizeToolCalls,
  validateToolCall,
  toProviderMessages,
  buildSystemPrompt,
} from '../../server/agent/toolCallingModel.ts';

test('registry has unique names and well-formed definitions', () => {
  assert.ok(AGENT_TOOLS.length >= 5);
  assert.equal(new Set(AGENT_TOOL_NAMES).size, AGENT_TOOL_NAMES.length);
  for (const tool of AGENT_TOOLS) {
    assert.ok(tool.name && typeof tool.name === 'string');
    assert.ok(tool.description.length > 0);
    assert.ok(['ingest', 'research', 'generate', 'media', 'deliver'].includes(tool.category));
    assert.equal(typeof tool.chargesCredits, 'boolean');
    assert.ok(tool.parameters && Array.isArray(tool.parameters.required));
    for (const req of tool.parameters.required) {
      assert.ok(req in tool.parameters.properties, `${tool.name} requires undefined prop ${req}`);
    }
  }
});

test('loop guardrails are sane', () => {
  assert.ok(AGENT_TOOL_LOOP.maxIterations >= 1);
  assert.ok(AGENT_TOOL_LOOP.maxToolCallsPerTurn >= 1);
});

test('getToolDefinition resolves and misses correctly', () => {
  assert.equal(getToolDefinition('import_product')?.name, 'import_product');
  assert.equal(getToolDefinition('nope'), undefined);
});

test('toProviderTools produces OpenAI-compatible function schema', () => {
  const tools = toProviderTools();
  assert.equal(tools.length, AGENT_TOOLS.length);
  const importTool = tools.find((t) => t.function.name === 'import_product');
  assert.equal(importTool.type, 'function');
  assert.equal(importTool.function.parameters.type, 'object');
  assert.deepEqual(importTool.function.parameters.required, ['source', 'sourceType']);
  assert.deepEqual(importTool.function.parameters.properties.sourceType.enum, ['url', 'image']);
});

test('serializeToolCalls / normalizeToolCalls round-trip', () => {
  const calls = [{ id: 'call_1', name: 'import_product', arguments: { source: 'https://x', sourceType: 'url' } }];
  const stored = serializeToolCalls(calls);
  assert.deepEqual(stored, { calls });
  assert.deepEqual(normalizeToolCalls(stored), calls);
});

test('normalizeToolCalls parses provider-style function calls with JSON string args', () => {
  const parsed = normalizeToolCalls([
    { id: 'call_9', type: 'function', function: { name: 'analyze_market', arguments: '{"topic":"abaya"}' } },
  ]);
  assert.deepEqual(parsed, [{ id: 'call_9', name: 'analyze_market', arguments: { topic: 'abaya' } }]);
});

test('normalizeToolCalls rejects malformed calls', () => {
  assert.throws(() => normalizeToolCalls([{ name: 'x', arguments: {} }]), /id is required/);
  assert.throws(() => normalizeToolCalls([{ id: 'a', arguments: {} }]), /name is required/);
  assert.throws(() => normalizeToolCalls([{ id: 'a', name: 'x', arguments: 'not json' }]), /not valid JSON/);
});

test('validateToolCall enforces existence, required args, and enums', () => {
  const def = validateToolCall({ id: 'c1', name: 'import_product', arguments: { source: 'https://x', sourceType: 'url' } });
  assert.equal(def.name, 'import_product');
  assert.throws(() => validateToolCall({ id: 'c2', name: 'ghost', arguments: {} }), /Unknown tool/);
  assert.throws(() => validateToolCall({ id: 'c3', name: 'import_product', arguments: { source: 'x' } }), /missing required argument: sourceType/);
  assert.throws(() => validateToolCall({ id: 'c4', name: 'import_product', arguments: { source: 'x', sourceType: 'pdf' } }), /must be one of/);
});

test('toProviderMessages maps every role including tool calls', () => {
  const provider = toProviderMessages([
    { role: 'system', content: 'sys' },
    { role: 'user', content: 'أنشئ حملة' },
    { role: 'assistant', content: '', toolCalls: { calls: [{ id: 'call_1', name: 'import_product', arguments: { source: 'https://x', sourceType: 'url' } }] } },
    { role: 'tool', content: '{"ok":true}', toolName: 'import_product', toolCallId: 'call_1' },
    { role: 'assistant', content: 'تم الاستيراد' },
  ]);
  assert.equal(provider[0].role, 'system');
  assert.equal(provider[1].content, 'أنشئ حملة');
  assert.equal(provider[2].role, 'assistant');
  assert.equal(provider[2].content, null);
  assert.equal(provider[2].tool_calls[0].function.name, 'import_product');
  assert.equal(provider[2].tool_calls[0].function.arguments, JSON.stringify({ source: 'https://x', sourceType: 'url' }));
  assert.equal(provider[3].role, 'tool');
  assert.equal(provider[3].tool_call_id, 'call_1');
  assert.equal(provider[4].content, 'تم الاستيراد');
});

test('toProviderMessages requires toolCallId on tool messages', () => {
  assert.throws(() => toProviderMessages([{ role: 'tool', content: 'x' }]), /toolCallId/);
});

test('buildSystemPrompt defaults to Arabic and honors locale', () => {
  assert.ok(buildSystemPrompt().includes('AuraPost'));
  assert.ok(buildSystemPrompt('ar').startsWith('أنت'));
  assert.ok(buildSystemPrompt('en').startsWith('You are'));
  assert.ok(buildSystemPrompt('fr').includes('AuraPost'));
  assert.ok(buildSystemPrompt('de').startsWith('أنت'));
});
