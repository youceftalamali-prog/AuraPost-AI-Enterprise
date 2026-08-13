import assert from "node:assert/strict";
import test from "node:test";
import { ExtractorFactory } from "../../server/extractors/factory.ts";
import {
  isPublicIpAddress,
  normalizeImportPrompt,
  normalizeProductUrl,
} from "../../server/imports/productUrlPolicy.ts";

test("product URL policy accepts public HTTP(S) product links", () => {
  assert.equal(
    normalizeProductUrl("https://EXAMPLE.com/products/watch#details"),
    "https://example.com/products/watch",
  );
  assert.equal(isPublicIpAddress("8.8.8.8"), true);
  assert.equal(isPublicIpAddress("2606:4700:4700::1111"), true);
});

test("product URL policy blocks local, private, reserved, and credentialed targets", () => {
  const blocked = [
    "file:///etc/passwd",
    "http://localhost/product",
    "http://127.0.0.1/product",
    "http://10.0.0.1/product",
    "http://169.254.169.254/latest/meta-data",
    "http://[::1]/product",
    "http://[fd00::1]/product",
    "https://user:password@example.com/product",
    "https://example.com:8443/product",
    "https://service.internal/product",
  ];

  for (const url of blocked) {
    assert.throws(() => normalizeProductUrl(url), undefined, url);
  }

  assert.equal(isPublicIpAddress("100.64.0.1"), false);
  assert.equal(isPublicIpAddress("192.0.2.1"), false);
  assert.equal(isPublicIpAddress("2001:db8::1"), false);
});

test("extractor factory rejects unsupported providers instead of guessing WooCommerce", () => {
  assert.throws(
    () => ExtractorFactory.getExtractor("https://example.com/catalog/item"),
    /not supported/i,
  );
  assert.equal(
    ExtractorFactory.getExtractor("https://merchant.example/products/watch").providerName,
    "Shopify",
  );
});

test("custom import instructions are normalized and bounded", () => {
  assert.equal(normalizeImportPrompt("  focus on the blue variant  "), "focus on the blue variant");
  assert.equal(normalizeImportPrompt("   "), undefined);
  assert.throws(() => normalizeImportPrompt("x".repeat(1_001)), /1,000/);
});
