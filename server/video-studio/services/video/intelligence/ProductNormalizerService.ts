import type { ProductSource, UnifiedProduct } from '../../../types/video.js';
import { getNormalizer, detectNormalizer } from './normalizers/index.js';

/**
 * Turns any raw product payload into a UnifiedProduct, either by an
 * explicit source hint or by auto-detecting the payload shape.
 */
export class ProductNormalizerService {
  normalizeWithSource(source: ProductSource, raw: Record<string, unknown>): UnifiedProduct {
    return getNormalizer(source).normalize(raw);
  }

  normalizeAuto(raw: Record<string, unknown>): UnifiedProduct {
    return detectNormalizer(raw).normalize(raw);
  }

  /** Re-validate an already-unified product (defensive pass-through). */
  normalizeExisting(product: UnifiedProduct): UnifiedProduct {
    return {
      id: product.id,
      title: product.title || 'Untitled product',
      description: product.description,
      price: product.price,
      currency: product.currency || 'USD',
      images: Array.isArray(product.images) ? product.images : [],
      videos: product.videos ?? [],
      brand: product.brand,
      category: product.category,
      tags: product.tags ?? [],
      variants: product.variants ?? [],
      metadata: product.metadata ?? {},
    };
  }
}

export const productNormalizerService = new ProductNormalizerService();