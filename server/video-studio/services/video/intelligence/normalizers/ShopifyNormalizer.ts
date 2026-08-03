import type { ProductNormalizer } from './types.js';
import { cleanString, toNumber, toStringArray } from './types.js';
import type { UnifiedProduct } from '../../../../types/video.js';

export class ShopifyNormalizer implements ProductNormalizer {
  readonly source = 'Shopify' as const;

  canNormalize(raw: Record<string, unknown>): boolean {
    const product = (raw.product ?? raw) as Record<string, unknown>;
    return Boolean(product && (product.title || product.id) && (product.images || product.image));
  }

  normalize(raw: Record<string, unknown>): UnifiedProduct {
    const p = (raw.product ?? raw) as Record<string, any>;

    const images: string[] = [];
    if (Array.isArray(p.images)) {
      for (const img of p.images) {
        const src = typeof img === 'string' ? img : img?.src ?? img?.url;
        if (src) images.push(src);
      }
    }
    if (p.image) {
      const src = typeof p.image === 'string' ? p.image : p.image.src;
      if (src && !images.includes(src)) images.unshift(src);
    }

    const videos: string[] = [];
    if (Array.isArray(p.media)) {
      for (const m of p.media) {
        if (m?.media_type === 'video' || m?.mediaType === 'VIDEO') {
          const url = m.src ?? m.url ?? m.sources?.[0]?.url;
          if (url) videos.push(url);
        }
      }
    }

    const variants = Array.isArray(p.variants)
      ? p.variants.map((v: any) => ({
          id: v.id,
          title: v.title,
          price: toNumber(v.price),
          sku: v.sku,
          inventory: v.inventory_quantity,
          currency: v.currency,
        }))
      : [];

    const price = variants.length > 0 ? (variants[0].price as number | undefined) : toNumber(p.price);

    return {
      id: String(p.id ?? p.gid ?? raw.id ?? ''),
      title: cleanString(p.title) ?? 'Untitled product',
      description: cleanString(p.body_html ?? p.description ?? p.body),
      price,
      currency: p.currency ?? variants[0]?.currency ?? 'USD',
      images,
      videos,
      brand: cleanString(p.vendor ?? p.brand),
      category: cleanString(p.product_type ?? p.category ?? p.collections?.[0]?.title),
      tags: toStringArray(p.tags),
      variants,
      metadata: { source: 'Shopify', handle: p.handle },
    };
  }
}