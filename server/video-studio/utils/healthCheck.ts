import type { Request, Response } from 'express';
import { getVideoStudioPool } from '../db/index.js';
import { metrics } from '../monitoring/metrics.js';
import { allBreakerMetrics } from './circuitBreaker.js';
import { providerHealthCache, costEstimateCache, templateCache } from '../cache/optimizedCache.js';
import { providerRegistry } from '../providers/video/ProviderRegistry.js';

const startedAt = Date.now();

/**
 * Health check handlers:
 *   GET /health            → liveness (fast, no dependencies)
 *   GET /health/ready      → readiness (DB + provider config)
 *   GET /health/diagnostics→ full diagnostics (memory, breakers, caches)
 *   GET /metrics           → Prometheus metrics
 */

export function livenessHandler(_req: Request, res: Response): void {
  res.json({
    status: 'ok',
    uptime: Math.floor((Date.now() - startedAt) / 1000),
    timestamp: new Date().toISOString(),
  });
}

export async function readinessHandler(_req: Request, res: Response): Promise<void> {
  const checks: Record<string, { ok: boolean; latencyMs?: number; detail?: string }> = {};

  const dbStart = Date.now();
  try {
    const client = await getVideoStudioPool().connect();
    try {
      await client.query('SELECT 1');
      checks.database = { ok: true, latencyMs: Date.now() - dbStart };
    } finally {
      client.release();
    }
  } catch (error) {
    checks.database = {
      ok: false,
      latencyMs: Date.now() - dbStart,
      detail: error instanceof Error ? error.message : 'connection failed',
    };
  }

  const providers = providerRegistry.getNames();
  checks.providers = {
    ok: providers.length > 0,
    detail: `${providers.length} registered: ${providers.join(', ')}`,
  };

  const hasAnyKey =
    !!process.env.HF_TOKEN ||
    !!process.env.RUNWAY_API_KEY ||
    !!process.env.KLING_API_KEY ||
    !!process.env.GOOGLE_AI_API_KEY ||
    !!process.env.PIKA_API_KEY ||
    !!process.env.LUMA_API_KEY;
  checks.providerKeys = {
    ok: hasAnyKey,
    detail: hasAnyKey ? 'at least one provider key present' : 'no provider keys configured',
  };

  const allOk = Object.values(checks).every((c) => c.ok);
  res.status(allOk ? 200 : 503).json({
    status: allOk ? 'ready' : 'degraded',
    uptime: Math.floor((Date.now() - startedAt) / 1000),
    timestamp: new Date().toISOString(),
    checks,
  });
}

export async function diagnosticsHandler(_req: Request, res: Response): Promise<void> {
  const mem = process.memoryUsage();

  res.json({
    status: 'ok',
    uptime: Math.floor((Date.now() - startedAt) / 1000),
    timestamp: new Date().toISOString(),
    node: { version: process.version, pid: process.pid, platform: process.platform },
    memory: {
      rssMb: +(mem.rss / 1024 / 1024).toFixed(1),
      heapUsedMb: +(mem.heapUsed / 1024 / 1024).toFixed(1),
      heapTotalMb: +(mem.heapTotal / 1024 / 1024).toFixed(1),
      externalMb: +(mem.external / 1024 / 1024).toFixed(1),
    },
    circuitBreakers: allBreakerMetrics(),
    caches: {
      providerHealth: providerHealthCache.stats(),
      costEstimate: costEstimateCache.stats(),
      template: templateCache.stats(),
    },
    metrics: metrics.snapshot(),
  });
}

export function metricsHandler(_req: Request, res: Response): void {
  res.setHeader('Content-Type', 'text/plain; version=0.0.4; charset=utf-8');
  res.send(metrics.serialize());
}