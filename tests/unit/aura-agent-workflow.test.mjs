import assert from 'node:assert/strict';
import test from 'node:test';

import {
  AgentContractError,
  initialStepForSource,
  normalizeAgentWorkflowCreate,
  normalizeAgentWorkflowPatch,
} from '../../server/agent/contracts.ts';

test('Aura workflow chooses a deterministic first step for every source', () => {
  assert.equal(initialStepForSource('url'), 'import_product');
  assert.equal(initialStepForSource('saved_product'), 'select_product');
  assert.equal(initialStepForSource('image'), 'prepare_assets');
  assert.equal(initialStepForSource('description'), 'campaign_brief');
  assert.equal(initialStepForSource('template'), 'campaign_brief');
});

test('Aura workflow normalizes multilingual input without losing Arabic text', () => {
  const input = normalizeAgentWorkflowCreate({
    sourceMode: 'description',
    locale: 'ar',
    prompt: '  أنشئ حملة احترافية لهذا المنتج  ',
    templateId: 'jewelry-luxury',
  });
  assert.equal(input.prompt, 'أنشئ حملة احترافية لهذا المنتج');
  assert.equal(input.locale, 'ar');
  assert.equal(input.templateId, 'jewelry-luxury');
});

test('Aura workflow rejects unsupported values and oversized prompts', () => {
  assert.throws(
    () => normalizeAgentWorkflowCreate({ sourceMode: 'publish', locale: 'ar', prompt: '' }),
    AgentContractError,
  );
  assert.throws(
    () => normalizeAgentWorkflowCreate({ sourceMode: 'description', locale: 'ar', prompt: 'x'.repeat(4_001) }),
    AgentContractError,
  );
});

test('Aura patch requires optimistic concurrency and bounds context payloads', () => {
  assert.throws(() => normalizeAgentWorkflowPatch({ expectedVersion: 0 }), AgentContractError);
  const patch = normalizeAgentWorkflowPatch({
    expectedVersion: 3,
    currentStep: 'market_analysis',
    marketContext: { evidenceSource: 'dataforseo', confidence: 72 },
  });
  assert.equal(patch.expectedVersion, 3);
  assert.equal(patch.currentStep, 'market_analysis');
  assert.deepEqual(patch.marketContext, { evidenceSource: 'dataforseo', confidence: 72 });
  assert.throws(
    () => normalizeAgentWorkflowPatch({ expectedVersion: 1, creativeContext: { value: 'x'.repeat(33 * 1024) } }),
    AgentContractError,
  );
});
