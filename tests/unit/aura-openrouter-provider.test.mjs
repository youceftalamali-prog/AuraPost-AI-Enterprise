import test from 'node:test';
import assert from 'node:assert/strict';

import {
  buildCompletionRequest,
  parseCompletionResponse,
  createOpenRouterProvider,
  isProviderConfigured,
  AgentProviderError,
  AGENT_PROVIDER_NOT_CONFIGURED,
  AGENT_PROVIDER_ERROR,
  DEFAULT_OPENROUTER_MODEL,
} from '../../server/agent/openRouterProvider.ts';

const sampleMessages = [{ role: 'user', content: 'hello' }];
const sampleTools = [
  {
    type: 'function',
    function: { name: 'import_product', description: 'x', parameters: { type: 'object', properties: {}, required: [] } },
  },
];

test('buildCompletionRequest sets auto tool_choice and only includes temperature when provided', () => {
  const body = buildCompletionRequest({ messages: sampleMessages, tools: sampleTools, model: 'm', temperature: 0.3 });
  assert.equal(body.model, 'm');
  assert.equal(body.tool_choice, 'auto');
  assert.equal(body.temperature, 0.3);
  assert.equal(body.messages, sampleMessages);
  assert.equal(body.tools, sampleTools);

  const noTemp = buildCompletionRequest({ messages: sampleMessages, tools: sampleTools, model: 'm' });
  assert.equal('temperature' in noTemp, false);
});

test('parseCompletionResponse reads plain assistant content', () => {
  const result = parseCompletionResponse({
    model: 'openai/gpt-4o-mini',
    choices: [{ message: { role: 'assistant', content: 'Hi there' } }],
  });
  assert.equal(result.content, 'Hi there');
  assert.equal(result.toolCalls, undefined);
  assert.equal(result.provider, 'openrouter');
  assert.equal(result.model, 'openai/gpt-4o-mini');
});

test('parseCompletionResponse parses tool calls with JSON-encoded arguments', () => {
  const result = parseCompletionResponse({
    choices: [
      {
        message: {
          role: 'assistant',
          content: null,
          tool_calls: [
            {
              id: 'call_1',
              type: 'function',
              function: { name: 'import_product', arguments: '{"source":"https://x","sourceType":"url"}' },
            },
          ],
        },
      },
    ],
  });
  assert.equal(result.content, '');
  assert.equal(result.toolCalls.length, 1);
  assert.deepEqual(result.toolCalls[0], {
    id: 'call_1',
    name: 'import_product',
    arguments: { source: 'https://x', sourceType: 'url' },
  });
});

test('parseCompletionResponse throws on empty or non-object payloads', () => {
  assert.throws(
    () => parseCompletionResponse({ choices: [] }),
    (e) => e instanceof AgentProviderError && e.code === AGENT_PROVIDER_ERROR,
  );
  assert.throws(() => parseCompletionResponse('nope'), (e) => e instanceof AgentProviderError);
});

test('isProviderConfigured reflects api key presence', () => {
  assert.equal(isProviderConfigured({}), false);
  assert.equal(isProviderConfigured({ apiKey: '' }), false);
  assert.equal(isProviderConfigured({ apiKey: 'sk-x' }), true);
});

test('createOpenRouterProvider refuses to run without an API key', async () => {
  const provider = createOpenRouterProvider({
    fetchImpl: async () => {
      throw new Error('fetch should not be called when unconfigured');
    },
  });
  await assert.rejects(
    provider({ messages: sampleMessages, tools: sampleTools }),
    (e) => e instanceof AgentProviderError && e.code === AGENT_PROVIDER_NOT_CONFIGURED,
  );
});

test('createOpenRouterProvider posts to the completions endpoint and parses the reply', async () => {
  let captured;
  const provider = createOpenRouterProvider({
    apiKey: 'sk-test',
    model: 'anthropic/claude-3.5',
    referer: 'https://aurapost.app',
    title: 'AuraPost',
    fetchImpl: async (url, init) => {
      captured = { url, init };
      return {
        ok: true,
        status: 200,
        json: async () => ({ model: 'anthropic/claude-3.5', choices: [{ message: { content: 'done' } }] }),
        text: async () => '',
      };
    },
  });
  const result = await provider({ messages: sampleMessages, tools: sampleTools });
  assert.equal(result.content, 'done');
  assert.equal(captured.url, 'https://openrouter.ai/api/v1/chat/completions');
  assert.equal(captured.init.method, 'POST');
  assert.equal(captured.init.headers.Authorization, 'Bearer sk-test');
  assert.equal(captured.init.headers['HTTP-Referer'], 'https://aurapost.app');
  assert.equal(captured.init.headers['X-Title'], 'AuraPost');
  const sent = JSON.parse(captured.init.body);
  assert.equal(sent.model, 'anthropic/claude-3.5');
  assert.equal(sent.tool_choice, 'auto');
});

test('createOpenRouterProvider raises a provider error on non-2xx responses', async () => {
  const provider = createOpenRouterProvider({
    apiKey: 'sk-test',
    fetchImpl: async () => ({ ok: false, status: 429, json: async () => ({}), text: async () => 'rate limited' }),
  });
  await assert.rejects(
    provider({ messages: sampleMessages, tools: sampleTools }),
    (e) => e instanceof AgentProviderError && e.code === AGENT_PROVIDER_ERROR && e.status === 429,
  );
});

test('DEFAULT_OPENROUTER_MODEL is defined', () => {
  assert.ok(DEFAULT_OPENROUTER_MODEL.length > 0);
});
