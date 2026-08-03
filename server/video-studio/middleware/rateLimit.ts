import type { Request, Response, NextFunction } from 'express';

interface WindowEntry {
  count: number;
  resetAt: number;
}

export interface RateLimitOptions {
  max: number;
  windowMs: number;
  bucket?: string;
}

const store = new Map<string, WindowEntry>();

let sweepTimer: NodeJS.Timeout | null = null;
function ensureSweeper(): void {
  if (sweepTimer) return;
  sweepTimer = setInterval(() => {
    const now = Date.now();
    for (const [key, entry] of store) {
      if (now > entry.resetAt) store.delete(key);
    }
  }, 60_000);
  sweepTimer.unref?.();
}

function clientKey(req: Request): string {
  const forwarded = req.headers['x-forwarded-for'];
  const ip = typeof forwarded === 'string' ? forwarded.split(',')[0].trim() : req.ip || 'unknown';
  return ip;
}

/**
 * Sliding-window rate limiter (in-memory). For multi-instance deploys,
 * swap the store for Redis while keeping this exact interface.
 */
export function rateLimit(options: RateLimitOptions) {
  ensureSweeper();

  return (req: Request, res: Response, next: NextFunction): void => {
    if (process.env.RATE_LIMIT_ENABLED === 'false') {
      next();
      return;
    }

    const bucket = options.bucket || req.baseUrl || req.path;
    const key = `${clientKey(req)}:${bucket}`;
    const now = Date.now();

    let entry = store.get(key);
    if (!entry || now > entry.resetAt) {
      entry = { count: 0, resetAt: now + options.windowMs };
      store.set(key, entry);
    }

    entry.count++;

    res.setHeader('X-RateLimit-Limit', String(options.max));
    res.setHeader('X-RateLimit-Remaining', String(Math.max(0, options.max - entry.count)));
    res.setHeader('X-RateLimit-Reset', String(Math.ceil(entry.resetAt / 1000)));

    if (entry.count > options.max) {
      const retryAfter = Math.ceil((entry.resetAt - now) / 1000);
      res.setHeader('Retry-After', String(retryAfter));
      res.status(429).json({ success: false, error: 'Too many requests', code: 'RATE_LIMITED', retryAfter });
      return;
    }

    next();
  };
}

/** Presets tuned per route family. */
export const limits = {
  standard: rateLimit({ max: 300, windowMs: 60_000, bucket: 'standard' }),
  generate: rateLimit({ max: 20, windowMs: 60_000, bucket: 'generate' }),
  sensitive: rateLimit({ max: 30, windowMs: 60_000, bucket: 'sensitive' }),
  health: rateLimit({ max: 600, windowMs: 60_000, bucket: 'health' }),
};

/** Test helper — reset all windows. */
export function resetRateLimits(): void {
  store.clear();
}