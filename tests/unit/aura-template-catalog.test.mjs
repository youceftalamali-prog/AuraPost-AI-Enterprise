import test from 'node:test';
import assert from 'node:assert/strict';

import {
  TEMPLATE_CATALOG_SCHEMA,
  TEMPLATE_CATEGORIES,
  SEED_TEMPLATES,
  pickText,
  listCategories,
  findCategory,
  listSubBranches,
  filterTemplates,
  groupByCategory,
  countByCategory,
} from '../../src/features/templates/templateCatalog.ts';

test('catalog schema and seed are present', () => {
  assert.equal(TEMPLATE_CATALOG_SCHEMA, 'aurapost.template-catalog.v1');
  assert.ok(SEED_TEMPLATES.length >= 8);
  assert.ok(TEMPLATE_CATEGORIES.length === 8);
});

test('every template references a valid category and sub-branch', () => {
  for (const template of SEED_TEMPLATES) {
    const category = findCategory(template.categoryId);
    assert.ok(category, `unknown category ${template.categoryId}`);
    const sub = category.subBranches.find((branch) => branch.id === template.subBranchId);
    assert.ok(sub, `unknown sub-branch ${template.subBranchId} in ${template.categoryId}`);
  }
});

test('listCategories and listSubBranches expose the hierarchy', () => {
  assert.equal(listCategories().length, TEMPLATE_CATEGORIES.length);
  const jewelrySubs = listSubBranches('jewelry');
  assert.deepEqual(
    jewelrySubs.map((sub) => sub.id),
    ['rings', 'necklaces'],
  );
  // Unknown category id is not part of the union, cast through unknown for the test.
  assert.deepEqual(listSubBranches(/** @type {any} */ ('nope')), []);
});

test('filterTemplates narrows by category and sub-branch', () => {
  assert.equal(filterTemplates(SEED_TEMPLATES, {}).length, SEED_TEMPLATES.length);
  const jewelry = filterTemplates(SEED_TEMPLATES, { categoryId: 'jewelry' });
  assert.ok(jewelry.length > 0);
  assert.ok(jewelry.every((template) => template.categoryId === 'jewelry'));
  const rings = filterTemplates(SEED_TEMPLATES, { categoryId: 'jewelry', subBranchId: 'rings' });
  assert.ok(rings.every((template) => template.subBranchId === 'rings'));
});

test('filterTemplates supports free-text query', () => {
  const rings = filterTemplates(SEED_TEMPLATES, { query: 'ring' });
  assert.ok(rings.length > 0);
  assert.equal(filterTemplates(SEED_TEMPLATES, { query: 'zzzzznotreal' }).length, 0);
});

test('groupByCategory and countByCategory sum to the total', () => {
  const grouped = groupByCategory(SEED_TEMPLATES);
  let sum = 0;
  for (const bucket of grouped.values()) sum += bucket.length;
  assert.equal(sum, SEED_TEMPLATES.length);
  const counts = countByCategory(SEED_TEMPLATES);
  const countSum = Object.values(counts).reduce((total, value) => total + value, 0);
  assert.equal(countSum, SEED_TEMPLATES.length);
});

test('pickText resolves locale with fallback', () => {
  const text = { ar: 'A', fr: 'B', en: 'C' };
  assert.equal(pickText(text, 'fr'), 'B');
  assert.equal(pickText(text, 'ar'), 'A');
  assert.equal(pickText({ ar: '', fr: '', en: 'only-en' }, 'fr'), 'only-en');
});
