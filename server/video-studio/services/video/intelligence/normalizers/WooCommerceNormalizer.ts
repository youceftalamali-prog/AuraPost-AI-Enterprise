import type { ProductNormalizer } from './types.js';
import { cleanString, toNumber, toStringArray } from './types.js';
import type { UnifiedProduct } from '../../../../types/video.js';

export class WooCommerceNormalizer implements ProductNormalizer {
  readonly source = 'WooCommerce' as const;

  canNormalize(raw: Record<string, unknown>): boolean {
    const p = (raw.product ?? raw) as Record<string, unknown>;
    return Boolean(p && (p.id || p.product_id) && (p.name || p.title) && p.type);
  }

  normalize(raw: Record<string, unknown>): UnifiedProduct {
    const p = (raw.product ?? raw) as Record<string, any>;

    const images: string[] = [];
    if (Array.isArray(p.images)) {
      for (const img of p.images) {
        const src = img?.src ?? img?.url;
        if (src) images.push(src);
      }
    }

    const variants = Array.isArray(p.variations)
      ? p.variations.map((v: any) => ({
          id: v.id,
          price: toNumber(v.price),
          sku: v.sku,
          stock: v.stock_quantity,
        }))
      : [];

    const categories = Array.isArray(p.categories) ? p.categories.map((c: any) => c.name) : [];
    const tags = Array.isArray(p.tags) ? p.tags.map((t: any) => t.name ?? String(t)) : [];

    return {
      id: String(p.id ?? p.product_id ?? ''),
      title: cleanString(p.name ?? p.title) ?? 'Untitled product',
      description: cleanString(p.description ?? p.short_description),
      price: toNumber(p.price ?? p.regular_price ?? p.sale_price),
      currency: p.currency ?? 'USD',
      images,
      brand: cleanString(p.brands?.[0]?.name),
      category: cleanString(categories[0]),
      tags: toStringArray(tags),
      variants,
      metadata: { source: 'WooCommerce', sku: p.sku, type: p.type },
    };
  }
}