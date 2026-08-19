import test from 'node:test';
import assert from 'node:assert/strict';
import {
  AGENT_CHAT_COPY,
  isRtlLocale,
  bubbleAlignment,
  toolLabel,
  canSend,
} from '../../src/features/agent-shell/chatView.ts';

test('copy is provided for every supported locale', () => {
  for (const locale of ['ar', 'fr', 'en']) {
    assert.ok(AGENT_CHAT_COPY[locale]);
    assert.ok(AGENT_CHAT_COPY[locale].title.length > 0);
    assert.ok(AGENT_CHAT_COPY[locale].placeholder.length > 0);
  }
});

test('isRtlLocale is true only for Arabic', () => {
  assert.equal(isRtlLocale('ar'), true);
  assert.equal(isRtlLocale('fr'), false);
  assert.equal(isRtlLocale('en'), false);
});

test('bubbleAlignment puts the user on the end and others on the start', () => {
  assert.equal(bubbleAlignment('user'), 'end');
  assert.equal(bubbleAlignment('assistant'), 'start');
  assert.equal(bubbleAlignment('tool'), 'start');
  assert.equal(bubbleAlignment('system'), 'start');
});

test('toolLabel localizes known tools and falls back to the raw name', () => {
  assert.equal(toolLabel('render_video', 'ar'), 'إنشاء الفيديو');
  assert.equal(toolLabel('render_video', 'en'), 'Render video');
  assert.equal(toolLabel('analyze_market', 'fr'), 'Analyse du marché');
  assert.equal(toolLabel('unknown_tool', 'en'), 'unknown_tool');
});

test('canSend requires non-empty trimmed text', () => {
  assert.equal(canSend('hi'), true);
  assert.equal(canSend('   '), false);
  assert.equal(canSend(''), false);
});
