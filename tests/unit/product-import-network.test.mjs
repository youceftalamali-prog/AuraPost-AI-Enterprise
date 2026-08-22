import assert from "node:assert/strict";
import test from "node:test";
import {
  isAllowedProductContentType,
  isProductRedirectStatus,
  withProductNetworkPolicy,
} from "../../server/imports/productFetchRuntime.ts";
import {
  resolveImportIdempotencyKey,
  sanitizeImportRequestBody,
} from "../../server/imports/importRequestPolicy.ts";
import { normalizeImportStartResponse } from "../../server/imports/importResponseContract.ts";

test("product network context blocks local targets before a socket is opened", async () => {
  await assert.rejects(
    withProductNetworkPolicy(() => fetch("http://127.0.0.1/internal-product")),
    /Private or reserved IP addresses are not allowed/i,
  );
});

test("product network content type and redirect policies are explicit", () => {
  assert.equal(isAllowedProductContentType("text/html; charset=utf-8"), true);
  assert.equal(isAllowedProductContentType("application/json"), true);
  assert.equal(isAllowedProductContentType("image/png"), false);
  assert.equal(isProductRedirectStatus(302), true);
  assert.equal(isProductRedirectStatus(308), true);
  assert.equal(isProductRedirectStatus(200), false);
});

test("import request sanitization drops raw HTML and trusts the authorized workspace", () => {
  const sanitized = sanitizeImportRequestBody(
    {
      url: "https://merchant.example/products/watch#details",
      workspaceId: "attacker-workspace",
      customPrompt: "  focus on blue  ",
      rawHtml: "<script>untrusted()</script>",
    },
    "authorized-workspace",
  );

  assert.deepEqual(sanitized, {
    url: "https://merchant.example/products/watch",
    workspaceId: "authorized-workspace",
    customPrompt: "focus on blue",
  });
  assert.equal("rawHtml" in sanitized, false);
});

test("derived idempotency keys are stable for identical imports", () => {
  const request = sanitizeImportRequestBody(
    { url: "https://merchant.example/products/watch", customPrompt: "blue" },
    "workspace-1",
  );
  const first = resolveImportIdempotencyKey(undefined, request);
  const second = resolveImportIdempotencyKey(undefined, request);
  assert.equal(first, second);
  assert.match(first, /^auto-[a-f0-9]{64}$/);
  assert.equal(resolveImportIdempotencyKey("client-key-1", request), "client-key-1");
  assert.throws(() => resolveImportIdempotencyKey("invalid key", request), /invalid/i);
});

test("import start responses always expose a top-level operationId", () => {
  assert.deepEqual(
    normalizeImportStartResponse({ status: "queued", operation: { id: "op-123" } }),
    { status: "queued", operation: { id: "op-123" }, operationId: "op-123" },
  );
});
