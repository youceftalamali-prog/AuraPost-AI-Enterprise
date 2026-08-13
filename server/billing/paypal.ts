import { SubscriptionInterval, SubscriptionPlanName, CreditBucketName } from "../../src/types.ts";
import { getBillingPlan, getPlanPrice } from "./plans.ts";
import { logger } from "../core/observability/logger.ts";

/**
 * PayPal REST API v2 integration.
 *
 * SECURITY INVARIANT: an unconfigured PayPal integration must fail closed.
 * Development and sandbox environments still use PayPal's real sandbox API;
 * they never fabricate completed orders, captures, or subscriptions.
 */

export interface PayPalCreditPack {
  id: string;
  label: string;
  credits: number;
  bucket: CreditBucketName;
  priceUsd: number;
}

export const PAYPAL_CREDIT_PACKS: PayPalCreditPack[] = [
  { id: "ai-100", label: "100 AI Credits", credits: 100, bucket: "ai", priceUsd: 15 },
  { id: "ai-500", label: "500 AI Credits", credits: 500, bucket: "ai", priceUsd: 65 },
  { id: "video-50", label: "50 Video Credits", credits: 50, bucket: "video", priceUsd: 25 },
  { id: "video-200", label: "200 Video Credits", credits: 200, bucket: "video", priceUsd: 90 },
];

export function getPayPalCreditPack(id: string): PayPalCreditPack {
  const pack = PAYPAL_CREDIT_PACKS.find((candidate) => candidate.id === id);
  if (!pack) {
    throw new Error(`Unknown credit pack: ${id}`);
  }
  return pack;
}

export function getPayPalMode(): "sandbox" | "live" {
  return process.env.PAYPAL_ENV === "live" ? "live" : "sandbox";
}

function getPayPalApiBase(): string {
  return getPayPalMode() === "live"
    ? "https://api-m.paypal.com"
    : "https://api-m.sandbox.paypal.com";
}

function isPayPalConfigured(): boolean {
  return Boolean(process.env.PAYPAL_CLIENT_ID?.trim() && process.env.PAYPAL_CLIENT_SECRET?.trim());
}

function assertPayPalConfigured(): void {
  if (!isPayPalConfigured()) {
    throw new Error(
      "PayPal is not configured. Real PayPal sandbox or live credentials are required; fabricated payment success is disabled."
    );
  }
}

let cachedAccessToken: { token: string; expiresAt: number } | null = null;

async function getPayPalAccessToken(): Promise<string> {
  assertPayPalConfigured();

  if (cachedAccessToken && cachedAccessToken.expiresAt > Date.now() + 60_000) {
    return cachedAccessToken.token;
  }

  const basicAuth = Buffer.from(`${process.env.PAYPAL_CLIENT_ID}:${process.env.PAYPAL_CLIENT_SECRET}`).toString("base64");
  const response = await fetch(`${getPayPalApiBase()}/v1/oauth2/token`, {
    method: "POST",
    headers: {
      Authorization: `Basic ${basicAuth}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: "grant_type=client_credentials",
  });

  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`PayPal OAuth2 token request failed (HTTP ${response.status}): ${errText}`);
  }

  const data = await response.json() as { access_token: string; expires_in: number };
  cachedAccessToken = { token: data.access_token, expiresAt: Date.now() + data.expires_in * 1000 };
  return data.access_token;
}

async function paypalApiRequest<T>(
  path: string,
  method: string,
  body?: unknown,
  extraHeaders?: Record<string, string>
): Promise<T> {
  const token = await getPayPalAccessToken();
  const response = await fetch(`${getPayPalApiBase()}${path}`, {
    method,
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
      ...extraHeaders,
    },
    body: body ? JSON.stringify(body) : undefined,
  });

  const text = await response.text();
  const data = text ? JSON.parse(text) : {};

  if (!response.ok) {
    throw new Error(`PayPal API error [${method} ${path}] (HTTP ${response.status}): ${text}`);
  }
  return data as T;
}

export interface CreatePayPalOrderResult {
  orderId: string;
  approveUrl: string;
  mode: "sandbox" | "live";
}

export async function createPayPalCreditPurchaseOrder(input: {
  workspaceId: string;
  packId: string;
  returnUrl: string;
  cancelUrl: string;
}): Promise<CreatePayPalOrderResult> {
  assertPayPalConfigured();
  const pack = getPayPalCreditPack(input.packId);

  const order = await paypalApiRequest<{ id: string; links: Array<{ rel: string; href: string }> }>(
    "/v2/checkout/orders",
    "POST",
    {
      intent: "CAPTURE",
      purchase_units: [
        {
          reference_id: `${input.workspaceId}:${pack.id}`,
          description: pack.label,
          custom_id: input.workspaceId,
          amount: {
            currency_code: "USD",
            value: pack.priceUsd.toFixed(2),
          },
        },
      ],
      application_context: {
        return_url: input.returnUrl,
        cancel_url: input.cancelUrl,
        brand_name: "AuraPost AI",
        user_action: "PAY_NOW",
      },
    }
  );

  const approveLink = order.links.find((link) => link.rel === "approve");
  if (!approveLink) {
    throw new Error("PayPal order response did not include an approval URL.");
  }

  return {
    orderId: order.id,
    approveUrl: approveLink.href,
    mode: getPayPalMode(),
  };
}

export interface CapturePayPalOrderResult {
  orderId: string;
  captureId: string;
  status: string;
  amount: number;
  currency: string;
  payerId?: string;
  mode: "sandbox" | "live";
}

export async function capturePayPalOrder(orderId: string): Promise<CapturePayPalOrderResult> {
  assertPayPalConfigured();

  if (!orderId || orderId.startsWith("SANDBOX-ORDER-")) {
    throw new Error("Fabricated PayPal order IDs are rejected. Capture a real PayPal sandbox or live order.");
  }

  const result = await paypalApiRequest<{
    id: string;
    status: string;
    payer?: { payer_id: string };
    purchase_units: Array<{
      payments: {
        captures: Array<{
          id: string;
          status: string;
          amount: { value: string; currency_code: string };
        }>;
      };
    }>;
  }>(`/v2/checkout/orders/${encodeURIComponent(orderId)}/capture`, "POST", {});

  const capture = result.purchase_units[0]?.payments?.captures?.[0];
  if (!capture) {
    throw new Error("PayPal capture response did not include a capture record.");
  }

  return {
    orderId: result.id,
    captureId: capture.id,
    status: capture.status,
    amount: Number.parseFloat(capture.amount.value),
    currency: capture.amount.currency_code,
    payerId: result.payer?.payer_id,
    mode: getPayPalMode(),
  };
}

export interface CreatePayPalSubscriptionResult {
  subscriptionId: string;
  approveUrl: string;
  mode: "sandbox" | "live";
}

export async function createPayPalSubscription(input: {
  workspaceId: string;
  workspaceName: string;
  plan: SubscriptionPlanName;
  interval: SubscriptionInterval;
  returnUrl: string;
  cancelUrl: string;
}): Promise<CreatePayPalSubscriptionResult> {
  assertPayPalConfigured();

  const planDef = getBillingPlan(input.plan);
  const price = getPlanPrice(input.plan, input.interval);
  const envVarName = `PAYPAL_${input.plan.toUpperCase()}_${input.interval.toUpperCase()}_PLAN_ID`;
  let planId = process.env[envVarName];

  if (!planId) {
    const product = await paypalApiRequest<{ id: string }>("/v1/catalogs/products", "POST", {
      name: `AuraPost AI — ${planDef.label}`,
      description: planDef.description,
      type: "SERVICE",
      category: "SOFTWARE",
    });

    const billingPlan = await paypalApiRequest<{ id: string }>("/v1/billing/plans", "POST", {
      product_id: product.id,
      name: `${planDef.label} (${input.interval})`,
      billing_cycles: [
        {
          frequency: {
            interval_unit: input.interval === "yearly" ? "YEAR" : "MONTH",
            interval_count: 1,
          },
          tenure_type: "REGULAR",
          sequence: 1,
          total_cycles: 0,
          pricing_scheme: {
            fixed_price: { value: price.toFixed(2), currency_code: "USD" },
          },
        },
      ],
      payment_preferences: {
        auto_bill_outstanding: true,
        payment_failure_threshold: 3,
      },
    });

    planId = billingPlan.id;
    logger.warn(
      { event: "paypal_plan_created_dynamically", envVarName, planId },
      `No ${envVarName} configured — created a new PayPal Plan. Configure the plan ID before production rollout.`
    );
  }

  const subscription = await paypalApiRequest<{
    id: string;
    links: Array<{ rel: string; href: string }>;
  }>(
    "/v1/billing/subscriptions",
    "POST",
    {
      plan_id: planId,
      custom_id: input.workspaceId,
      application_context: {
        brand_name: "AuraPost AI",
        return_url: input.returnUrl,
        cancel_url: input.cancelUrl,
        user_action: "SUBSCRIBE_NOW",
      },
    }
  );

  const approveLink = subscription.links.find((link) => link.rel === "approve");
  if (!approveLink) {
    throw new Error("PayPal subscription response did not include an approval URL.");
  }

  return {
    subscriptionId: subscription.id,
    approveUrl: approveLink.href,
    mode: getPayPalMode(),
  };
}

export async function cancelPayPalSubscription(subscriptionId: string, reason: string): Promise<void> {
  assertPayPalConfigured();

  if (!subscriptionId || subscriptionId.startsWith("SANDBOX-SUB-")) {
    throw new Error("Fabricated PayPal subscription IDs are rejected.");
  }

  await paypalApiRequest(
    `/v1/billing/subscriptions/${encodeURIComponent(subscriptionId)}/cancel`,
    "POST",
    { reason }
  );
}

export interface PayPalWebhookHeaders {
  transmissionId: string;
  transmissionTime: string;
  certUrl: string;
  authAlgo: string;
  transmissionSig: string;
}

export async function verifyPayPalWebhookSignature(
  headers: PayPalWebhookHeaders,
  rawBody: string
): Promise<boolean> {
  const webhookId = process.env.PAYPAL_WEBHOOK_ID;
  if (!isPayPalConfigured() || !webhookId) {
    throw new Error(
      "PayPal webhook verification is not configured (PAYPAL_CLIENT_ID, PAYPAL_CLIENT_SECRET and PAYPAL_WEBHOOK_ID are required)."
    );
  }

  const result = await paypalApiRequest<{ verification_status: "SUCCESS" | "FAILURE" }>(
    "/v1/notifications/verify-webhook-signature",
    "POST",
    {
      transmission_id: headers.transmissionId,
      transmission_time: headers.transmissionTime,
      cert_url: headers.certUrl,
      auth_algo: headers.authAlgo,
      transmission_sig: headers.transmissionSig,
      webhook_id: webhookId,
      webhook_event: JSON.parse(rawBody),
    }
  );

  return result.verification_status === "SUCCESS";
}

export function isPayPalTransmissionTimeFresh(
  transmissionTime: string,
  maxAgeMs: number = 5 * 60 * 1000
): boolean {
  const transmittedAt = new Date(transmissionTime).getTime();
  if (Number.isNaN(transmittedAt)) return false;
  return Math.abs(Date.now() - transmittedAt) <= maxAgeMs;
}
