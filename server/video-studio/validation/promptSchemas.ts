import { z } from 'zod';

const platformSchema = z.enum(['TikTok', 'Instagram', 'YouTube', 'Facebook', 'Pinterest']);
const providerSchema = z.enum(['HuggingFace', 'Runway', 'Kling', 'Veo', 'Wan', 'Pika', 'Luma']);

const videoSettingsSchema = z.object({
  resolution: z.enum(['720', '1080', '2K', '4K']).optional(),
  aspectRatio: z.enum(['9:16', '1:1', '16:9', '4:5']).optional(),
  duration: z.union([z.literal(5), z.literal(10), z.literal(15), z.literal(20), z.literal(30)]).optional(),
  fps: z.union([z.literal(24), z.literal(30), z.literal(60)]).optional(),
  quality: z.enum(['Draft', 'Standard', 'High', 'Ultra']).optional(),
  cameraMotion: z.enum(['Static', 'Pan', 'Zoom', 'Orbit']).optional(),
  lighting: z.enum(['Soft', 'Luxury', 'Studio', 'Dark']).optional(),
  background: z.enum(['Transparent', 'White', 'Black', 'Gradient', 'Generated AI']).optional(),
  speed: z.enum(['Slow', 'Normal', 'Fast']).optional(),
  platform: platformSchema.optional(),
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

export const composePromptSchema = z.object({
  body: z.object({
    productId: z.string().uuid(),
    templateId: z.string().uuid(),
    platform: platformSchema.optional(),
    blockIds: z.array(z.string().uuid()).max(6).optional(),
    customPrompt: z.string().max(5000).optional(),
    videoSettings: videoSettingsSchema.optional(),
  }),
});

export const previewPromptSchema = z.object({
  body: z.object({
    prompt: z.string().min(1).max(5000),
    negativePrompt: z.string().max(2000).optional(),
    provider: providerSchema.optional(),
    settings: videoSettingsSchema.partial().optional(),
  }),
});

export const variationsSchema = z.object({
  body: z.object({
    prompt: z.string().min(1).max(5000),
    negativePrompt: z.string().max(2000).optional(),
    context: z
      .object({
        productId: z.string().uuid().optional(),
        brandId: z.string().uuid().optional(),
        audienceId: z.string().uuid().optional(),
      })
      .optional(),
  }),
});