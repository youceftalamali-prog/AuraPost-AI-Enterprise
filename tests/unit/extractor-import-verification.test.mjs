import assert from "node:assert/strict";
import test from "node:test";
import { ExtractorFactory } from "../../server/extractors/factory.ts";
import { TEST_DATASET } from "../../server/extractors/test-dataset.ts";

// Every platform the import subsystem is expected to support. These strings are
// also the canonical extractor `providerName` values and the TEST_DATASET keys.
const EXPECTED_PROVIDERS = [
  "Shopify",
  "WooCommerce",
  "Amazon",
  "AliExpress",
  "Alibaba",
  "eBay",
];

// Marketplaces are routed deterministically by hostname, so a fixture URL must
// resolve to exactly its own extractor.
const MARKETPLACE_PROVIDERS = new Set(["Amazon", "AliExpress", "Alibaba", "eBay"]);

// Storefronts (Shopify / WooCommerce) share generic path patterns such as
// `/products/` and `/product/`, so routing may land on either storefront
// extractor. That ambiguity is expected and acceptable.
const STOREFRONT_PROVIDERS = new Set(["Shopify", "WooCommerce"]);

test("test dataset covers every supported import platform", () => {
  for (const provider of EXPECTED_PROVIDERS) {
    const entries = TEST_DATASET[provider];
    assert.ok(
      Array.isArray(entries) && entries.length > 0,
      `expected fixtures for ${provider}`,
    );
  }
});

test("every fixture is well-formed for its declared outcome", () => {
  for (const provider of EXPECTED_PROVIDERS) {
    for (const entry of TEST_DATASET[provider]) {
      assert.ok(
        typeof entry.url === "string" && entry.url.startsWith("http"),
        `${provider}: fixture must have an http(s) url`,
      );

      if (!entry.success) {
        assert.ok(
          entry.error &&
            typeof entry.error.errorMessage === "string" &&
            entry.error.errorMessage.trim().length > 0,
          `${provider}: failure fixture must carry a descriptive error message`,
        );
        continue;
      }

      const product = entry.product;
      assert.ok(product, `${provider}: success fixture must include a product`);
      assert.ok(
        typeof product.title === "string" && product.title.trim().length > 0,
        `${provider}: product.title must be a non-empty string`,
      );
      assert.ok(
        typeof product.description === "string" && product.description.trim().length > 0,
        `${provider}: product.description must be a non-empty string`,
      );
      assert.ok(
        typeof product.price === "number" && Number.isFinite(product.price),
        `${provider}: product.price must be a finite number`,
      );
      assert.ok(
        typeof product.currency === "string" && product.currency.trim().length > 0,
        `${provider}: product.currency must be a non-empty string`,
      );
      assert.equal(
        typeof product.availability,
        "boolean",
        `${provider}: product.availability must be a boolean`,
      );
      assert.ok(
        typeof product.vendor === "string" && product.vendor.trim().length > 0,
        `${provider}: product.vendor must be a non-empty string`,
      );
      assert.ok(Array.isArray(product.gallery), `${provider}: product.gallery must be an array`);
      assert.ok(
        Array.isArray(product.variants) && product.variants.length > 0,
        `${provider}: product.variants must be a non-empty array`,
      );
      for (const variant of product.variants) {
        assert.ok(variant && variant.id, `${provider}: variant.id is required`);
        assert.ok(variant && variant.title, `${provider}: variant.title is required`);
        assert.ok(variant && variant.price, `${provider}: variant.price is required`);
      }
    }
  }
});

test("marketplace fixture URLs route to their dedicated extractor", () => {
  for (const provider of EXPECTED_PROVIDERS) {
    if (!MARKETPLACE_PROVIDERS.has(provider)) continue;
    for (const entry of TEST_DATASET[provider]) {
      const routed = ExtractorFactory.getExtractor(entry.url).providerName;
      assert.equal(
        routed,
        provider,
        `${entry.url} should route to ${provider} but routed to ${routed}`,
      );
    }
  }
});

test("storefront fixture URLs route to a storefront extractor", () => {
  for (const provider of STOREFRONT_PROVIDERS) {
    for (const entry of TEST_DATASET[provider]) {
      const routed = ExtractorFactory.getExtractor(entry.url).providerName;
      assert.ok(
        STOREFRONT_PROVIDERS.has(routed),
        `${entry.url} routed to ${routed}, expected Shopify or WooCommerce`,
      );
    }
  }
});

test("the canonical provider constants match live extractor names", () => {
  assert.equal(
    ExtractorFactory.getExtractor("https://demo-store.example/products/sample-item").providerName,
    "Shopify",
  );
  assert.equal(
    ExtractorFactory.getExtractor("https://demo-store.example/product/sample-item").providerName,
    "WooCommerce",
  );
});

test("unsupported storefronts are rejected instead of guessed", () => {
  assert.throws(
    () => ExtractorFactory.getExtractor("https://unknown-shop.example/catalog/item-1"),
    /not supported/i,
  );
});
