import type { Request, Response, NextFunction } from 'express';

type Labels = Record<string, string>;

function labelKey(labels?: Labels): string {
  if (!labels) return '';
  return Object.entries(labels)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([k, v]) => `${k}="${v}"`)
    .join(',');
}

/**
 * Lightweight metrics registry — counters, gauges and histograms with a
 * Prometheus-compatible text exposition and a JSON snapshot for the
 * diagnostics endpoint.
 */
class MetricsRegistry {
  private counters = new Map<string, number>();
  private gauges = new Map<string, number>();
  private histograms = new Map<string, number[]>();
  private readonly startTime = Date.now();

  inc(name: string, value = 1, labels?: Labels): void {
    const key = `${name}{${labelKey(labels)}}`;
    this.counters.set(key, (this.counters.get(key) ?? 0) + value);
  }

  gauge(name: string, value: number, labels?: Labels): void {
    const key = `${name}{${labelKey(labels)}}`;
    this.gauges.set(key, value);
  }

  observe(name: string, value: number, labels?: Labels): void {
    const key = `${name}{${labelKey(labels)}}`;
    const bucket = this.histograms.get(key) ?? [];
    bucket.push(value);
    if (bucket.length > 1000) bucket.shift();
    this.histograms.set(key, bucket);
  }

  /** Express middleware that times every request and records status. */
  middleware() {
    return (req: Request, res: Response, next: NextFunction): void => {
      const start = process.hrtime.bigint();

      res.on('finish', () => {
        const durationMs = Number(process.hrtime.bigint() - start) / 1e6;
        const route = req.route?.path ?? req.path;
        const labels = { method: req.method, route, status: String(res.statusCode) };

        this.inc('http_requests_total', 1, labels);
        this.observe('http_request_duration_ms', durationMs, { method: req.method, route });

        if (res.statusCode >= 500) {
          this.inc('http_errors_total', 1, labels);
        }
      });

      next();
    };
  }

  /** Prometheus text exposition format. */
  serialize(): string {
    const lines: string[] = [];

    lines.push('# HELP app_uptime_seconds Application uptime');
    lines.push('# TYPE app_uptime_seconds gauge');
    lines.push(`app_uptime_seconds ${((Date.now() - this.startTime) / 1000).toFixed(1)}`);

    for (const [key, value] of this.counters) {
      const { name, labels } = parseKey(key);
      lines.push(`# TYPE ${name} counter`);
      lines.push(`${name}${labels} ${value}`);
    }

    for (const [key, value] of this.gauges) {
      const { name, labels } = parseKey(key);
      lines.push(`# TYPE ${name} gauge`);
      lines.push(`${name}${labels} ${value}`);
    }

    for (const [key, values] of this.histograms) {
      const { name, labels } = parseKey(key);
      const sorted = [...values].sort((a, b) => a - b);
      const count = sorted.length;
      const sum = sorted.reduce((a, b) => a + b, 0);
      lines.push(`# TYPE ${name} summary`);
      lines.push(`${name}_count${labels} ${count}`);
      lines.push(`${name}_sum${labels} ${sum.toFixed(2)}`);
      if (count > 0) {
        const innerLabels = labels ? ',' + labels.slice(1, -1) : '';
        lines.push(`${name}{quantile="0.5"${innerLabels}} ${percentile(sorted, 0.5).toFixed(2)}`);
        lines.push(`${name}{quantile="0.95"${innerLabels}} ${percentile(sorted, 0.95).toFixed(2)}`);
        lines.push(`${name}{quantile="0.99"${innerLabels}} ${percentile(sorted, 0.99).toFixed(2)}`);
      }
    }

    return lines.join('\n') + '\n';
  }

  /** JSON snapshot for the health dashboard. */
  snapshot(): Record<string, unknown> {
    return {
      uptimeSeconds: (Date.now() - this.startTime) / 1000,
      counters: Object.fromEntries(this.counters),
      gauges: Object.fromEntries(this.gauges),
      histograms: Object.fromEntries(
        Array.from(this.histograms.entries()).map(([k, v]) => [
          k,
          { count: v.length, avg: v.length ? v.reduce((a, b) => a + b, 0) / v.length : 0 },
        ])
      ),
    };
  }

  reset(): void {
    this.counters.clear();
    this.gauges.clear();
    this.histograms.clear();
  }
}

function parseKey(key: string): { name: string; labels: string } {
  const match = /^(.+?)\{(.*)\}$/.exec(key);
  if (!match) return { name: key, labels: '' };
  const [, name, raw] = match;
  return { name, labels: raw ? `{${raw}}` : '' };
}

function percentile(sorted: number[], p: number): number {
  if (sorted.length === 0) return 0;
  const idx = Math.min(sorted.length - 1, Math.floor(p * sorted.length));
  return sorted[idx];
}

export const metrics = new MetricsRegistry();