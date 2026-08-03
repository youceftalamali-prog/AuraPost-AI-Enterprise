import { db } from '../db/index.js';
import { promptBlocks } from '../db/schema/promptBlocks.js';
import { createVideoLogger } from '../utils/videoLogger.js';
import type { NewPromptBlock } from '../types/entities.js';

const logger = createVideoLogger('PromptBlocksSeed');

/**
 * Reusable prompt fragments organized by category. Composed into prompts
 * by the PromptCompositionService.
 */
const BLOCKS = [
  // ---------- Style ----------
  { name: 'Luxury', category: 'Style', description: 'Premium high-end aesthetic', promptFragment: 'luxury aesthetic, premium quality, elegant composition, sophisticated lighting', negativeFragment: 'cheap, tacky, low quality', tags: ['luxury', 'premium', 'elegant'], popularity: 95, costMultiplier: '1.30', qualityImpact: '0.80' },
  { name: 'Minimal', category: 'Style', description: 'Clean minimalist look', promptFragment: 'minimalist design, clean composition, simple background, negative space', negativeFragment: 'cluttered, busy, overwhelming', tags: ['minimal', 'clean', 'simple'], popularity: 90, costMultiplier: '1.00', qualityImpact: '0.50' },
  { name: 'Cinematic', category: 'Style', description: 'Movie-like cinematic quality', promptFragment: 'cinematic quality, film-like production, dramatic lighting, anamorphic lens', negativeFragment: 'flat lighting, amateur', tags: ['cinematic', 'film', 'dramatic'], popularity: 92, costMultiplier: '1.40', qualityImpact: '0.90' },
  { name: 'Modern', category: 'Style', description: 'Contemporary modern aesthetic', promptFragment: 'modern aesthetic, contemporary design, sleek look, trendy', negativeFragment: 'outdated, old-fashioned', tags: ['modern', 'contemporary', 'sleek'], popularity: 88, costMultiplier: '1.00', qualityImpact: '0.50' },
  { name: 'Bold', category: 'Style', description: 'Vibrant bold statement', promptFragment: 'bold vibrant colors, eye-catching, striking, dynamic composition', negativeFragment: 'dull, muted, boring', tags: ['bold', 'vibrant', 'striking'], popularity: 85, costMultiplier: '1.10', qualityImpact: '0.60' },

  // ---------- Platform ----------
  { name: 'TikTok', category: 'Platform', description: 'Optimized for TikTok', promptFragment: 'TikTok style, vertical 9:16, fast-paced, attention-grabbing opening', negativeFragment: 'horizontal, slow pace', tags: ['tiktok', 'vertical', 'fast'], popularity: 96, costMultiplier: '1.00', qualityImpact: '0.40' },
  { name: 'Instagram Reel', category: 'Platform', description: 'Optimized for Instagram Reels', promptFragment: 'Instagram Reel style, vertical 9:16, aesthetic, visual hook', negativeFragment: 'low aesthetic, unpolished', tags: ['instagram', 'reel', 'aesthetic'], popularity: 93, costMultiplier: '1.00', qualityImpact: '0.50' },
  { name: 'YouTube Shorts', category: 'Platform', description: 'Optimized for YouTube Shorts', promptFragment: 'YouTube Shorts style, vertical 9:16, informative, strong opening', negativeFragment: 'poor audio, low quality', tags: ['youtube', 'shorts', 'informative'], popularity: 87, costMultiplier: '1.00', qualityImpact: '0.50' },
  { name: 'Facebook', category: 'Platform', description: 'Optimized for Facebook', promptFragment: 'Facebook style, 16:9, story-driven, relatable opening', negativeFragment: 'clickbait, misleading', tags: ['facebook', 'story', 'relatable'], popularity: 80, costMultiplier: '1.00', qualityImpact: '0.50' },
  { name: 'Pinterest', category: 'Platform', description: 'Optimized for Pinterest', promptFragment: 'Pinterest style, vertical 9:16, inspirational, aesthetic visual', negativeFragment: 'ugly, uninspiring', tags: ['pinterest', 'inspirational', 'aesthetic'], popularity: 78, costMultiplier: '1.00', qualityImpact: '0.50' },

  // ---------- Format ----------
  { name: 'Product Demo', category: 'Format', description: 'Product demonstration', promptFragment: 'product demonstration, feature showcase, usage examples, close-up details', negativeFragment: 'vague, unclear', tags: ['demo', 'product', 'features'], popularity: 88, costMultiplier: '1.00', qualityImpact: '0.60' },
  { name: 'Lifestyle', category: 'Format', description: 'Lifestyle integration', promptFragment: 'lifestyle integration, real-world usage, aspirational setting, natural environment', negativeFragment: 'studio only, artificial', tags: ['lifestyle', 'real-world', 'aspirational'], popularity: 90, costMultiplier: '1.10', qualityImpact: '0.60' },
  { name: 'Before/After', category: 'Format', description: 'Before and after transformation', promptFragment: 'before and after comparison, transformation sequence, clear contrast', negativeFragment: 'unclear comparison', tags: ['before', 'after', 'transformation'], popularity: 86, costMultiplier: '1.00', qualityImpact: '0.50' },
  { name: 'UGC', category: 'Format', description: 'User-generated content style', promptFragment: 'UGC style, authentic look, natural lighting, handheld camera feel', negativeFragment: 'overly produced, artificial', tags: ['ugc', 'authentic', 'natural'], popularity: 91, costMultiplier: '0.90', qualityImpact: '0.30' },

  // ---------- Technique ----------
  { name: 'Macro', category: 'Technique', description: 'Extreme close-up macro', promptFragment: 'macro photography, extreme close-up, detailed texture, sharp focus', negativeFragment: 'blurry, out of focus', tags: ['macro', 'close-up', 'detail'], popularity: 87, costMultiplier: '1.20', qualityImpact: '0.70' },
  { name: 'Slow Motion', category: 'Technique', description: 'Slow motion cinematography', promptFragment: 'slow motion, high frame rate, dramatic timing, graceful movement', negativeFragment: 'fast motion, rushed', tags: ['slow motion', 'high fps', 'dramatic'], popularity: 85, costMultiplier: '1.30', qualityImpact: '0.60' },
  { name: 'Timelapse', category: 'Technique', description: 'Timelapse sequence', promptFragment: 'timelapse sequence, accelerated motion, dynamic progression', negativeFragment: 'static, frozen', tags: ['timelapse', 'accelerated', 'dynamic'], popularity: 82, costMultiplier: '1.10', qualityImpact: '0.50' },

  // ---------- Mood ----------
  { name: 'Elegant', category: 'Mood', description: 'Elegant refined mood', promptFragment: 'elegant mood, refined atmosphere, graceful, sophisticated', negativeFragment: 'tacky, gaudy', tags: ['elegant', 'refined', 'graceful'], popularity: 88, costMultiplier: '1.10', qualityImpact: '0.60' },
  { name: 'Playful', category: 'Mood', description: 'Playful fun mood', promptFragment: 'playful mood, fun atmosphere, lighthearted, cheerful, joyful energy', negativeFragment: 'serious, somber', tags: ['playful', 'fun', 'cheerful'], popularity: 86, costMultiplier: '1.00', qualityImpact: '0.40' },
  { name: 'Dramatic', category: 'Mood', description: 'Dramatic intense mood', promptFragment: 'dramatic mood, intense atmosphere, powerful presence, bold statement', negativeFragment: 'flat, boring', tags: ['dramatic', 'intense', 'powerful'], popularity: 84, costMultiplier: '1.10', qualityImpact: '0.50' },

  // ---------- Camera ----------
  { name: 'Orbit Shot', category: 'Camera', description: '360-degree orbit movement', promptFragment: 'orbit camera movement, 360 degree rotation, circular tracking shot', negativeFragment: 'static camera', tags: ['orbit', '360', 'rotation'], popularity: 84, costMultiplier: '1.20', qualityImpact: '0.60' },
  { name: 'Dolly Zoom', category: 'Camera', description: 'Dolly zoom (Vertigo effect)', promptFragment: 'dolly zoom effect, vertigo effect, dramatic perspective shift', negativeFragment: 'static, no zoom', tags: ['dolly', 'zoom', 'vertigo'], popularity: 81, costMultiplier: '1.30', qualityImpact: '0.70' },
  { name: 'Pan', category: 'Camera', description: 'Horizontal pan movement', promptFragment: 'horizontal pan camera movement, smooth lateral tracking', negativeFragment: 'static, jerky', tags: ['pan', 'lateral', 'tracking'], popularity: 83, costMultiplier: '1.10', qualityImpact: '0.50' },

  // ---------- Lighting ----------
  { name: 'Golden Hour', category: 'Lighting', description: 'Warm golden hour lighting', promptFragment: 'golden hour lighting, warm sunset glow, soft warm light', negativeFragment: 'harsh light, cold tones', tags: ['golden hour', 'warm', 'sunset'], popularity: 88, costMultiplier: '1.00', qualityImpact: '0.60' },
  { name: 'Studio Lighting', category: 'Lighting', description: 'Professional studio lighting', promptFragment: 'professional studio lighting, three-point lighting, softbox illumination', negativeFragment: 'natural light only, harsh shadows', tags: ['studio', 'professional', 'softbox'], popularity: 85, costMultiplier: '1.10', qualityImpact: '0.70' },
  { name: 'Neon Glow', category: 'Lighting', description: 'Vibrant neon lighting', promptFragment: 'neon lighting, vibrant glow, colorful illumination, cyberpunk aesthetic', negativeFragment: 'natural light, dull', tags: ['neon', 'vibrant', 'cyberpunk'], popularity: 82, costMultiplier: '1.10', qualityImpact: '0.50' },

  // ---------- Pacing ----------
  { name: 'Fast Cuts', category: 'Pacing', description: 'Quick rapid editing', promptFragment: 'fast cuts, rapid editing, quick transitions, dynamic pacing', negativeFragment: 'slow pacing, long takes', tags: ['fast', 'quick', 'dynamic'], popularity: 87, costMultiplier: '1.00', qualityImpact: '0.30' },
  { name: 'Smooth Flow', category: 'Pacing', description: 'Smooth flowing transitions', promptFragment: 'smooth transitions, flowing movement, seamless cuts, gentle pacing', negativeFragment: 'jerky, abrupt, choppy', tags: ['smooth', 'flowing', 'seamless'], popularity: 84, costMultiplier: '1.00', qualityImpact: '0.50' },
];

export async function seedPromptBlocks(): Promise<number> {
  logger.info('Seeding prompt blocks...');
  let inserted = 0;

  for (const block of BLOCKS) {
    try {
      await db.insert(promptBlocks).values(block).onConflictDoNothing();
      inserted++;
    } catch (error) {
      logger.error('Failed to seed prompt block', error as Error, { name: block.name });
    }
  }

  logger.info('Prompt blocks seeded', { count: inserted });
  return inserted;
}