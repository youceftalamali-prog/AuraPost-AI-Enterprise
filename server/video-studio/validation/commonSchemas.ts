import { z } from 'zod';

/** Shared param/query schemas reused across route groups. */

export const idParamSchema = z.object({
  params: z.object({
    id: z.string().uuid(),
  }),
});

export const hexColorSchema = z.string().regex(/^#[0-9a-fA-F]{6}$/, 'invalid hex color');

export const paginationQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(200).default(50),
  offset: z.coerce.number().int().min(0).default(0),
});