import test from 'node:test';
import assert from 'node:assert/strict';

import {
  serializeHandoff,
  parseHandoff,
  HANDOFF_TTL_MS,
  HANDOFF_STORAGE_KEY,
} from '../../src/features/agent-shell/handoffStorage.ts';

test('serialize/parse round trips a valid handoff', () => {
  const handoff = {
    mode: 'url',
    prompt: 'https://shop.example/product/1',
    templateId: 'jewelry-luxury',
    createdAt: 1_000,
  };
  const parsed = parseHandoff(serializeHandoff(handoff), 1_000);
  assert.deepEqual(parsed, handoff);
});

test('parseHandoff rejects empty, invalid JSON, and non-objects', () => {
  assert.equal(parseHandoff(null), null);
  assert.equal(parseHandoff(''), null);
  assert.equal(parseHandoff('not json', 0), null);
  assert.equal(parseHandoff('123', 0), null);
  assert.equal(parseHandoff('"just a string"', 0), null);
});

test('parseHandoff validates required fields and source mode', () => {
  const now = 5_000;
  assert.equal(
    parseHandoff(JSON.stringify({ mode: 'nope', prompt: 'p', createdAt: now }), now),
    null,
  );
  assert.equal(
    parseHandoff(JSON.stringify({ mode: 'url', createdAt: now }), now),
    null,
  );
  assert.equal(
    parseHandoff(JSON.stringify({ mode: 'url', prompt: 'p' }), now),
    null,
  );
  assert.equal(
    parseHandoff(JSON.stringify({ mode: 'url', prompt: 'p', createdAt: 'x' }), now),
    null,
  );
});

test('parseHandoff enforces the TTL window', () => {
  const created = 0;
  const payload = JSON.stringify({ mode: 'description', prompt: 'p', createdAt: created });
  assert.ok(parseHandoff(payload, created + HANDOFF_TTL_MS));
  assert.equal(parseHandoff(payload, created + HANDOFF_TTL_MS + 1), null);
});

test('parseHandoff omits a non-string templateId but keeps a valid one', () => {
  const now = 10;
  const withBad = parseHandoff(
    JSON.stringify({ mode: 'template', prompt: 'p', templateId: 42, createdAt: now }),
    now,
  );
  assert.deepEqual(withBad, { mode: 'template', prompt: 'p', createdAt: now });

  const withGood = parseHandoff(
    JSON.stringify({ mode: 'template', prompt: 'p', templateId: 't1', createdAt: now }),
    now,
  );
  assert.equal(withGood.templateId, 't1');
  assert.ok(HANDOFF_STORAGE_KEY.length > 0);
});
