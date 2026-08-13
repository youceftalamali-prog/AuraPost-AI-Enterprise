import helmet from "helmet";
import cors from "cors";
import rateLimit, { ipKeyGenerator } from "express-rate-limit";
import type { RequestHandler } from "express";
import { runtimeConfig } from "../config/environment.ts";

export function buildHelmetMiddleware(): RequestHandler {
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
    .map((origin) => origin.trim())
    .filter(Boolean);

  return (req, res, next) => {
    if (!req.path.startsWith("/api") && !req.path.startsWith("/shopify")) {
      return next();
    }

    const origin = req.header("Origin");
    if (!origin) {
      return cors({ credentials: true })(req, res, next);
    }

    let isSameOrigin = false;
    try {
      const originUrl = new URL(origin);
      const originHost = originUrl.host.toLowerCase();
      const originHostname = originUrl.hostname.toLowerCase();
      const requestHost = (req.header("Host") || req.get("host") || "").toLowerCase();
      const forwardedHost = (req.get("x-forwarded-host") || "").toLowerCase();

      if (
        originHost === requestHost ||
        originHost === forwardedHost ||
        originHostname === requestHost.split(":")[0] ||
        originHostname === forwardedHost.split(":")[0] ||
        (process.env.NODE_ENV !== "production" &&
          (originHostname === "localhost" || originHostname === "127.0.0.1"))
      ) {
        isSameOrigin = true;
      }
    } catch {
      // Invalid origins are rejected below.
    }

    if (isSameOrigin || allowedOrigins.includes(origin)) {
      return cors({
        origin,
        credentials: true,
        methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
        allowedHeaders: ["Content-Type", "Authorization", "X-Request-Id"],
      })(req, res, next);
    }

    if (allowedOrigins.length === 0) {
      return next(new Error("CORS: ALLOWED_ORIGINS is not configured; cross-origin requests are rejected."));
    }

    return next(new Error(`CORS: origin '${origin}' is not in the ALLOWED_ORIGINS allowlist.`));
  };
}

function disabledFeatureForRequest(originalUrl: string): string | null {
  const pathname = originalUrl.split("?", 1)[0];

  if (!runtimeConfig.features.socialConnections && pathname.startsWith("/api/auth/meta")) {
    return "socialConnections";
  }
  if (!runtimeConfig.features.publishing && pathname.startsWith("/api/publishing")) {
    return "publishing";
  }
  if (!runtimeConfig.features.smartRepost && pathname.includes("smart-repost")) {
    return "smartRepost";
  }
  if (!runtimeConfig.features.paidAds && (pathname.startsWith("/api/ads") || pathname.includes("dark-post"))) {
    return "paidAds";
  }
  return null;
}

const generalApiRateLimiter = rateLimit({
  windowMs: 60 * 1000,
  limit: 300,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Too many requests. Please slow down." },
});

/**
 * V1 policy gate plus the general API limiter. It is already mounted at `/api`
 * by server.ts, so disabled capabilities cannot be reached even if a legacy UI
 * or an old client still displays them.
 */
export const apiRateLimiter: RequestHandler = (req, res, next) => {
  const originalUrl = req.originalUrl || req.url;

  if (req.method === "GET" && originalUrl.split("?", 1)[0] === "/api/features") {
    return res.json({
      releaseVersion: runtimeConfig.releaseVersion,
      features: runtimeConfig.features,
    });
  }

  const disabledFeature = disabledFeatureForRequest(originalUrl);
  if (disabledFeature) {
    return res.status(404).json({
      error: "Feature not available in this release.",
      code: "FEATURE_DISABLED",
      feature: disabledFeature,
      releaseVersion: runtimeConfig.releaseVersion,
    });
  }

  return generalApiRateLimiter(req, res, next);
};

export const authRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Too many authentication attempts. Please try again in 15 minutes." },
});

export const aiGenerationRateLimiter = rateLimit({
  windowMs: 60 * 1000,
  limit: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Too many generation requests. Please slow down." },
  keyGenerator: (req: any) => req.user?.userId || ipKeyGenerator(req.ip),
});

export const webhookRateLimiter = rateLimit({
  windowMs: 60 * 1000,
  limit: 120,
  standardHeaders: true,
  legacyHeaders: false,
});
