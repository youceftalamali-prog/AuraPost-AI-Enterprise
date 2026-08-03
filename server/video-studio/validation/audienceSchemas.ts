import { z } from 'zod';

export { idParamSchema } from './commonSchemas.js';

export const createAudienceSchema = z.object({
  body: z.object({
    name: z.string().min(1).max(200),
    ageGroup: z.enum(['Kids', 'Teens', 'Young Adults', 'Adults', 'Seniors', 'Mixed', 'Professionals']),
    gender: z.enum(['Men', 'Women', 'Unisex', 'Mixed']),
    interests: z.array(z.string().max(50)).max(20).optional(),
    buyingIntent: z.enum(['Low', 'Medium', 'High', 'Impulse']).optional(),
    incomeLevel: z.enum(['Budget', 'Middle', 'Upper-Middle', 'Luxury', 'Mixed']).optional(),
    lifestyle: z.array(z.string().max(100)).max(10).optional(),
    location: z.array(z.string().max(100)).max(10).optional(),
    language: z.string().max(20).optional(),
  }),
});