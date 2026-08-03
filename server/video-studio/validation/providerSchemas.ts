import { z } from 'zod';

const providerSchema = z.enum(['HuggingFace', 'Runway', 'Kling', 'Veo', 'Wan', 'Pika', 'Luma']);

const videoSettingsSchema = z.object({
  resolution: z.enum(['720', '1080', '2K', '4K']),
  aspectRatio: z.enum(['9:16', '1:1', '16:9', '4:5']),
  duration: z.union([z.literal(5), z.literal(10), z.literal(15), z.literal(20), z.literal(30)]),
  fps: z.union([z.literal(24), z.literal(30), z.literal(60)]),
  quality: z.enum(['Draft', 'Standard', 'High', 'Ultra']),
  cameraMotion: z.enum(['Static', 'Pan', 'Zoom', 'Orbit']).optional(),
  lighting: z.enum(['Soft', 'Luxury', 'Studio', 'Dark']).optional(),
  background: z.enum(['Transparent', 'White', 'Black', 'Gradient', 'Generated AI']).optional(),
  speed: z.enum(['Slow', 'Normal', 'Fast']).optional(),
  platform: z.enum(['TikTok', 'Instagram', 'YouTube', 'Facebook', 'Pinterest']).optional(),
  voice: z.string().max(100).optional(),
  music: z.string().max(200).optional(),
  subtitles: z.boolean().optional(),
  transitions: z.string().max(100).optional(),
  animations: z.string().max(100).optional(),
  captionStyle: z.string().max(100).optional(),
  logoPosition: z.string().max(50).optional(),
  brandColors: z.array(z.string().regex(/^#[0-9a-fA-F]{6}$/)).max(10).optional(),
  watermark: z.boolean().optional(),
  aiCreativity: z.number().min(0).max(1).optional(),
});

export const compareCostSchema = z.object({
  body: z.object({
    prompt: z.string().min(1).max(5000),
    settings: videoSettingsSchema,
    providers: z.array(providerSchema).min(1).optional(),
  }),
});

export const selectProviderSchema = z.object({
  body: z.object({
    prompt: z.string().min(1).max(5000),
    settings: videoSettingsSchema,
    criteria: z
      .object({
        prioritize: z.enum(['cost', 'speed', 'quality', 'availability', 'balanced']).optional(),
        maxCost: z.number().positive().optional(),
        maxWaitTime: z.number().positive().optional(),
        requiredFeatures: z.array(z.string()).optional(),
        preferredProviders: z.array(providerSchema).optional(),
        excludedProviders: z.array(providerSchema).optional(),
      })
      .optional(),
  }),
});

export const updateProviderSettingsSchema = z.object({
  body: z.object({
    defaultProvider: providerSchema.optional(),
    autoRouting: z.boolean().optional(),
    fallbackEnabled: z.boolean().optional(),
    fallbackChain: z.array(providerSchema).max(7).optional(),
    maxCostPerVideo: z.number().min(0).max(1000).optional(),
    preferredQuality: z.enum(['Draft', 'Standard', 'High', 'Ultra']).optional(),
    apiKeys: z.record(z.string(), z.string()).optional(),
    customPriorities: z.record(z.string(), z.number()).optional(),
    excludedProviders: z.array(providerSchema).optional(),
  }),
});

export const testProviderSchema = z.object({
  body: z.object({
    provider: providerSchema,
  }),
});

export const providerParamSchema = z.object({
  params: z.object({
    provider: providerSchema,
  }),
});