import type { ProductNormalizer } from './types.js';
import { cleanString, toNumber, toStringArray } from './types.js';
import type { UnifiedProduct } from '../../../../types/video.js';

export class AmazonNormalizer implements ProductNormalizer {
  readonly source = 'Amazon' as const;

  canNormalize(raw: Record<string, unknown>): boolean {
    const p = (raw.product ?? raw) as Record<string, unknown>;
    return Boolean(p && (p.ASIN || p.asin || p.id) && (p.title || p.Title));
  }

  normalize(raw: Record<string, unknown>): UnifiedProduct {
    const p = (raw.product ?? raw) as Record<string, any>;

    const images: string[] = [];
    if (Array.isArray(p.images)) {
      for (const img of p.images) {
        const src = typeof img === 'string' ? img : img?.url ?? img?.src ?? img?.large;
        if (src) images.push(src);
      }
    }
    const main = p.image ?? p.mainImage ?? p.imageUrl;
    if (main) {
      const src = typeof main === 'string' ? main : main.url ?? main.src;
      if (src && !images.includes(src)) images.unshift(src);
    }
    if (Array.isArray(p.imageUrls)) {
      for (const url of p.imageUrls) if (typeof url === 'string' && !images.includes(url)) images.push(url);
    }

    const priceObj = p.price;
    const price =
      priceObj && typeof priceObj === 'object'
        ? toNumber(priceObj.value ?? priceObj.amount)
        : toNumber(priceObj);

    const variants = Array.isArray(p.variations ?? p.variants)
      ? (p.variations ?? p.variants).map((v: any) => ({
          id: v.asin ?? v.id,
          title: v.title ?? v.name,
          price: toNumber(v.price),
        }))
      : [];

    const categories = Array.isArray(p.categories) ? p.categories : [];

    return {
      id: String(p.ASIN ?? p.asin ?? p.id ?? ''),
      title: cleanString(p.title ?? p.Title) ?? 'Untitled product',
      description: cleanString(
        p.description ?? p.productDescription ?? (Array.isArray(p.featureBulletPoints) ? p.featureBulletPoints.join(' ') : undefined)
      ),
      price,
      currency: priceObj?.currency ?? p.currency ?? 'USD',
      images,
      brand: cleanString(p.brand ?? p.brandName ?? p.manufacturer),
      category: cleanString(categories[categories.length - 1] ?? p.category ?? p.department ?? p.productGroup),
      tags: toStringArray(p.features ?? p.department ?? p.productGroup),
      variants,
      metadata: { source: 'Amazon', asin: p.ASIN ?? p.asin, rating: p.rating },
    };
  }
}