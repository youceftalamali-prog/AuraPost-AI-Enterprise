import { z } from 'zod';
import { hexColorSchema } from './commonSchemas.js';

export { idParamSchema } from './commonSchemas.js';

export const createBrandSchema = z.object({
  body: z.object({
    name: z.string().min(1).max(200),
    logoUrl: z.string().url().optional(),
    colors: z.array(hexColorSchema).max(10).optional(),
    fonts: z.array(z.string().max(100)).max(5).optional(),
    tone: z.string().max(100).optional(),
    voice: z.string().max(100).optional(),
    personality: z.array(z.string().max(50)).max(10).optional(),
    values: z.array(z.string().max(100)).max(10).optional(),
    luxuryLevel: z.number().int().min(0).max(100).optional(),
    visualIdentity: z.string().max(100).optional(),
    writingStyle: z.string().max(100).optional(),
    ctaStyle: z.string().max(100).optional(),
    description: z.string().max(2000).optional(),
    website: z.string().url().optional(),
  }),
});