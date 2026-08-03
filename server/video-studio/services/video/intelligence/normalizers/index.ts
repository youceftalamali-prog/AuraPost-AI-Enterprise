import type { ProductNormalizer } from './types.js';
import type { ProductSource } from '../../../../types/video.js';
import { ShopifyNormalizer } from './ShopifyNormalizer.js';
import { AmazonNormalizer } from './AmazonNormalizer.js';
import { WooCommerceNormalizer } from './WooCommerceNormalizer.js';
import { AliExpressNormalizer } from './AliExpressNormalizer.js';
import { ManualNormalizer } from './ManualNormalizer.js';

export * from './types.js';

const normalizers: ProductNormalizer[] = [
  new ShopifyNormalizer(),
  new AmazonNormalizer(),
  new WooCommerceNormalizer(),
  new AliExpressNormalizer(),
];

const fallback = new ManualNormalizer();

export function getNormalizer(source: ProductSource): ProductNormalizer {
  return normalizers.find((n) => n.source === source) ?? fallback;
}

export function detectNormalizer(raw: Record<string, unknown>): ProductNormalizer {
  return normalizers.find((n) => n.canNormalize(raw)) ?? fallback;
}

export { fallback as manualNormalizer };