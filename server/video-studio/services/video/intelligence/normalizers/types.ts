import type { ProductSource, UnifiedProduct } from '../../../../types/video.js';

/**
 * Contract every platform importer implements. A normalizer turns a
 * raw platform payload into the source-agnostic UnifiedProduct shape.
 */
export interface ProductNormalizer {
  readonly source: ProductSource;
  canNormalize(raw: Record<string, unknown>): boolean;
  normalize(raw: Record<string, unknown>): UnifiedProduct;
}

export function cleanString(value: unknown): string | undefined {
  if (typeof value !== 'string') return undefined;
  const trimmed = value.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
  return trimmed.length > 0 ? trimmed : undefined;
}

export function toNumber(value: unknown): number | undefined {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value === 'string') {
    const n = parseFloat(value.replace(/[^0-9.-]/g, ''));
    return Number.isFinite(n) ? n : undefined;
  }
  return undefined;
}

export function toStringArray(value: unknown): string[] {
  if (Array.isArray(value)) return value.map((v) => String(v)).filter(Boolean);
  if (typeof value === 'string') {
    return value
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);
  }
  return [];
}