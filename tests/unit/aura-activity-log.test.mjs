import test from 'node:test';
import assert from 'node:assert/strict';

import {
  importOperationToEntry,
  marketAnalysisToEntry,
  sortActivityEntries,
  filterActivityEntries,
  formatActivityTime,
  buildAgentJumpSeed,
  toEpoch,
} from '../../src/features/activity-log/activityLog.ts';

test('toEpoch parses numbers and ISO strings and rejects junk', () => {
  assert.equal(toEpoch(1234), 1234);
  assert.equal(toEpoch('2026-01-01T00:00:00.000Z'), Date.parse('2026-01-01T00:00:00.000Z'));
  assert.equal(toEpoch('not-a-date'), 0);
  assert.equal(toEpoch(null), 0);
  assert.equal(toEpoch(undefined), 0);
});

test('importOperationToEntry maps operation fields', () => {
  const entry = importOperationToEntry({
    id: 'op_1',
    sourceUrl: 'https://shop/x',
    status: 'success',
    provider: 'Shopify',
    productId: 'prod_1',
    productName: 'Blue Shoes',
    createdAt: '2026-08-19T10:00:00.000Z',
  });
  assert.equal(entry.kind, 'import');
  assert.equal(entry.title, 'Blue Shoes');
  assert.equal(entry.detail, 'Shopify');
  assert.equal(entry.productId, 'prod_1');
  assert.equal(entry.sourceUrl, 'https://shop/x');
  assert.equal(entry.status, 'success');
});

test('importOperationToEntry falls back to url title and normalizes status', () => {
  const entry = importOperationToEntry({ id: 'op_2', sourceUrl: 'https://shop/y', status: 'weird' });
  assert.equal(entry.title, 'https://shop/y');
  assert.equal(entry.status, 'pending');
  assert.equal(entry.detail, undefined);
});

test('marketAnalysisToEntry maps analysis fields', () => {
  const entry = marketAnalysisToEntry({
    id: 'a_1',
    topic: 'running shoes',
    region: 'MENA',
    status: 'success',
    createdAt: 100,
  });
  assert.equal(entry.kind, 'analysis');
  assert.equal(entry.title, 'running shoes');
  assert.equal(entry.query, 'running shoes');
  assert.equal(entry.detail, 'MENA');
  assert.equal(entry.createdAt, 100);
});

test('sortActivityEntries orders newest first and is stable on ties', () => {
  const a = { id: 'a', kind: 'import', title: 'a', status: 'success', createdAt: 100 };
  const b = { id: 'b', kind: 'import', title: 'b', status: 'success', createdAt: 100 };
  const c = { id: 'c', kind: 'import', title: 'c', status: 'success', createdAt: 200 };
  const sorted = sortActivityEntries([a, b, c]);
  assert.deepEqual(sorted.map((e) => e.id), ['c', 'a', 'b']);
});

test('filterActivityEntries filters by kind, status, and search', () => {
  const entries = [
    { id: '1', kind: 'import', title: 'Blue Shoes', detail: 'Shopify', status: 'success', createdAt: 1 },
    { id: '2', kind: 'analysis', title: 'running shoes', status: 'failed', createdAt: 2 },
  ];
  assert.deepEqual(filterActivityEntries(entries, { kind: 'analysis' }).map((e) => e.id), ['2']);
  assert.deepEqual(filterActivityEntries(entries, { status: 'success' }).map((e) => e.id), ['1']);
  assert.deepEqual(filterActivityEntries(entries, { search: 'SHOES' }).map((e) => e.id), ['1', '2']);
  assert.deepEqual(filterActivityEntries(entries, { search: 'shopify' }).map((e) => e.id), ['1']);
  assert.equal(filterActivityEntries(entries).length, 2);
});

test('formatActivityTime returns localized relative buckets', () => {
  const now = Date.parse('2026-08-19T12:00:00.000Z');
  assert.equal(formatActivityTime(now - 30_000, 'ar', now), 'الآن');
  assert.equal(formatActivityTime(now - 5 * 60_000, 'en', now), '5 min ago');
  assert.equal(formatActivityTime(now - 3 * 3_600_000, 'fr', now), 'il y a 3 h');
  assert.equal(formatActivityTime(now - 2 * 86_400_000, 'ar', now), 'منذ 2 يوم');
  assert.equal(formatActivityTime(now - 30 * 86_400_000, 'en', now), '2026-07-20');
  assert.equal(formatActivityTime(0, 'ar', now), '');
});

test('buildAgentJumpSeed builds localized seeds per kind', () => {
  const imported = { id: '1', kind: 'import', title: 'Blue Shoes', status: 'success', createdAt: 1, productId: 'prod_1' };
  assert.deepEqual(buildAgentJumpSeed(imported, 'ar'), {
    mode: 'saved_product',
    prompt: 'تابع العمل على المنتج المستورد: «Blue Shoes».',
  });
  assert.equal(buildAgentJumpSeed(imported, 'en').mode, 'saved_product');

  const urlOnly = { id: '2', kind: 'import', title: 'x', status: 'pending', createdAt: 1, sourceUrl: 'https://shop/x' };
  const urlSeed = buildAgentJumpSeed(urlOnly, 'fr');
  assert.equal(urlSeed.mode, 'url');
  assert.match(urlSeed.prompt, /https:\/\/shop\/x/);

  const analysis = { id: '3', kind: 'analysis', title: 'running shoes', status: 'success', createdAt: 1 };
  assert.equal(buildAgentJumpSeed(analysis, 'en').mode, 'description');
  assert.match(buildAgentJumpSeed(analysis, 'en').prompt, /running shoes/);
});

test('buildAgentJumpSeed falls back to Arabic for unknown locale', () => {
  const analysis = { id: '3', kind: 'analysis', title: 'X', status: 'success', createdAt: 1 };
  assert.match(buildAgentJumpSeed(analysis, 'de').prompt, /تابع تحليل السوق/);
});
