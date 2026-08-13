import assert from "node:assert/strict";
import test, { afterEach } from "node:test";
import {
  capturePayPalOrder,
  createPayPalCreditPurchaseOrder,
  getPayPalCreditPack,
} from "../../server/billing/paypal.ts";

const originalClientId = process.env.PAYPAL_CLIENT_ID;
const originalClientSecret = process.env.PAYPAL_CLIENT_SECRET;

afterEach(() => {
  if (originalClientId === undefined) delete process.env.PAYPAL_CLIENT_ID;
  else process.env.PAYPAL_CLIENT_ID = originalClientId;
  if (originalClientSecret === undefined) delete process.env.PAYPAL_CLIENT_SECRET;
  else process.env.PAYPAL_CLIENT_SECRET = originalClientSecret;
});

test("PayPal order creation fails when credentials are missing", async () => {
  delete process.env.PAYPAL_CLIENT_ID;
  delete process.env.PAYPAL_CLIENT_SECRET;

  await assert.rejects(
    createPayPalCreditPurchaseOrder({
      workspaceId: "workspace-1",
      packId: "ai-100",
      returnUrl: "https://example.test/return",
      cancelUrl: "https://example.test/cancel",
    }),
    /fabricated payment success is disabled/
  );
});

test("fabricated sandbox order IDs are rejected before any provider call", async () => {
  process.env.PAYPAL_CLIENT_ID = "sandbox-client";
  process.env.PAYPAL_CLIENT_SECRET = "sandbox-secret";
  await assert.rejects(capturePayPalOrder("SANDBOX-ORDER-123"), /Fabricated PayPal order IDs are rejected/);
});

test("publishing credit packs are excluded from V1", () => {
  assert.throws(() => getPayPalCreditPack("publishing-100"), /Unknown credit pack/);
  assert.equal(getPayPalCreditPack("ai-100").bucket, "ai");
});
