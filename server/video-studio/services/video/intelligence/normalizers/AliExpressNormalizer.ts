import type { ProductNormalizer } from './types.js';
import { cleanString, toNumber, toStringArray } from './types.js';
import type { UnifiedProduct } from '../../../../types/video.js';

export class AliExpressNormalizer implements ProductNormalizer {
  readonly source = 'AliExpress' as const;

  canNormalize(raw: Record<string, unknown>): boolean {
    const p = (raw.product ?? raw) as Record<string, unknown>;
    return Boolean(p && (p.productId || p.item_id || p.id) && (p.subject || p.title || p.productTitle));
  }

  normalize(raw: Record<string, unknown>): UnifiedProduct {
    const p = (raw.product ?? raw) as Record<string, any>;

    const images: string[] = [];
    const lists = [p.imageUrls, p.imageList, p.images];
    for (const list of lists) {
      if (Array.isArray(list)) {
        for (const img of list) {
          const src = typeof img === 'string' ? img : img?.imageUrl ?? img?.url;
          if (src && !images.includes(src)) images.push(src);
        }
      }
    }

    const priceObj = p.minPrice ?? p.minAmount;
    const price =
      priceObj && typeof priceObj === 'object'
        ? toNumber(priceObj.minPrice ?? priceObj.value)
        : toNumber(p.price ?? p.salePrice);

    const variants = Array.isArray(p.skuList ?? p.skuProperties)
      ? (p.skuList ?? p.skuProperties).map((v: any) => ({
          id: v.skuId ?? v.id,
          price: toNumber(v.skuPrice ?? v.price),
          stock: v.skuStock ?? v.inventory,
        }))
      : [];

    return {
      id: String(p.productId ?? p.item_id ?? p.id ?? ''),
      title: cleanString(p.subject ?? p.title ?? p.productTitle) ?? 'Untitled product',
      description: cleanString(p.description ?? p.detail ?? p.productDescription),
      price,
      currency: p.currency ?? p.currencyCode ?? 'USD',
      images,
      brand: cleanString(p.brandName ?? p.brand),
      category: cleanString(p.categoryName ?? p.category),
      tags: toStringArray(p.keywords ?? p.productType),
      variants,
      metadata: { source: 'AliExpress', productId: p.productId ?? p.item_id },
    };
  }
}