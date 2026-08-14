import assert from 'node:assert/strict';
import test from 'node:test';
import { calculateMarketScores, marketNoData, normalizeMarketQuery } from '../../server/market-intelligence/contracts.ts';

test('market query keeps multilingual product terms and removes control characters', () => {
  assert.deepEqual(normalizeMarketQuery('  سوار\u0000 ذكي  ', 'Algeria', 'Arabic'), { keyword: 'سوار ذكي', country: 'Algeria', language: 'Arabic' });
});

test('market query rejects empty and oversized terms', () => {
  assert.throws(() => normalizeMarketQuery(''), /between 1 and 200/i);
  assert.throws(() => normalizeMarketQuery('x'.repeat(201)), /between 1 and 200/i);
});

test('market scores are deterministic, bounded, and expose confidence', () => {
  const input = { searchVolume: 10000, cpc: 2, competition: 0.4, keywordDifficulty: 35, trends: [100, 110, 120, 160, 170, 180].map((volume, index) => ({ month: `2026-0${index + 1}`, volume })) };
  const first = calculateMarketScores(input);
  assert.deepEqual(first, calculateMarketScores(input));
  for (const value of [first.demand, first.competitionRisk, first.commercialIntent, first.trend, first.opportunity]) assert.ok(value >= 0 && value <= 100);
  assert.equal(first.confidence, 'high');
});

test('no-data responses never invent metrics', () => {
  const response = marketNoData('watch', 'No live evidence');
  assert.equal(response.liveDataAvailable, false);
  assert.equal('opportunity_score' in response, false);
  assert.equal('profitabilityScore' in response, false);
});
