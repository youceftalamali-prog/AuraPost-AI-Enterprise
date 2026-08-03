import type { ProductNormalizer } from './types.js';
import { cleanString, toNumber, toStringArray } from './types.js';
import type { UnifiedProduct } from '../../../../types/video.js';

/**
 * Fallback normalizer — accepts any loosely-shaped payload and also
 * handles explicitly manual entries. Always returns a valid product.
 */
export class ManualNormalizer implements ProductNormalizer {
  readonly source = 'Manual' as const;

  canNormalize(_raw: Record<string, unknown>): boolean {
    return true;
  }

  normalize(raw: Record<string, unknown>): UnifiedProduct {
    const p = (raw.product ?? raw) as Record<string, any>;

    const images: string[] = [];
    if (Array.isArray(p.images)) {
      for (const img of p.images) {
        const src = typeof img === 'string' ? img : img?.url ?? img?.src;
        if (src && !images.includes(src)) images.push(src);
      }
    }
    if (p.image) {
      const src = typeof p.image === 'string' ? p.image : p.image.url ?? p.image.src;
      if (src && !images.includes(src)) images.unshift(src);
    }
    if (p.imageUrl && !images.includes(String(p.imageUrl))) images.unshift(String(p.imageUrl));

    const videos: string[] = [];
    if (Array.isArray(p.videos)) {
      for (const v of p.videos) {
        const url = typeof v === 'string' ? v : v?.url ?? v?.src;
        if (url) videos.push(url);
      }
    }

    return {
      id: String(p.id ?? raw.id ?? `manual-${Date.now()}`),
      title: cleanString(p.title ?? p.name) ?? 'Untitled product',
      description: cleanString(p.description ?? p.body),
      price: toNumber(p.price),
      currency: p.currency ?? 'USD',
      images,
      videos,
      brand: cleanString(p.brand),
      category: cleanString(p.category),
      tags: toStringArray(p.tags),
      variants: Array.isArray(p.variants) ? p.variants : [],
      metadata: { source: 'Manual', ...(typeof p.metadata === 'object' ? p.metadata : {}) },
    };
  }
}