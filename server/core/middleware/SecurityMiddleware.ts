import helmet from "helmet";
import cors from "cors";
import rateLimit, { ipKeyGenerator } from "express-rate-limit";
import type { RequestHandler } from "express";

/**
 * PHASE 1 SECURITY HARDENING
 *
 * This app is a pure Bearer-token JSON API (no cookie-based sessions were found
 * anywhere in the codebase), so CSRF in the classic sense does not apply here -
 * browsers do not automatically attach `Authorization` headers cross-site the
 * way they do cookies. The relevant browser-facing risks are XSS (mitigated via
 * CSP/secure headers below) and origin restriction (mitigated via CORS below).
 */

export function buildHelmetMiddleware(): RequestHandler {
  // In development, Vite's @vitejs/plugin-react injects an inline <script> containing the
  // React Refresh runtime preamble. CSP script-src 'self' blocks all inline scripts, causing
  // the "can't detect preamble" error. Production builds emit only non-inline <script src="...">
  // bundles, so CSP remains fully enforced there.
  if (process.env.NODE_ENV !== "production") {
    return (_req, _res, next) => next();
  }

  return helmet({
    contentSecurityPolicy: {
      useDefaults: true,
      directives: {
        "default-src": ["'self'"],
        "img-src": ["'self'", "data:", "https:"],
        "connect-src": ["'self'", "https:"],
        "script-src": ["'self'"],
        "style-src": ["'self'", "'unsafe-inline'"],
        "object-src": ["'none'"],
        "frame-ancestors": ["'none'"],
      },
    },
    crossOriginEmbedderPolicy: false,
  });
}

export function buildCorsMiddleware(): RequestHandler {
  const allowedOrigins = (process.env.ALLOWED_ORIGINS || "")
    .split(",")
    .map((o) => o.trim())
    .filter(Boolean);

  return (req, res, next) => {
    // Only apply CORS restrictions to API and Webhook paths.
    // Static assets, HTML, and other page resources do not require CORS validation.
    if (!req.path.startsWith("/api") && !req.path.startsWith("/shopify")) {
      return next();
    }

    const origin = req.header("Origin");
    const host = req.header("Host") || req.get("host") || "";

    // 1. Allow same-origin/non-browser requests (no Origin header, e.g. server-to-server, curl).
    if (!origin) {
      return cors({ credentials: true })(req, res, next);
    }

    // 2. Explicitly allow same-origin requests even when ALLOWED_ORIGINS is empty.
    // Account for proxies (like Cloud Run) which might rewrite the Host header while
    // preserving the public domain in X-Forwarded-Host.
    let isSameOrigin = false;
    try {
      const originUrl = new URL(origin);
      const originHost = originUrl.host.toLowerCase();
      const originHostname = originUrl.hostname.toLowerCase();

      const reqHost = (req.header("Host") || req.get("host") || "").toLowerCase();
      const forwardedHost = (req.get("x-forwarded-host") || "").toLowerCase();

      if (
        originHost === reqHost ||
        originHost === forwardedHost ||
        originHostname === reqHost.split(":")[0] ||
        originHostname === forwardedHost.split(":")[0] ||
        originHostname === "localhost" ||
        originHostname === "127.0.0.1"
      ) {
        isSameOrigin = true;
      }
    } catch (e) {
      // Ignore URL parsing errors
    }

    if (isSameOrigin) {
      return cors({
        origin: origin,
        credentials: true,
        methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
        allowedHeaders: ["Content-Type", "Authorization"],
      })(req, res, next);
    }

    // 3. No allowlist configured: default to same-origin-only behavior by rejecting
    // cross-origin browser requests rather than silently allowing "*".
    if (allowedOrigins.length === 0) {
      const err = new Error("CORS: ALLOWED_ORIGINS is not configured; cross-origin requests are rejected by default.");
      return next(err);
    }

    // 4. Check if the origin matches the allowed list
    if (allowedOrigins.includes(origin)) {
      return cors({
        origin: origin,
        credentials: true,
        methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
        allowedHeaders: ["Content-Type", "Authorization"],
      })(req, res, next);
    }

    // 5. Reject otherwise
    const err = new Error(`CORS: origin '${origin}' is not in the ALLOWED_ORIGINS allowlist.`);
    return next(err);
  };
}

/** Strict limiter for authentication endpoints (brute-force / credential-stuffing protection). */
export const authRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  limit: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Too many authentication attempts. Please try again in 15 minutes." },
});

/** General API limiter, generous enough for normal SaaS usage patterns. */
export const apiRateLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  limit: 300,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Too many requests. Please slow down." },
});

/** Tighter limiter for expensive AI-generation endpoints, to bound cost exposure per caller. */
export const aiGenerationRateLimiter = rateLimit({
  windowMs: 60 * 1000,
  limit: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Too many generation requests. Please slow down." },
  keyGenerator: (req: any) => req.user?.userId || ipKeyGenerator(req.ip),
});

/** Webhook-specific limiter (Shopify/Stripe can legitimately burst, so this is generous). */
export const webhookRateLimiter = rateLimit({
  windowMs: 60 * 1000,
  limit: 120,
  standardHeaders: true,
  legacyHeaders: false,
});
