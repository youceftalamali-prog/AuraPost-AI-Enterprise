import { z } from 'zod';

export const templateSearchSchema = z.object({
  query: z.object({
    category: z.string().max(100).optional(),
    subcategory: z.string().max(100).optional(),
    style: z.string().max(100).optional(),
    platform: z.string().max(50).optional(),
    difficulty: z.string().max(20).optional(),
    search: z.string().max(200).optional(),
    sortBy: z.enum(['popularity', 'estimatedCost', 'estimatedDuration', 'name', 'createdAt']).optional(),
    sortOrder: z.enum(['asc', 'desc']).optional(),
    limit: z.coerce.number().int().min(1).max(200).optional(),
    offset: z.coerce.number().int().min(0).optional(),
  }),
});

export const templateIdSchema = z.object({
  params: z.object({
    id: z.string().uuid(),
  }),
});

export const templateCategorySchema = z.object({
  params: z.object({
    category: z.string().max(100),
  }),
  query: z.object({
    limit: z.coerce.number().int().min(1).max(200).optional(),
  }),
});

export const productIdParamSchema = z.object({
  params: z.object({
    productId: z.string().uuid(),
  }),
  query: z.object({
    platform: z.string().max(50).optional(),
    limit: z.coerce.number().int().min(1).max(100).optional(),
  }),
});