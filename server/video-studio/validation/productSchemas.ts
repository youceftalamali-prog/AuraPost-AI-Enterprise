import { z } from 'zod';

export const analyzeProductSchema = z.object({
  params: z.object({
    productId: z.string().min(1),
  }),
  body: z.object({
    product: z.record(z.string(), z.unknown()),
    source: z.enum(['Shopify', 'Amazon', 'WooCommerce', 'AliExpress', 'Manual', 'CSV', 'API']).optional(),
  }),
});