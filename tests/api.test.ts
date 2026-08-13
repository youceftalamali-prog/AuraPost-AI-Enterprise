import assert from "node:assert/strict";
import test from "node:test";
import { get, post } from "./httpClient.ts";

const protectedEndpoints = [
  "/api/workspace",
  "/api/products",
  "/api/billing/overview",
  "/api/shopify/overview",
  "/api/publishing/accounts",
  "/api/intelligence/ledger",
  "/api/ai-providers",
  "/api/images/projects",
];

for (const endpoint of protectedEndpoints) {
  test(`${endpoint} rejects unauthenticated requests`, async () => {
    assert.equal((await get(endpoint)).status, 401);
  });
}

const protectedMutations = [
  "/api/publishing/posts",
  "/api/content/generate",
  "/api/images/analyze",
  "/api/ai-providers/save",
  "/api/market-intelligence/analyze",
];

for (const endpoint of protectedMutations) {
  test(`POST ${endpoint} rejects unauthenticated requests`, async () => {
    assert.equal((await post(endpoint, {})).status, 401);
  });
}

test("diagnostic provider routes remain unavailable without test mode/authentication", async () => {
  assert.ok([401, 404].includes((await post("/api/ai-providers/test", { provider: "deepseek" })).status));
  assert.ok([401, 404].includes((await post("/api/ai-providers/test-center/run", { modality: "text" })).status));
  assert.ok([401, 404].includes((await post("/api/market-intelligence/credentials/test", { login: "test", password: "test" })).status));
});
