import { z } from 'zod';

export { idParamSchema } from './commonSchemas.js';

const platformSchema = z.enum(['TikTok', 'Instagram', 'YouTube', 'Facebook', 'Pinterest']);

export const createCampaignSchema = z.object({
  body: z.object({
    name: z.string().min(1).max(200),
    productId: z.string().uuid().optional(),
    brandId: z.string().uuid().optional(),
    audienceId: z.string().uuid().optional(),
    goal: z.enum(['Awareness', 'Engagement', 'Conversion', 'Retention']).optional(),
    platforms: z.array(platformSchema).max(5).optional(),
  }),
});

export const generateCampaignSchema = z.object({
  params: z.object({
    id: z.string().uuid(),
  }),
  body: z.object({
    productId: z.string().uuid(),
    platforms: z.array(platformSchema).max(5).optional(),
  }),
});