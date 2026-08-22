import test from 'node:test';
import assert from 'node:assert/strict';

import {
  createToolExecutors,
  AGENT_EXECUTOR_STATUS_PENDING,
} from '../../server/agent/toolExecutors.ts';
import { AGENT_TOOL_NAMES } from '../../server/agent/toolCallingModel.ts';

const context = {
  workspaceId: 'ws_1',
  userId: 'u_1',
  conversationId: 'aconv_1',
  locale: 'ar',
};

test('registry covers every agent tool', () => {
  const registry = createToolExecutors();
  assert.deepEqual(Object.keys(registry).sort(), [...AGENT_TOOL_NAMES].sort());
  for (const name of AGENT_TOOL_NAMES) {
    assert.equal(typeof registry[name], 'function');
  }
});

test('facade executor returns a gated, structured result', async () => {
  const registry = createToolExecutors({ now: () => '2026-01-01T00:00:00.000Z' });
  const result = await registry.import_product(
    { id: 'call_1', name: 'import_product', arguments: { source: 'https://shop/x', sourceType: 'url' } },
    context,
  );
  assert.equal(result.creditsCharged, 0);
  assert.equal(result.toolResult.status, AGENT_EXECUTOR_STATUS_PENDING);
  assert.equal(result.toolResult.tool, 'import_product');
  assert.equal(result.toolResult.category, 'ingest');
  assert.equal(result.toolResult.conversationId, 'aconv_1');
  assert.equal(result.toolResult.requestedAt, '2026-01-01T00:00:00.000Z');
  assert.equal(result.toolResult.arguments.sourceType, 'url');
  assert.match(result.content, /استيراد المنتج/);
});

test('content is localized per context locale', async () => {
  const registry = createToolExecutors();
  const fr = await registry.analyze_market(
    { id: 'c', name: 'analyze_market', arguments: { topic: 'shoes' } },
    { ...context, locale: 'fr' },
  );
  assert.match(fr.content, /Analyser le marché/);
  const en = await registry.render_video(
    { id: 'c', name: 'render_video', arguments: { creativeId: 'cr_1' } },
    { ...context, locale: 'en' },
  );
  assert.match(en.content, /Render video/);
});

test('unknown locale falls back to Arabic', async () => {
  const registry = createToolExecutors();
  const result = await registry.export_campaign(
    { id: 'c', name: 'export_campaign', arguments: { campaignId: 'cmp_1' } },
    { ...context, locale: 'de' },
  );
  assert.match(result.content, /تصدير الحملة/);
});

test('executor rejects a call missing required arguments', async () => {
  const registry = createToolExecutors();
  await assert.rejects(
    registry.import_product({ id: 'c', name: 'import_product', arguments: { sourceType: 'url' } }, context),
    (e) => e.code === 'INVALID_AGENT_TOOL_CALL',
  );
});
