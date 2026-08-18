import "dotenv/config";

// Ensure NODE_ENV is always set. When running the production bundle
// (dist/server.cjs via `npm run start`), default to "production" so that
// static file serving activates instead of the Vite dev server.
// When running via `npm run dev` (tsx server.ts), default to "development".
if (!process.env.NODE_ENV) {
  const callerPath = process.argv[1] || "";
  process.env.NODE_ENV = callerPath.includes("dist") ? "production" : "development";
}

import crypto from "crypto";
import express from "express";
import path from "path";
import fs from "fs";
import { DatabaseManager } from "./server/db.ts";
import { ExtractorFactory } from "./server/extractors/factory.ts";
import { ProductAnalyzer } from "./server/ai/analyzer.ts";
import { ContentGenerator } from "./server/ai/content-generator.ts";
import { AIProviderService } from "./server/ai/provider.ts";
import { buildAdvancedAnalyticsPayload } from "./server/analytics/dashboard.ts";
import { createCheckoutSession, createCustomerPortalSession, constructStripeWebhookEvent, getStripeMode } from "./server/billing/stripe.ts";
import {
  createPayPalSubscription,
  createPayPalCreditPurchaseOrder,
  capturePayPalOrder,
  cancelPayPalSubscription,
  isPayPalTransmissionTimeFresh,
  verifyPayPalWebhookSignature,
  getPayPalMode,
  getPayPalCreditPack,
  PAYPAL_CREDIT_PACKS
} from "./server/billing/paypal.ts";
import {
  completeShopifyOAuth,
  enqueueStoreSync,
  handleShopifyWebhook,
  refreshShopifyAccessToken,
  startShopifyOAuth,
} from "./server/shopify/live-sync.ts";
import { SocialPublisherService } from "./server/social/publisher.ts";
import { publishQueuedSocialPost } from "./server/social/queue.ts";
import { QueueEngine } from "./server/queue/engine.ts";
import { DataForSEOService } from "./server/dataforseo.ts";
import {
  CreditBucketName,
  QueueJobKind,
  ShopifySyncScope,
  ShopifyWebhookTopic,
  SocialPlatform,
  SocialPostStatus,
  SubscriptionInterval,
  SubscriptionPlanName,
  SubscriptionStatus,
  VideoProviderName,
  VideoTemplateName,
  VideoOutputType,
  VideoInputMode,
  VideoAspectRatio,
  AIProviderName,
} from "./src/types.ts";
import { buildVideoAnalytics, createVideoDraft } from "./server/video/studio.ts";
import { getDefaultFallbackChain, getVideoProviders } from "./server/video/provider.ts";
import { mountVideoStudio, shutdownVideoStudio } from "./server/video-studio/mount.ts";
import { mountAssetsProjects } from "./server/mountAssetsProjects.ts";
import {
  listLegacyImageStudioProjects,
  saveLegacyImageStudioProject,
  deleteLegacyImageStudioProject,
  duplicateLegacyImageStudioProject,
} from "./server/projects/legacyImageStudioAdapter.ts";
import { getBillingPlan } from "./server/billing/plans.ts";
import authRouter from "./server/identity/routes/auth.routes.ts";
import { ImageStudioService } from "./server/ai/image-studio.ts";
import { requireAuth, requireAuthAndWorkspace, attachVideoStudioContext, attachAssetsProjectsContext } from "./server/core/middleware/AuthMiddleware.ts";
import { buildHelmetMiddleware, buildCorsMiddleware, authRateLimiter, apiRateLimiter, aiGenerationRateLimiter, webhookRateLimiter } from "./server/core/middleware/SecurityMiddleware.ts";
import { ErrorMiddleware } from "./server/core/middleware/ErrorMiddleware.ts";
import { verifyShopifyWebhookHmac } from "./server/shopify/webhook-security.ts";
import { logger, initSentry, captureException } from "./server/core/observability/logger.ts";
import pinoHttp from "pino-http";

async function startServer() {
  const app = express();

  // SECURITY FIX (Phase 1 — Issue #7): when running behind a reverse proxy or
  // load balancer (Nginx, Cloudflare, Fly, Render, etc.), Express must be told
  // to trust the proxy so that `req.ip`, `req.protocol`, and the per-IP keys
  // used by express-rate-limit reflect the real client address from the
  // X-Forwarded-For header instead of the proxy's own IP. Without this, all
  // traffic shares a single rate-limit bucket (defeating rate limiting) and
  // secure-cookie / protocol detection can misbehave. Configurable via
  // TRUST_PROXY (a hop count, "true"/"false", or an explicit IP/subnet list);
  // defaults to trusting the first proxy hop.
  const trustProxyRaw = process.env.TRUST_PROXY;
  const trustProxySetting =
    trustProxyRaw === undefined || trustProxyRaw.trim() === ""
      ? 1
      : /^\d+$/.test(trustProxyRaw.trim())
        ? Number(trustProxyRaw.trim())
        : trustProxyRaw.trim() === "true"
          ? true
          : trustProxyRaw.trim() === "false"
            ? false
            : trustProxyRaw.trim();
  app.set("trust proxy", trustProxySetting);

  const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 3000;

  // SAFETY NET: Express 4 silently swallows rejected promises from async route
  // handlers and middleware. On Node 15+ this causes unhandledRejection crashes.
  // We patch the routing methods so every async handler is automatically wrapped
  // with Promise.resolve(...).catch(next), forwarding errors to ErrorMiddleware.
  {
    const methods = ["get", "post", "put", "delete", "patch", "use", "all"] as const;
    for (const method of methods) {
      const original = (app[method] as Function).bind(app);
      (app as any)[method] = function (pathOrHandler: any, ...rest: any[]) {
        const hasPath = typeof pathOrHandler === "string";
        const handlers = hasPath ? rest : [pathOrHandler, ...rest];
        const wrapped = handlers.map((h: any) => {
          if (typeof h !== "function" || h.length >= 4) return h;
          return function wrappedAsyncHandler(req: any, res: any, next: any) {
            Promise.resolve(h(req, res, next)).catch(next);
          };
        });
        return hasPath ? original(pathOrHandler, ...wrapped) : original(...wrapped);
      };
    }
  }

  await initSentry();

  // NOTE: Production static serving is handled at the end of startServer() (after security
  // middleware is registered) to ensure CSP, CORS, and rate-limiting headers are applied
  // to all static asset responses.

  // PHASE 5 (Observability): structured request logging with automatic redaction
  // of sensitive headers/fields (see server/core/observability/logger.ts).
  app.use(pinoHttp({
    logger,
    autoLogging: {
      ignore: (req) => req.url === "/api/health" || req.url === "/api/ready",
    },
    customProps: () => ({ service: "aurapost-api" }),
  }));

  // SECURITY HARDENING (Phase 1): secure headers, CORS allowlist, and global rate limiting.
  // Request ID middleware - adds X-Request-Id header to every response
  app.use((req, res, next) => {
    const requestId = (req.headers["x-request-id"] as string) || crypto.randomUUID();
    req.headers["x-request-id"] = requestId;
    res.setHeader("X-Request-Id", requestId);
    next();
  });
  app.use(buildHelmetMiddleware());
  app.use(buildCorsMiddleware());
  app.use((err: any, _req: express.Request, res: express.Response, next: express.NextFunction) => {
    if (err && typeof err.message === "string" && err.message.startsWith("CORS:")) {
      return res.status(403).json({ error: err.message });
    }
    return next(err);
  });
  app.use("/api", apiRateLimiter);

  // Higher body-size limit for the specific routes that legitimately carry base64 image
  // payloads. Must be mounted BEFORE the global stricter parser below, since body-parser
  // skips re-parsing a request whose body has already been parsed.
  const imageBodyParser = express.json({
    limit: "50mb",
    verify: (req, _res, buf) => {
      (req as express.Request & { rawBody?: Buffer }).rawBody = Buffer.from(buf);
    },
  });
  app.use("/api/images", imageBodyParser);

  // Video Studio routes carry larger product/campaign payloads than the
  // global default; same pre-parse-before-global-parser pattern as images.
  const videoStudioBodyParser = express.json({
    limit: "5mb",
    verify: (req, _res, buf) => {
      (req as express.Request & { rawBody?: Buffer }).rawBody = Buffer.from(buf);
    },
  });
  app.use("/api/video", videoStudioBodyParser);

  // Middleware
  app.use(express.json({
    limit: "1mb", // SECURITY FIX: previously unbounded default JSON body size on most routes
    verify: (req, _res, buf) => {
      (req as express.Request & { rawBody?: Buffer }).rawBody = Buffer.from(buf);
    },
  }));

  // Acquire DB Instance
  const db = await DatabaseManager.getInstance();
  const queueEngine = new QueueEngine(db);
  queueEngine.start();

  // Mount the Video Studio module, reusing this same pool and AuraPost's
  // existing auth (no second DB connection, no separate auth system).
  mountVideoStudio(app, db.getPool(), { requireAuthAndWorkspace, attachVideoStudioContext });

  // Mount the Assets + Projects modules (ported from Image Studio), reusing
  // this same pool and auth — see server/mountAssetsProjects.ts.
  mountAssetsProjects(app, db.getPool(), { requireAuthAndWorkspace, attachAssetsProjectsContext });

  const supportedSocialPlatforms: SocialPlatform[] = [
    "facebook",
    "instagram",
    "tiktok",
    "pinterest",
    "x",
    "linkedin",
    "youtube_shorts",
  ];
  const supportedVideoTemplates: VideoTemplateName[] = [
    "product_showcase",
    "ugc_testimonial",
    "problem_solution",
    "before_after",
    "unboxing",
    "luxury_brand_ad",
    "storytelling_ad",
  ];

  const sendInsufficientCredits = async (
    res: express.Response,
    workspaceId: string,
    bucket: CreditBucketName,
    requiredCredits: number
  ) => {
    const workspace = await db.getWorkspace(workspaceId);
    const availableCredits = workspace?.creditPools?.[bucket].balance || 0;
    const plan = workspace?.plan || "free";
    return res.status(402).json({
      error: `Insufficient ${bucket} credits. This action requires ${requiredCredits} ${bucket} credits.`,
      code: "INSUFFICIENT_CREDITS",
      workspaceId,
      creditBucket: bucket,
      requiredCredits,
      availableCredits,
      currentPlan: plan,
      upgradePrompt: {
        title: `Upgrade from ${plan} to unlock more ${bucket} credits`,
        cta: "Open Billing",
      },
    });
  };

  const buildSocialSuggestions = (payload: Record<string, any>, generationId?: string) => {
    const suggestions: Array<{ id: string; label: string; text: string; type: string; generationId?: string }> = [];

    (payload.hooks || []).forEach((hook: any, index: number) => {
      if (hook?.content) {
        suggestions.push({
          id: `hook-${index}`,
          label: `Hook ${index + 1}`,
          text: hook.content,
          type: "hook",
          generationId,
        });
      }
    });

    (payload.adCopy || []).forEach((copy: any, index: number) => {
      if (copy?.text) {
        suggestions.push({
          id: `ad-${index}`,
          label: `${copy.platform || "Ad"} ${index + 1}`,
          text: copy.text,
          type: "ad_copy",
          generationId,
        });
      }
    });

    (payload.scripts || []).forEach((script: any, index: number) => {
      const scriptText = [script.hook, script.problem, script.solution, script.cta].filter(Boolean).join(" ");
      if (scriptText) {
        suggestions.push({
          id: `script-${index}`,
          label: script.title || `Script ${index + 1}`,
          text: scriptText,
          type: "script",
          generationId,
        });
      }
    });

    if (payload.descriptions?.short) {
      suggestions.push({
        id: "description-short",
        label: "Short Description",
        text: payload.descriptions.short,
        type: "description",
        generationId,
      });
    }

    if (payload.landingPage?.headline) {
      suggestions.push({
        id: "landing-headline",
        label: "Landing Headline",
        text: `${payload.landingPage.headline} ${payload.landingPage.subheadline || ""}`.trim(),
        type: "landing_page",
        generationId,
      });
    }

    return suggestions;
  };

  const enqueueQueueJob = async (
    workspaceId: string,
    kind: QueueJobKind,
    referenceId: string | undefined,
    payload: Record<string, unknown>,
    options: {
      workerName: "import-worker" | "shopify-worker" | "content-worker" | "video-worker" | "publishing-worker" | "automation-worker";
      priority?: number;
      maxAttempts?: number;
      backoffMs?: number;
    }
  ) => await db.enqueueQueueJob(workspaceId, {
    kind,
    workerName: options.workerName,
    referenceId,
    payload,
    priority: options.priority,
    maxAttempts: options.maxAttempts,
    backoffMs: options.backoffMs,
  });

  const recordBillingSuccess = async (
    workspaceId: string,
    plan: SubscriptionPlanName,
    interval: SubscriptionInterval,
    source: string,
    stripeInvoiceId?: string,
    stripePaymentIntentId?: string,
    paypalOrderId?: string,
    paypalCaptureId?: string
  ) => {
    const planPrice = interval === "yearly" ? getBillingPlan(plan).yearlyPrice : getBillingPlan(plan).monthlyPrice;
    const subscription = await db.getWorkspaceSubscription(workspaceId);
    const paymentProvider: "paypal" | "stripe" = paypalOrderId || paypalCaptureId ? "paypal" : "stripe";
    const invoice = await db.createBillingInvoice(workspaceId, {
      subscriptionId: subscription?.id,
      paymentProvider,
      stripeInvoiceId,
      paypalOrderId,
      paypalCaptureId,
      amountPaid: planPrice,
      currency: "USD",
      status: "paid",
      hostedInvoiceUrl: paymentProvider === "paypal"
        ? `{{https://www.paypal.com/activity/payment/${paypalCaptureId}} || paypalOrderId || `sandbox-${Date.now()}`}`
        : `{{https://billing.stripe.com/invoices/${stripeInvoiceId}} || `sandbox-${Date.now()}`}`,
      invoicePdfUrl: paymentProvider === "paypal"
        ? `{{https://www.paypal.com/activity/payment/${paypalCaptureId}} || paypalOrderId || `sandbox-${Date.now()}`}`
        : `{{https://billing.stripe.com/invoices/${stripeInvoiceId}} || `sandbox-${Date.now()}`}/pdf`,
    });
    await db.createPaymentHistoryItem(workspaceId, {
      invoiceId: invoice.id,
      paymentProvider,
      stripePaymentIntentId,
      paypalOrderId,
      paypalCaptureId,
      amount: planPrice,
      currency: "USD",
      status: "paid",
      paymentMethod: source,
      description: `${plan} ${interval} subscription payment`,
    });
  };

  const activatePlan = async (
    workspaceId: string,
    plan: SubscriptionPlanName,
    interval: SubscriptionInterval,
    options: {
      status?: SubscriptionStatus;
      paymentProvider?: "paypal" | "stripe";
      stripeMode?: "sandbox" | "live";
      stripeCustomerId?: string;
      stripeSubscriptionId?: string;
      stripeCheckoutSessionId?: string;
      paypalMode?: "sandbox" | "live";
      paypalSubscriptionId?: string;
      paypalPlanId?: string;
      paypalPayerId?: string;
      reason: string;
      recordPayment?: boolean;
      stripeInvoiceId?: string;
      stripePaymentIntentId?: string;
      paypalOrderId?: string;
      paypalCaptureId?: string;
    }
  ) => {
    const status = options.status || (plan === "free" ? "trialing" : "active");
    const subscription = await db.changeSubscriptionPlan(workspaceId, {
      plan,
      billingInterval: interval,
      status,
      paymentProvider: options.paymentProvider,
      stripeMode: options.stripeMode,
      stripeCustomerId: options.stripeCustomerId,
      stripeSubscriptionId: options.stripeSubscriptionId,
      stripeCheckoutSessionId: options.stripeCheckoutSessionId,
      paypalMode: options.paypalMode,
      paypalSubscriptionId: options.paypalSubscriptionId,
      paypalPlanId: options.paypalPlanId,
      paypalPayerId: options.paypalPayerId,
      reason: options.reason,
    });
    if (options.recordPayment && plan !== "free") {
      await recordBillingSuccess(
        workspaceId,
        plan,
        interval,
        subscription.paymentProvider === "paypal" ? "paypal" : (subscription.stripeMode === "live" ? "stripe" : "sandbox"),
        options.stripeInvoiceId,
        options.stripePaymentIntentId,
        options.paypalOrderId,
        options.paypalCaptureId
      );
    }
    // AUDIT (Phase 1 — Issue #6): centralize subscription/plan lifecycle logging
    // so every activation, upgrade, downgrade, and renewal is recorded through a
    // single code path, regardless of which billing provider or route triggered
    // it. Audit logging must never block or fail a billing state change.
    try {
      await db.logAudit(
        workspaceId,
        "SUBSCRIPTION_PLAN_ACTIVATED",
        `${options.reason} (plan=${plan}, interval=${interval}, status=${status}, provider=${options.paymentProvider || (options.paypalSubscriptionId ? "paypal" : "stripe")}).`
      );
    } catch (auditErr: any) {
      logger.warn({ err: auditErr?.message, workspaceId }, "Failed to write subscription audit log entry");
    }
    return subscription;
  };

  // --- API Routes ---


  // Auth routes (public: login/register/refresh/forgot-password)
  app.use("/api/auth", authRateLimiter, authRouter);

  // Health check endpoint (public) - process liveness only, no dependency checks.
  app.get("/api/health", (_req, res) => {
    res.json({
      status: "ok",
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      environment: process.env.NODE_ENV || "development",
    });
  });

  // Readiness check - verifies the database is actually reachable/queryable,
  // distinct from the liveness-only /api/health above.
  // Load balancers / orchestrators should route traffic based on this endpoint.
  app.get("/api/ready", async (_req, res) => {
    try {
      const dbInstance = await DatabaseManager.getInstance();
      await dbInstance.dbGet("SELECT 1");
      res.json({
        status: "ready",
        database: "connected",
        timestamp: new Date().toISOString(),
      });
    } catch (err: any) {
      res.status(503).json({
        status: "not ready",
        database: "disconnected",
        error: process.env.NODE_ENV === "production" ? "Database connection failed" : err.message,
        timestamp: new Date().toISOString(),
      });
    }
  });

  // SECURITY FIX (Phase 1 — Critical Issue #1): every remaining /api/* route
  // now requires a valid JWT and verified workspace membership. Only truly
  // public integration webhooks (verified by their own external signature
  // schemes, not a user session) are excluded here.
  const PUBLIC_WEBHOOK_PATHS = [
    "/api/billing/stripe/webhook",
    "/api/billing/paypal/webhook", // PayPal webhook - verified by PayPal's own transmission signature, not a user session
    "/api/auth/meta/callback", // Meta OAuth redirect target - carries its own state/code verification
  ];
  app.use("/api", (req, res, next) => {
    // SECURITY FIX (Phase 1 — Issue #3): match public webhook endpoints by the
    // EXACT request pathname (query string stripped) instead of the previous
    // loose `originalUrl.startsWith(p)`, which allowed any URL merely *starting
    // with* a public webhook path (e.g. `/api/billing/stripe/webhook-forged` or
    // `/api/billing/stripe/webhookX`) to bypass authentication entirely.
    const pathname = (req.originalUrl || req.url).split("?", 1)[0];
    const isPublicWebhook =
      PUBLIC_WEBHOOK_PATHS.includes(pathname) ||
      pathname.startsWith("/api/shopify/webhooks/");
    if (isPublicWebhook) {
      return next();
    }
    const [authMiddleware, workspaceMiddleware] = requireAuthAndWorkspace();
    authMiddleware(req as any, res, (err?: any) => {
      if (err) return next(err);
      workspaceMiddleware(req as any, res, next);
    });
  });

  // 1. Get workspace details
  app.get("/api/workspace", async (req, res) => {
    const workspaceId = (req.query.workspaceId as string) || (req as any).workspaceId;
    const ws = await db.getWorkspace(workspaceId);
    if (!ws) {
      res.status(404).json({ error: "Workspace not found" });
    } else {
      res.json(ws);
    }
  });

  app.get("/api/billing/overview", async (req, res) => {
    const workspaceId = (req.query.workspaceId as string) || (req as any).workspaceId;
    try {
      return res.json(await db.getBillingOverview(workspaceId));
    } catch (err: any) {
      return res.status(404).json({ error: err.message || "Billing overview not found." });
    }
  });

  // Authoritative credit balance (per bucket: ai/video/publishing). This is
  // the endpoint any client-side credit display (Video Studio, Image
  // Studio's CreditManager, etc.) should read from — never trust a
  // client-local balance for anything security/billing sensitive. See
  // AUDIT_REPORT.md Issue #4 and src/features/ai/credits/creditApiClient.ts.
  app.get("/api/billing/credits", async (req, res) => {
    const workspaceId = (req.query.workspaceId as string) || (req as any).workspaceId;
    try {
      const summary = await db.getWorkspaceCreditSummary(workspaceId);
      if (!summary) {
        return res.status(404).json({ error: "No credit summary found for this workspace." });
      }
      return res.json(summary);
    } catch (err: any) {
      return res.status(500).json({ error: err.message || "Failed to load credit summary." });
    }
  });

  app.get("/api/billing/analytics", async (_req, res) => {
    return res.json(await db.getBillingAnalytics());
  });

  app.get("/api/billing/paypal/credit-packs", async (_req, res) => {
    return res.json({ packs: PAYPAL_CREDIT_PACKS, mode: getPayPalMode() });
  });

  app.get("/api/shopify/overview", async (req, res) => {
    const workspaceId = (req.query.workspaceId as string) || (req as any).workspaceId;
    try {
      return res.json(await db.getShopifySyncOverview(workspaceId));
    } catch (err: any) {
      return res.status(500).json({ error: err.message || "Failed to load Shopify overview." });
    }
  });

  app.post("/api/shopify/oauth/start", async (req, res) => {
    const { shopDomain, redirectUri } = req.body as { shopDomain?: string; redirectUri?: string };
    if (!shopDomain) {
      return res.status(400).json({ error: "shopDomain is required." });
    }
    const cleanDomain = shopDomain.trim().toLowerCase().replace(/^https?:\/\//, "").replace(/\/$/, "");
    if (!/^[a-zA-Z0-9][a-zA-Z0-9\-]*\.[a-zA-Z]{2,}$/.test(cleanDomain)) {
      return res.status(400).json({ error: "Invalid shop domain format." });
    }
    if (!cleanDomain.endsWith(".myshopify.com") && !cleanDomain.endsWith(".shopify.com")) {
      return res.status(400).json({ error: "Shop domain must be a valid Shopify domain (*.myshopify.com)." });
    }
    try {
      const effectiveRedirectUri = redirectUri || `${process.env.APP_BASE_URL || ""}/api/shopify/oauth/callback`;
      const result = startShopifyOAuth(cleanDomain, effectiveRedirectUri);
      return res.json(result);
    } catch (err: any) {
      return res.status(500).json({ error: "Failed to start Shopify OAuth." });
    }
  });

  app.post("/api/shopify/oauth/callback", async (req, res) => {
    const {
      workspaceId,
      shopDomain,
      code,
      state,
    } = req.body as { workspaceId?: string; shopDomain?: string; code?: string; state?: string };
    if (!shopDomain) {
      return res.status(400).json({ error: "shopDomain is required." });
    }
    if (state) {
      const savedState = await db.getOAuthState(state);
      if (!savedState) {
        logger.warn({ state }, "Invalid Shopify OAuth state parameter");
        return res.status(400).json({ error: "Invalid OAuth state. Please try again." });
      }
      await db.deleteOAuthState(state);
    }
    try {
      const store = await completeShopifyOAuth(db, {
        workspaceId,
        shopDomain,
        code,
        state,
      });
      const syncJobs = await enqueueStoreSync(db, workspaceId, store.id);
      for (const syncJob of syncJobs) {
        await enqueueQueueJob(workspaceId, "shopify_sync", syncJob.id, {
          workspaceId,
          storeId: store.id,
        }, {
          workerName: "shopify-worker",
          priority: 8,
          maxAttempts: 4,
          backoffMs: 2000,
        });
      }
      return res.status(201).json({ success: true, store, overview: await db.getShopifySyncOverview(workspaceId) });
    } catch (err: any) {
      return res.status(500).json({ error: err.message || "Failed to complete Shopify OAuth." });
    }
  });

  app.post("/api/shopify/stores/:storeId/disconnect", async (req, res) => {
    const workspaceId = (req.body.workspaceId as string) || (req as any).workspaceId;
    const store = await db.disconnectShopifyStore(workspaceId, req.params.storeId);
    if (!store) {
      return res.status(404).json({ error: "Store not found." });
    }
    return res.json({ success: true, store, overview: await db.getShopifySyncOverview(workspaceId) });
  });

  app.post("/api/shopify/stores/:storeId/reconnect", async (req, res) => {
    const workspaceId = (req.body.workspaceId as string) || (req as any).workspaceId;
    const store = await db.updateShopifyStore(workspaceId, req.params.storeId, {
      status: "connected",
    });
    if (!store) {
      return res.status(404).json({ error: "Store not found." });
    }
    const refreshed = await refreshShopifyAccessToken(db, workspaceId, req.params.storeId);
    const syncJobs = await enqueueStoreSync(db, workspaceId, req.params.storeId);
    for (const syncJob of syncJobs) {
      await enqueueQueueJob(workspaceId, "shopify_sync", syncJob.id, {
        workspaceId,
        storeId: req.params.storeId,
      }, {
        workerName: "shopify-worker",
        priority: 8,
        maxAttempts: 4,
        backoffMs: 2000,
      });
    }
    return res.json({ success: true, store: refreshed, overview: await db.getShopifySyncOverview(workspaceId) });
  });

  app.post("/api/shopify/stores/:storeId/refresh-token", async (req, res) => {
    const workspaceId = (req.body.workspaceId as string) || (req as any).workspaceId;
    try {
      const store = await refreshShopifyAccessToken(db, workspaceId, req.params.storeId);
      return res.json({ success: true, store });
    } catch (err: any) {
      return res.status(404).json({ error: err.message || "Failed to refresh Shopify token." });
    }
  });

  app.post("/api/shopify/stores/:storeId/sync", async (req, res) => {
    const workspaceId = (req.body.workspaceId as string) || (req as any).workspaceId;
    const scope = req.body.scope as ShopifySyncScope | undefined;
    const syncJobs = await enqueueStoreSync(db, workspaceId, req.params.storeId, scope);
    for (const syncJob of syncJobs) {
      await enqueueQueueJob(workspaceId, "shopify_sync", syncJob.id, {
        workspaceId,
        storeId: req.params.storeId,
      }, {
        workerName: "shopify-worker",
        priority: 8,
        maxAttempts: 4,
        backoffMs: 2000,
      });
    }
    return res.status(201).json({ success: true, jobs: syncJobs, overview: await db.getShopifySyncOverview(workspaceId) });
  });

  app.post("/api/shopify/stores/:storeId/automation", async (req, res) => {
    const workspaceId = (req.body.workspaceId as string) || (req as any).workspaceId;
    const settings = await db.saveShopifyAutomationSettings(workspaceId, req.params.storeId, req.body);
    return res.json({ success: true, settings });
  });

  app.post("/api/shopify/webhooks/:storeId", webhookRateLimiter, async (req, res) => {
    // SECURITY FIX (Phase 1): this endpoint previously accepted any unauthenticated
    // POST with no signature verification at all, allowing anyone to forge a fake
    // Shopify webhook and trigger a real sync job against a real store connection.
    const verification = verifyShopifyWebhookHmac(req as any);
    if (!verification.valid) {
      logger.warn(`[Shopify Webhook] Rejected unverified webhook for store ${req.params.storeId}: ${verification.reason}`);
      return res.status(401).json({ error: "Webhook signature verification failed." });
    }

    const workspaceId = (req.body.workspaceId as string) || (req as any).workspaceId;
    const topic = req.headers["x-shopify-topic"] || req.body.topic;
    if (!topic) {
      return res.status(400).json({ error: "Shopify webhook topic is required." });
    }
    try {
      const job = await handleShopifyWebhook(
        db,
        workspaceId,
        req.params.storeId,
        topic as ShopifyWebhookTopic,
        (req.body.payload || req.body) as Record<string, unknown>
      );
      const queueJob = await enqueueQueueJob(workspaceId, "shopify_sync", job.id, {
        workspaceId,
        storeId: req.params.storeId,
      }, {
        workerName: "shopify-worker",
        priority: 9,
        maxAttempts: 4,
        backoffMs: 1500,
      });
      return res.status(202).json({ success: true, job, queueJob, overview: await db.getShopifySyncOverview(workspaceId) });
    } catch (err: any) {
      return res.status(500).json({ error: err.message || "Failed to handle Shopify webhook." });
    }
  });

  app.post("/api/billing/subscription/change", async (req, res) => {
    const {
      workspaceId,
      plan,
      billingInterval = "monthly",
    } = req.body as {
      workspaceId?: string;
      plan?: SubscriptionPlanName;
      billingInterval?: SubscriptionInterval;
    };

    if (!plan || !["free", "starter", "pro", "enterprise"].includes(plan)) {
      return res.status(400).json({ error: "A valid plan is required." });
    }

    // SECURITY FIX (Phase 1 — Issue #2): this endpoint activates a plan directly
    // WITHOUT any verified payment. Downgrading to the free plan is always safe,
    // but activating a PAID plan this way must never be reachable in production
    // — otherwise any authenticated workspace member could grant themselves a
    // paid subscription for free. Paid plans must go through the Stripe/PayPal
    // checkout + verified-webhook flow. Direct paid activation is only allowed
    // outside production (local/dev/test) for convenience.
    if (plan !== "free" && process.env.NODE_ENV === "production") {
      return res.status(403).json({
        error: "Paid plans must be activated through a verified payment checkout.",
        code: "PAYMENT_REQUIRED_FOR_PLAN_CHANGE",
      });
    }

    const subscription = await activatePlan(workspaceId, plan, billingInterval, {
      reason: `Changed subscription to ${plan} (${billingInterval}).`,
      stripeMode: getStripeMode(),
      recordPayment: plan !== "free",
    });
    return res.json({ success: true, subscription, overview: await db.getBillingOverview(workspaceId) });
  });

  app.post("/api/billing/subscription/cancel", async (req, res) => {
    const {
      workspaceId,
      immediate = false,
    } = req.body as { workspaceId?: string; immediate?: boolean };
    try {
      const subscription = await db.cancelWorkspaceSubscription(workspaceId, immediate);
      return res.json({ success: true, subscription });
    } catch (err: any) {
      return res.status(400).json({ error: err.message || "Failed to cancel subscription." });
    }
  });

  app.post("/api/billing/stripe/checkout-session", async (req, res) => {
    const {
      workspaceId,
      plan,
      billingInterval = "monthly",
      successUrl = "{{http://localhost:3000/billing?session_id={CHECKOUT_SESSION_ID}}}",
      cancelUrl = "http://localhost:3000/billing",
      customerEmail,
    } = req.body as {
      workspaceId?: string;
      plan?: SubscriptionPlanName;
      billingInterval?: SubscriptionInterval;
      successUrl?: string;
      cancelUrl?: string;
      customerEmail?: string;
    };

    if (!plan || !["free", "starter", "pro", "enterprise"].includes(plan)) {
      return res.status(400).json({ error: "A valid plan is required." });
    }

    const workspace = await db.getWorkspace(workspaceId);
    const subscription = await db.getWorkspaceSubscription(workspaceId);
    if (!workspace || !subscription) {
      return res.status(404).json({ error: "Workspace not found." });
    }

    try {
      const session = await createCheckoutSession({
        workspaceId,
        workspaceName: workspace.name,
        plan,
        interval: billingInterval,
        successUrl,
        cancelUrl,
        customerEmail,
        stripeCustomerId: subscription.stripeCustomerId,
      });

      await db.updateWorkspaceSubscription(workspaceId, {
        stripeCheckoutSessionId: session.sessionId,
        stripeMode: session.mode,
      });

      // SECURITY FIX (Phase 1 — Issue #2): sandbox mode (no STRIPE_SECRET_KEY
      // configured) previously auto-activated the requested plan immediately,
      // with NO payment taken. In production this turns a missing or
      // misconfigured Stripe key into a "free paid subscription" exploit. We now
      // only auto-activate a sandbox checkout outside production; free-plan setup
      // is always allowed.
      if (session.mode === "sandbox") {
        if (plan !== "free" && process.env.NODE_ENV === "production") {
          return res.status(503).json({
            error: "Payments are not configured on this server (Stripe is in sandbox mode). Paid plans cannot be activated without a live payment provider.",
            code: "BILLING_NOT_CONFIGURED",
          });
        }
        await activatePlan(workspaceId, plan, billingInterval, {
          reason: `Sandbox checkout completed for ${plan} (${billingInterval}).`,
          stripeMode: "sandbox",
          stripeCheckoutSessionId: session.sessionId,
          recordPayment: plan !== "free",
        });
      }

      return res.json({
        success: true,
        sessionId: session.sessionId,
        stripeRedirectUrl: session.stripeRedirectUrl,
        mode: session.mode,
        overview: await db.getBillingOverview(workspaceId),
      });
    } catch (err: any) {
      return res.status(500).json({ error: err.message || "Failed to create checkout session." });
    }
  });

  app.post("/api/billing/stripe/customer-portal", async (req, res) => {
    const {
      workspaceId,
      returnUrl = "http://localhost:3000/billing",
    } = req.body as { workspaceId?: string; returnUrl?: string };

    try {
      const subscription = await db.getWorkspaceSubscription(workspaceId);
      if (!subscription) {
        return res.status(404).json({ error: "Workspace subscription not found." });
      }
      const session = await createCustomerPortalSession({
        workspaceId,
        returnUrl,
        stripeCustomerId: subscription.stripeCustomerId,
      });
      await db.updateWorkspaceSubscription(workspaceId, {
        stripePortalUrl: session.url,
        stripeMode: session.mode,
      });
      return res.json({ success: true, url: session.url, mode: session.mode });
    } catch (err: any) {
      return res.status(500).json({ error: err.message || "Failed to create customer portal session." });
    }
  });

  app.post("/api/billing/stripe/webhook", webhookRateLimiter, async (req, res) => {
    const requestWithRaw = req as express.Request & { rawBody?: Buffer };
    const signature = req.headers["stripe-signature"] as string | undefined;
    let event: any = null;

    try {
      event = constructStripeWebhookEvent(requestWithRaw.rawBody || Buffer.from(JSON.stringify(req.body || {})), signature);
    } catch (err: any) {
      return res.status(400).json({ error: err.message || "Invalid Stripe webhook signature." });
    }

    if (!event) {
      // SECURITY FIX (Phase 1): previously fell back to `req.body` (untrusted, unverified)
      // whenever STRIPE_WEBHOOK_SECRET or the signature header was missing, meaning any
      // unauthenticated caller could POST a fake "checkout.session.completed" event and
      // activate a paid plan for free. Webhook events with no verifiable signature are
      // now rejected outright instead of trusted.
      return res.status(401).json({
        error: "Webhook signature could not be verified. Ensure STRIPE_WEBHOOK_SECRET is configured and the request includes a valid Stripe-Signature header.",
      });
    }

    const eventType = event?.type;
    const eventObject = event?.data?.object || {};
    const metadata = eventObject.metadata || {};
    const workspaceId = metadata.workspaceId as string | undefined;

    if (!eventType) {
      return res.status(400).json({ error: "Webhook event type is required." });
    }

    const { alreadyProcessed } = await db.recordStripeWebhookEvent(workspaceId, eventType, event, event.id);

    if (alreadyProcessed) {
      return res.json({ received: true, duplicate: true });
    }

    try {
      if (eventType === "checkout.session.completed" && workspaceId) {
        const plan = (metadata.plan || "starter") as SubscriptionPlanName;
        const interval = (metadata.interval || "monthly") as SubscriptionInterval;
        await activatePlan(workspaceId, plan, interval, {
          reason: `Stripe checkout completed for ${plan} (${interval}).`,
          stripeMode: "live",
          stripeCustomerId: eventObject.customer || undefined,
          stripeSubscriptionId: eventObject.subscription || undefined,
          stripeCheckoutSessionId: eventObject.id || undefined,
          recordPayment: plan !== "free",
          stripePaymentIntentId: eventObject.payment_intent || undefined,
        });
      }

      if (eventType === "customer.subscription.updated" && workspaceId) {
        await db.updateWorkspaceSubscription(workspaceId, {
          status: (eventObject.status || "active") as SubscriptionStatus,
          stripeSubscriptionId: eventObject.id || undefined,
          cancelAtPeriodEnd: Boolean(eventObject.cancel_at_period_end),
          currentPeriodStart: eventObject.current_period_start
            ? new Date(eventObject.current_period_start * 1000).toISOString()
            : undefined,
          currentPeriodEnd: eventObject.current_period_end
            ? new Date(eventObject.current_period_end * 1000).toISOString()
            : undefined,
        });
      }

      if (eventType === "customer.subscription.deleted" && workspaceId) {
        await db.cancelWorkspaceSubscription(workspaceId, true);
      }

      if (eventType === "invoice.payment_succeeded" && workspaceId) {
        const subscription = await db.getWorkspaceSubscription(workspaceId);
        if (subscription) {
          await activatePlan(workspaceId, subscription.plan, subscription.billingInterval, {
            reason: `Renewed ${subscription.plan} subscription after successful invoice payment.`,
            stripeMode: "live",
            stripeCustomerId: subscription.stripeCustomerId,
            stripeSubscriptionId: subscription.stripeSubscriptionId,
            recordPayment: subscription.plan !== "free",
            stripeInvoiceId: eventObject.id || undefined,
            stripePaymentIntentId: eventObject.payment_intent || undefined,
          });
        }
      }

      if (eventType === "invoice.payment_failed" && workspaceId) {
        const subscription = await db.getWorkspaceSubscription(workspaceId);
        if (subscription) {
          await db.updateWorkspaceSubscription(workspaceId, {
            status: "past_due",
          });
        }
        await db.createPaymentHistoryItem(workspaceId, {
          invoiceId: undefined,
          stripePaymentIntentId: eventObject.payment_intent || undefined,
          amount: (eventObject.amount_due || 0) / 100,
          currency: (eventObject.currency || "usd").toUpperCase(),
          status: "failed",
          paymentMethod: "stripe",
          description: "Invoice payment failed",
        });
      }

      return res.json({ received: true, action: eventType, workspaceId });
    } catch (err: any) {
      return res.status(500).json({ error: err.message || "Failed to process Stripe webhook." });
    }
  });

  // ─── PHASE 2: PayPal Integration ────────────────────────────────
  // PayPal is the primary payment processor. Mirrors the Stripe routes above in
  // shape (checkout-session-style creation endpoint + webhook), but follows
  // PayPal's own API model: subscriptions require a pre-existing Plan, and
  // one-time payments (credit purchases) use the separate Orders v2 API with an
  // explicit two-step create-then-capture flow.

  app.post("/api/billing/paypal/subscribe", async (req, res) => {
    const workspaceId = (req.body.workspaceId as string) || (req as any).workspaceId;
    const plan = (req.body.plan as SubscriptionPlanName) || "starter";
    const interval = (req.body.billingInterval as SubscriptionInterval) || "monthly";
    const appBase = `${req.protocol}://${req.get("host")}`;
    let returnUrl = (req.body.returnUrl as string) || `${appBase}/billing/paypal/return`;
    let cancelUrl = (req.body.cancelUrl as string) || `${appBase}/billing/paypal/cancel`;
    if (!returnUrl.startsWith(appBase)) returnUrl = `${appBase}/billing/paypal/return`;
    if (!cancelUrl.startsWith(appBase)) cancelUrl = `${appBase}/billing/paypal/cancel`;

    try {
      const workspace = await db.getWorkspace(workspaceId);
      const result = await createPayPalSubscription({
        workspaceId,
        workspaceName: workspace?.name || workspaceId,
        plan,
        interval,
        returnUrl,
        cancelUrl,
      });
      // Persist the pending subscription id now so the webhook (which arrives
      // asynchronously after buyer approval) can resolve it back to this workspace.
      await db.changeSubscriptionPlan(workspaceId, {
        plan,
        billingInterval: interval,
        status: "trialing",
        paymentProvider: "paypal",
        paypalMode: result.mode,
        paypalSubscriptionId: result.subscriptionId,
        reason: `PayPal subscription checkout initiated for ${plan} (${interval}).`,
      });
      return res.json({ success: true, ...result });
    } catch (err: any) {
      return res.status(500).json({ error: err.message || "Failed to create PayPal subscription." });
    }
  });

  app.post("/api/billing/paypal/credits/create-order", async (req, res) => {
    const workspaceId = (req.body.workspaceId as string) || (req as any).workspaceId;
    const packId = req.body.packId as string;
    const returnUrl = (req.body.returnUrl as string) || `${req.protocol}://${req.get("host")}/billing/paypal/credits/return`;
    const cancelUrl = (req.body.cancelUrl as string) || `${req.protocol}://${req.get("host")}/billing/paypal/credits/cancel`;

    try {
      const pack = getPayPalCreditPack(packId);
      const result = await createPayPalCreditPurchaseOrder({ workspaceId, packId, returnUrl, cancelUrl });
      await db.logAudit(workspaceId, "PAYPAL_CREDIT_ORDER_CREATED", `Created PayPal order ${result.orderId} for ${pack.label} ($${pack.priceUsd}).`);
      return res.json({ success: true, pack, ...result });
    } catch (err: any) {
      return res.status(400).json({ error: err.message || "Failed to create PayPal credit purchase order." });
    }
  });

  app.post("/api/billing/paypal/credits/capture-order", async (req, res) => {
    const workspaceId = (req.body.workspaceId as string) || (req as any).workspaceId;
    const orderId = req.body.orderId as string;
    const packId = req.body.packId as string;

    if (!orderId || !packId) {
      return res.status(400).json({ error: "orderId and packId are required." });
    }

    try {
      const pack = getPayPalCreditPack(packId);
      const capture = await capturePayPalOrder(orderId);

      if (capture.status !== "COMPLETED") {
        return res.status(402).json({ error: `PayPal order was not completed (status: ${capture.status}).` });
      }

      await db.allocateCredits(
        workspaceId,
        "payment",
        { [pack.bucket]: pack.credits },
        capture.orderId,
        `Purchased ${pack.label} via PayPal (order ${capture.orderId}, capture ${capture.captureId}).`
      );

      const invoice = await db.createBillingInvoice(workspaceId, {
        paymentProvider: "paypal",
        paypalOrderId: capture.orderId,
        paypalCaptureId: capture.captureId,
        amountPaid: pack.priceUsd,
        currency: capture.currency,
        status: "paid",
        hostedInvoiceUrl: `{{https://www.paypal.com/activity/payment/${capture.captureId}}}`,
        invoicePdfUrl: `{{https://www.paypal.com/activity/payment/${capture.captureId}}}`,
      });
      await db.createPaymentHistoryItem(workspaceId, {
        invoiceId: invoice.id,
        paymentProvider: "paypal",
        paypalOrderId: capture.orderId,
        paypalCaptureId: capture.captureId,
        amount: pack.priceUsd,
        currency: capture.currency,
        status: "paid",
        paymentMethod: capture.mode === "live" ? "paypal" : "paypal-sandbox",
        description: `Credit purchase: ${pack.label}`,
      });

      return res.json({ success: true, capture, creditsAdded: pack.credits, bucket: pack.bucket });
    } catch (err: any) {
      return res.status(500).json({ error: err.message || "Failed to capture PayPal order." });
    }
  });

  app.post("/api/billing/paypal/subscription/cancel", async (req, res) => {
    const workspaceId = (req.body.workspaceId as string) || (req as any).workspaceId;
    try {
      const subscription = await db.getWorkspaceSubscription(workspaceId);
      if (subscription?.paypalSubscriptionId) {
        await cancelPayPalSubscription(subscription.paypalSubscriptionId, "Canceled by customer request.");
      }
      const next = await db.cancelWorkspaceSubscription(workspaceId, false);
      return res.json({ success: true, subscription: next });
    } catch (err: any) {
      return res.status(500).json({ error: err.message || "Failed to cancel PayPal subscription." });
    }
  });

  app.post("/api/billing/paypal/webhook", webhookRateLimiter, async (req, res) => {
    const requestWithRaw = req as express.Request & { rawBody?: Buffer };
    const rawBody = (requestWithRaw.rawBody || Buffer.from(JSON.stringify(req.body || {}))).toString("utf-8");

    const transmissionId = req.headers["paypal-transmission-id"] as string | undefined;
    const transmissionTime = req.headers["paypal-transmission-time"] as string | undefined;
    const certUrl = req.headers["paypal-cert-url"] as string | undefined;
    const authAlgo = req.headers["paypal-auth-algo"] as string | undefined;
    const transmissionSig = req.headers["paypal-transmission-sig"] as string | undefined;

    // SECURITY: reject anything missing a full signature header set outright,
    // exactly like the Stripe webhook above does for a missing Stripe-Signature -
    // no signature, no processing, regardless of payload contents.
    if (!transmissionId || !transmissionTime || !certUrl || !authAlgo || !transmissionSig) {
      return res.status(401).json({ error: "Missing required PayPal webhook signature headers." });
    }

    // REPLAY-ATTACK PROTECTION: reject stale transmissions before even calling PayPal's
    // verification API, regardless of whether the signature itself would still validate.
    if (!isPayPalTransmissionTimeFresh(transmissionTime)) {
      return res.status(401).json({ error: "PayPal webhook transmission is too old to accept (possible replay)." });
    }

    let signatureValid = false;
    try {
      signatureValid = await verifyPayPalWebhookSignature(
        { transmissionId, transmissionTime, certUrl, authAlgo, transmissionSig },
        rawBody
      );
    } catch (err: any) {
      logger.error({ event: "paypal_webhook_verify_failed", err: err.message }, "PayPal webhook signature verification call failed.");
      return res.status(401).json({ error: "Could not verify PayPal webhook signature." });
    }

    if (!signatureValid) {
      return res.status(401).json({ error: "PayPal webhook signature verification failed." });
    }

    const event = JSON.parse(rawBody) as { id: string; event_type: string; resource: any };
    const resource = event.resource || {};
    const paypalSubscriptionId = resource.id && event.event_type?.startsWith("BILLING.SUBSCRIPTION") ? resource.id : resource.billing_agreement_id;
    const workspaceId = resource.custom_id
      || (paypalSubscriptionId ? await db.getWorkspaceIdByPayPalSubscriptionId(paypalSubscriptionId) : null)
      || undefined;

    // IDEMPOTENCY: PayPal retries webhook delivery on anything but a 2xx response, and a
    // malicious actor could attempt to replay a previously-valid, previously-signed
    // payload. The UNIQUE constraint on paypal_event_id (see schema.sql) is the actual
    // enforcement; this call gives an early, clear answer either way.
    const { alreadyProcessed } = await db.recordPayPalWebhookEvent({
      paypalEventId: event.id,
      eventType: event.event_type,
      resourceId: resource.id,
      workspaceId,
      payload: event,
      signatureVerified: true,
    });

    if (alreadyProcessed) {
      return res.json({ received: true, duplicate: true });
    }

    try {
      if (event.event_type === "BILLING.SUBSCRIPTION.ACTIVATED" && workspaceId) {
        const existing = await db.getWorkspaceSubscription(workspaceId);
        const plan = existing?.plan || "starter";
        const interval = existing?.billingInterval || "monthly";
        await activatePlan(workspaceId, plan, interval, {
          status: "active",
          paymentProvider: "paypal",
          paypalMode: getPayPalMode(),
          paypalSubscriptionId: resource.id,
          paypalPlanId: resource.plan_id || undefined,
          paypalPayerId: resource.subscriber?.payer_id || undefined,
          reason: `PayPal subscription ${resource.id} activated.`,
          recordPayment: plan !== "free",
          paypalOrderId: resource.id,
        });
      }

      if (event.event_type === "BILLING.SUBSCRIPTION.CANCELLED" && workspaceId) {
        await db.cancelWorkspaceSubscription(workspaceId, true);
      }

      if (event.event_type === "BILLING.SUBSCRIPTION.SUSPENDED" && workspaceId) {
        await db.updateWorkspaceSubscription(workspaceId, { status: "past_due" });
      }

      if (event.event_type === "PAYMENT.SALE.COMPLETED" && workspaceId) {
        const subscription = await db.getWorkspaceSubscription(workspaceId);
        if (subscription) {
          await recordBillingSuccess(
            workspaceId,
            subscription.plan,
            subscription.billingInterval,
            "paypal",
            undefined,
            undefined,
            resource.id,
            resource.id
          );
        }
      }

      return res.json({ received: true, eventType: event.event_type, workspaceId });
    } catch (err: any) {
      return res.status(500).json({ error: err.message || "Failed to process PayPal webhook." });
    }
  });

  // 2. Fetch normalized products (Tenant Isolated)
  app.get("/api/products", async (req, res) => {
    const workspaceId = (req.query.workspaceId as string) || (req as any).workspaceId;
    const products = await db.getProducts(workspaceId);
    res.json(products);
  });

  // 3. Fetch import operations (Tenant Isolated)
  app.get("/api/operations", async (req, res) => {
    const workspaceId = (req.query.workspaceId as string) || (req as any).workspaceId;
    const ops = await db.getImportOperations(workspaceId);
    res.json(ops);
  });

  // 4. Fetch audit logs (Tenant Isolated)
  app.get("/api/audit-logs", async (req, res) => {
    const workspaceId = (req.query.workspaceId as string) || (req as any).workspaceId;
    const logs = await db.getAuditLogs(workspaceId);
    res.json(logs);
  });

  // 4b. Delete product
  app.delete("/api/products/:productId", async (req, res) => {
    const { productId } = req.params;
    const workspaceId = (req.query.workspaceId as string) || (req as any).workspaceId;
    const success = await db.deleteProduct(workspaceId, productId);
    if (success) {
      res.json({ success: true, message: `Successfully deleted product ${productId}.` });
    } else {
      res.status(404).json({ error: "Failed to delete product or product not found." });
    }
  });

  // 5. Trigger multi-provider import with transaction-safe credit check
  app.post("/api/import", async (req, res) => {
    const { url, workspaceId, customPrompt, rawHtml } = req.body;

    if (!url) {
      return res.status(400).json({ error: "Source URL is required." });
    }

    // 1. Credit Check: Guard against negative balances
    const hasSufficientCredits = await db.checkCreditBalance(workspaceId, 20, "ai");
    if (!hasSufficientCredits) {
      await db.logAudit(workspaceId, "IMPORT_BLOCKED", `Blocked import from ${url} due to low credits (< 20).`);
      return await sendInsufficientCredits(res, workspaceId, "ai", 20);
    }

    // 2. Resolve Extractor via factory
    const extractor = ExtractorFactory.getExtractor(url);
    const providerName = extractor.providerName;

    // 3. Log Pending Transaction Operation
    const op = await db.createImportOperation(workspaceId, providerName, url);

    const queueJob = await enqueueQueueJob(workspaceId, "product_import", op.id, {
      workspaceId,
      url,
      customPrompt,
      rawHtml,
      operationId: op.id,
      extractor: providerName, // store extractor name in payload for logging
    }, {
      workerName: "import-worker",
      priority: 10,
      maxAttempts: 4,
      backoffMs: 2000,
    });

    return res.status(202).json({
      status: "queued",
      operation: op,
      queueJob,
      message: `Queued ${providerName} import for background processing.`,
    });
  });

  // 5b. Get import operation status
  app.get("/api/import/status/:operationId", async (req, res) => {
    const workspaceId = (req.query.workspaceId as string) || (req as any).workspaceId;
    const operationId = req.params.operationId;
    const ops = await db.getImportOperations(workspaceId);
    const op = ops.find((o) => o.id === operationId);
    if (!op) {
      return res.status(404).json({ error: "Operation not found." });
    }
    // Get product if exists
    let product = null;
    if (op.productId) {
      const products = await db.getProducts(workspaceId);
      product = products.find((p) => p.id === op.productId) || null;
    }
    // Get attempt count from queue logs
    const logs = await db.getQueueJobLogs(workspaceId);
    const jobLogs = logs.filter((log) => log.message.includes(operationId));
    const attemptCount = jobLogs.filter((log) => log.status === "processing" || log.status === "retrying" || log.status === "failed").length + 1;
    // Get extractor name from the operation (provider) or from queue job payload
    let extractor = op.provider || "Unknown";
    // try to get from queue job payload if not in operation
    if (!extractor || extractor === "Unknown") {
      const jobs = await db.getQueueJobs(workspaceId, { includeCompleted: true });
      const job = jobs.find((j) => j.referenceId === operationId);
      if (job && job.payload && typeof job.payload === "object" && "extractor" in job.payload) {
        extractor = String(job.payload.extractor);
      }
    }

    return res.json({
      id: op.id,
      status: op.status,
      provider: op.provider,
      sourceUrl: op.sourceUrl,
      errorMessage: op.errorMessage || null,
      product,
      creditCharged: op.creditCharged,
      createdAt: op.createdAt,
      attemptCount,
      extractor,
      telemetry: op.telemetry || null,
    });
  });

  // --- Product Intelligence Endpoints (Phase 2) ---

  // 5a. Retrieve latest product analysis and version history
  app.get("/api/intelligence/analysis", async (req, res) => {
    const productId = req.query.productId as string;
    if (!productId) {
      return res.status(400).json({ error: "productId parameter is required" });
    }
    const latest = await db.getLatestProductAnalysis(productId);
    const history = await db.getProductAnalyses(productId);
    return res.json({ latest, history });
  });

  // 5b. Trigger full product marketing & market intelligence analysis (costs exactly 20 credits)
  app.post("/api/intelligence/analyze", aiGenerationRateLimiter, async (req, res) => {
    const { productId, languageCode = "en", workspaceId } = req.body;
    if (!productId) {
      return res.status(400).json({ error: "productId is required" });
    }

    try {
      if (!await db.checkCreditBalance(workspaceId, 20, "ai")) {
        await db.logAudit(workspaceId, "ANALYSIS_BLOCKED", `Blocked analysis for ${productId} due to low AI credits.`);
        return await sendInsufficientCredits(res, workspaceId, "ai", 20);
      }
      // Find the specific product catalog item (multi-tenant boundary verified)
      const products = await db.getProducts(workspaceId);
      const product = products.find((p) => p.id === productId);
      if (!product) {
        return res.status(404).json({ error: "Product not found or access denied." });
      }

      logger.info(`[Intelligence API] Launching product analysis for item \"${product.title}\" [Lang: ${languageCode}]`);
      const analysis = await ProductAnalyzer.analyze(product, languageCode, workspaceId);
      
      // Update the analysis latency in the corresponding import operation
      await db.updateImportOperationAnalysisTime(workspaceId, productId, analysis.latencyMilliseconds);

      return res.json({ success: true, analysis });
    } catch (err: any) {
      logger.error({ err }, "[Intelligence API] Analysis process failed:");
      return res.status(500).json({ error: err.message || "Failed to analyze product catalog details." });
    }
  });

  // 5c. Fetch complete credit tracking ledger audit rows
  app.get("/api/intelligence/ledger", async (req, res) => {
    const workspaceId = (req.query.workspaceId as string) || (req as any).workspaceId;
    const entries = await db.getCreditLedger(workspaceId);
    return res.json(entries);
  });

  // 5d. Fetch workspace analytics payload for the advanced analytics center
  app.get("/api/intelligence/analytics", async (req, res) => {
    const workspaceId = (req.query.workspaceId as string) || (req as any).workspaceId;
    const selectedProductId = req.query.productId as string | undefined;
    const preset = (req.query.preset as "today" | "7d" | "30d" | "90d" | "custom") || "30d";
    const startDate = req.query.startDate as string | undefined;
    const endDate = req.query.endDate as string | undefined;

    try {
      const payload = buildAdvancedAnalyticsPayload({
        workspaceId,
        selectedProductId,
        preset,
        startDate,
        endDate,
        products: await db.getProducts(workspaceId),
        operations: await db.getImportOperations(workspaceId),
        analyses: await db.getWorkspaceProductAnalyses(workspaceId),
        contentGenerations: await db.getWorkspaceContentGenerations(workspaceId),
        ledger: await db.getCreditLedger(workspaceId),
      });
      return res.json(payload);
    } catch (err: any) {
      logger.error({ err }, "[Analytics API] Failed to build advanced analytics payload:");
      return res.status(500).json({
        error: err.message || "Failed to build advanced analytics payload.",
      });
    }
  });

  // --- Content Generation Engine Endpoints (Phase 3) ---

  // Generate marketing assets automatically
  app.post("/api/content/generate", aiGenerationRateLimiter, async (req, res) => {
    const { productId, workspaceId, contentType = "package", languageCode = "en" } = req.body;

    if (!productId) {
      return res.status(400).json({ error: "productId is required." });
    }

    if (!["hooks", "scripts", "package"].includes(contentType)) {
      return res.status(400).json({ error: "Invalid contentType. Allowed: hooks, scripts, package." });
    }

    // Determine credit cost
    const costMap: Record<string, number> = {
      hooks: 5,
      scripts: 10,
      package: 20
    };
    const creditsRequired = costMap[contentType] || 20;

    // 1. Check if workspace has enough credits
    const hasCredits = await db.checkCreditBalance(workspaceId, creditsRequired, "ai");
    if (!hasCredits) {
      await db.logAudit(workspaceId, "CONTENT_GEN_BLOCKED", `Blocked ${contentType} generation for product ${productId} due to low credits (< ${creditsRequired}).`);
      return await sendInsufficientCredits(res, workspaceId, "ai", creditsRequired);
    }

    const products = await db.getProducts(workspaceId);
    const product = products.find((p) => p.id === productId);
    if (!product) {
      return res.status(404).json({ error: "Product not found or access denied." });
    }

    const queueJob = await enqueueQueueJob(workspaceId, "ai_content_generation", productId, {
      workspaceId,
      productId,
      contentType,
      languageCode,
      creditsRequired,
    }, {
      workerName: "content-worker",
      priority: 7,
      maxAttempts: 3,
      backoffMs: 2500,
    });

    return res.status(202).json({
      success: true,
      queued: true,
      queueJob,
      message: `Queued ${contentType} generation for ${product.title}.`,
    });
  });

  // Fetch the latest generated marketing contents or packages for a specific product
  app.get("/api/content/:productId", async (req, res) => {
    const { productId } = req.params;
    const contentType = req.query.contentType as string | undefined;

    if (!productId) {
      return res.status(400).json({ error: "productId parameter is required." });
    }

    const latest = await db.getLatestContentGeneration(productId, contentType);
    return res.json({ latest });
  });

  // Fetch the historical list of all edits/generations for a product
  app.get("/api/content/history/:productId", async (req, res) => {
    const { productId } = req.params;

    if (!productId) {
      return res.status(400).json({ error: "productId parameter is required." });
    }

    const history = await db.getContentGenerations(productId);
    return res.json({ history });
  });

  // --- Social Publishing Center Endpoints (Phase 4) ---

  app.get("/api/auth/meta/url", async (req, res) => {
    const workspaceId = (req.query.workspaceId as string) || (req as any).workspaceId;
    const origin = (req.query.origin as string) || process.env.APP_URL || `{{http://${req.headers.host}}}`;
    
    const appId = process.env.META_APP_ID;
    if (!appId) {
      return res.status(400).json({ error: "META_APP_ID environment variable is not configured on the server." });
    }

    const state = crypto.randomBytes(16).toString("hex");
    const redirectUri = `${origin}/api/auth/meta/callback`;
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000).toISOString(); // 10 minutes

    await db.saveOAuthState(workspaceId, "meta", state, redirectUri, expiresAt);

    const configId = process.env.FB_LOGIN_CONFIG_ID || "";
    const authUrl = `{{https://www.facebook.com/v19.0/dialog/oauth?client_id=${appId}}}&redirect_uri=${encodeURIComponent(redirectUri)}&config_id=${configId}&state=${state}&response_type=code`;

    logger.info("Meta OAuth URL generated");

    return res.json({ url: authUrl });
  });

  app.get("/api/auth/meta/callback", async (req, res) => {
    const fullUrl = `${req.protocol}://${req.get("host")}${req.originalUrl}`;
    const queryParams = req.query;
    const { code, state, error, error_reason, error_description } = req.query;

    logger.info("Meta OAuth callback received");

    // Validate OAuth state parameter to prevent CSRF
    let stateRecord: { workspaceId: string; platform: string; redirectUri: string } | null = null;
    if (state) {
      stateRecord = await db.getOAuthState(state as string);
      if (!stateRecord) {
        logger.warn({ state }, "Invalid OAuth state parameter");
        return res.status(400).send(`<html><body><h1>Invalid OAuth state. Please try again.</h1></body></html>`);
      }
      // Delete the state after successful validation (single use)
      await db.deleteOAuthState(state as string);
    }

    if (error || !code) {
      const errMsg = (error_description as string) || (error as string) || "User cancelled authorization or code is missing.";
      return res.send(`
        <html>
          <body style=\"font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #0a0b0d; color: #f3f4f6; padding: 40px; margin: 0; box-sizing: border-box; min-height: 100vh; display: flex; flex-direction: column; align-items: center; justify-content: center;\">
            <div style=\"background-color: #111318; border: 1px solid #dc2626; border-radius: 12px; padding: 32px; max-width: 800px; width: 100%; box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.5);\">
              <div style=\"text-align: center; margin-bottom: 24px;\">
                <div style=\"color: #ef4444; font-size: 48px; margin-bottom: 12px;\">⚠️</div>
                <h1 style=\"font-size: 24px; font-weight: 700; margin: 0 0 8px 0; color: #f3f4f6;\">Meta OAuth Callback Debug Mode</h1>
                <p style=\"font-size: 14px; color: #ef4444; font-weight: 600; margin: 0;\">Error: ${errMsg}</p>
              </div>

              <div style=\"margin-top: 32px;\">
                <h2 style=\"font-size: 16px; font-weight: 600; color: #9ca3af; border-bottom: 1px solid #1f2937; padding-bottom: 8px; margin: 0 0 16px 0;\">1. Full Callback URL Received</h2>
                <div style=\"background-color: #07080a; padding: 12px; border-radius: 6px; font-family: monospace; font-size: 12px; color: #10b981; overflow-x: auto; white-space: pre-wrap; word-break: break-all; border: 1px solid #1f2937;\">${fullUrl}</div>
              </div>

              <div style=\"margin-top: 24px;\">
                <h2 style=\"font-size: 16px; font-weight: 600; color: #9ca3af; border-bottom: 1px solid #1f2937; padding-bottom: 8px; margin: 0 0 16px 0;\">2. Key Parameter Values</h2>
                <table style=\"width: 100%; border-collapse: collapse; font-family: monospace; font-size: 13px; text-align: left;\">
                  <thead>
                    <tr style=\"border-bottom: 1px solid #1f2937; color: #6b7280;\">
                      <th style=\"padding: 8px 0;\">Parameter Name</th>
                      <th style=\"padding: 8px 0;\">Value</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr style=\"border-bottom: 1px solid #111318;\">
                      <td style=\"padding: 8px 0; color: #9ca3af; width: 180px;\">code</td>
                      <td style=\"padding: 8px 0; color: #f87171; font-weight: bold;\">REDACTED</td>
                    </tr>
                    <tr style=\"border-bottom: 1px solid #111318;\">
                      <td style=\"padding: 8px 0; color: #9ca3af;\">error</td>
                      <td style=\"padding: 8px 0; color: #f87171;\">${error || 'NULL (None)'}</td>
                    </tr>
                    <tr style=\"border-bottom: 1px solid #111318;\">
                      <td style=\"padding: 8px 0; color: #9ca3af;\">error_reason</td>
                      <td style=\"padding: 8px 0; color: #f87171;\">${error_reason || 'NULL (None)'}</td>
                    </tr>
                    <tr style=\"border-bottom: 1px solid #111318;\">
                      <td style=\"padding: 8px 0; color: #9ca3af;\">error_description</td>
                      <td style=\"padding: 8px 0; color: #f87171;\">${error_description || 'NULL (None)'}</td>
                    </tr>
                    <tr style=\"border-bottom: 1px solid #111318;\">
                      <td style=\"padding: 8px 0; color: #9ca3af;\">state</td>
                      <td style=\"padding: 8px 0; color: #60a5fa;\">${state || 'NULL (None)'}</td>
                    </tr>
                  </tbody>
                </table>
              </div>

              <div style=\"margin-top: 24px;\">
                <h2 style=\"font-size: 16px; font-weight: 600; color: #9ca3af; border-bottom: 1px solid #1f2937; padding-bottom: 8px; margin: 0 0 16px 0;\">3. Exact Meta Response (All Query Parameters)</h2>
                <pre style=\"background-color: #07080a; padding: 16px; border-radius: 6px; font-family: monospace; font-size: 12px; color: #f3f4f6; overflow-x: auto; margin: 0; border: 1px solid #1f2937;\">${JSON.stringify(queryParams, null, 2)}</pre>
              </div>

              <div style=\"margin-top: 32px; display: flex; gap: 12px; justify-content: center;\">
                <button onclick=\"window.close()\" style=\"background-color: #ef4444; hover:background-color: #dc2626; color: white; border: none; border-radius: 8px; padding: 12px 24px; font-size: 14px; font-weight: 600; cursor: pointer; transition: background-color 0.2s;\">Close Window</button>
                <button onclick=\"window.location.reload()\" style=\"background-color: #374151; color: white; border: none; border-radius: 8px; padding: 12px 24px; font-size: 14px; font-weight: 600; cursor: pointer; transition: background-color 0.2s;\">Retry Refresh</button>
              </div>
              <script>
                if (window.opener) {
                  window.opener.postMessage({ type: 'OAUTH_AUTH_ERROR', error: ${JSON.stringify(errMsg)} }, '*');
                }
              </script>
            </div>
          </body>
        </html>
      `);
    }

    const workspaceId = stateRecord?.workspaceId;
    const redirectUri = stateRecord?.redirectUri;

    try {
      const appId = process.env.META_APP_ID;
      const appSecret = process.env.META_APP_SECRET;

      if (!appId || !appSecret) {
        throw new Error("Meta Application Credentials (META_APP_ID or META_APP_SECRET) are not configured on the server.");
      }

      // Step 6a: Exchange authorization code for User Access Token
      const tokenUrl = `{{https://graph.facebook.com/v19.0/oauth/access_token?client_id=${appId}}}&client_secret=${appSecret}&redirect_uri=${encodeURIComponent(redirectUri)}&code=${code}`;
      const tokenResponse = await fetch(tokenUrl);
      if (!tokenResponse.ok) {
        const errText = await tokenResponse.text();
        throw new Error(`Failed to exchange authorization code: ${errText}`);
      }

      const tokenData = await tokenResponse.json() as { access_token: string; expires_in?: number };
      const userAccessToken = tokenData.access_token;

      // Clean up previous platform connections to ensure production-level hygiene
      await db.clearPlatformSocialAccounts(workspaceId, "facebook");
      await db.clearPlatformSocialAccounts(workspaceId, "instagram");

      // Step 6b: Retrieve Facebook Pages linked to the account
      const pagesUrl = `{{https://graph.facebook.com/v19.0/me/accounts?access_token=${userAccessToken}}}`;
      const pag