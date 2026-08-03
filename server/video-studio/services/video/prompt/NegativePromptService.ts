import type { NegativePromptResult } from '../../../types/prompt.js';
import type { VideoPlatform } from '../../../types/video.js';

const BASE_NEGATIVES = [
  'blurry', 'low quality', 'distorted', 'deformed', 'ugly', 'amateur', 'unprofessional',
  'overexposed', 'underexposed', 'poorly lit',
];

const SAFETY = [
  'no violence', 'no nudity', 'no harmful content', 'no copyrighted material',
  'no trademarks', 'no logos', 'no text', 'no watermarks', 'safe for all audiences',
];

const QUALITY = ['low resolution', 'pixelated', 'compressed', 'noise', 'grain', 'artifacts'];

const CAMERA_RESTRICTIONS = [
  'shaky camera', 'unstable footage', 'poor framing', 'bad composition',
  'awkward angles', 'dutch angle', 'extreme close-up', 'too far away',
];

const ARTIFACT_PREVENTION = [
  'morphing artifacts', 'flickering', 'temporal inconsistency', 'frame skipping',
  'ghosting', 'double exposure', 'color banding', 'aliasing', 'jagged edges',
];

const PLATFORM_NEGATIVES: Record<VideoPlatform, string[]> = {
  TikTok: ['horizontal format', 'slow pace', 'boring intro', 'static'],
  Instagram: ['low aesthetic', 'cluttered', 'unpolished'],
  YouTube: ['clickbait', 'misleading thumbnail', 'poor audio'],
  Facebook: ['clickbait', 'misleading', 'spam'],
  Pinterest: ['ugly', 'uninspiring', 'cluttered'],
};

export interface NegativePromptContext {
  platform?: VideoPlatform;
  style?: string;
  quality?: string;
}

/**
 * Builds layered negative prompts: base + safety + quality + camera +
 * artifact prevention, plus platform/style-specific additions.
 */
export class NegativePromptService {
  generate(context: NegativePromptContext = {}): NegativePromptResult {
    const negativePrompt = this.base(context);
    const safetyPrompt = SAFETY.join(', ');
    const qualityPrompt = this.quality(context.quality);
    const cameraRestrictions = CAMERA_RESTRICTIONS.join(', ');
    const artifactPrevention = ARTIFACT_PREVENTION.join(', ');

    const combined = [negativePrompt, safetyPrompt, qualityPrompt, cameraRestrictions, artifactPrevention]
      .filter((s) => s.length > 0)
      .join(', ');

    return { negativePrompt, safetyPrompt, qualityPrompt, cameraRestrictions, artifactPrevention, combined };
  }

  private base(context: NegativePromptContext): string {
    const parts = [...BASE_NEGATIVES];
    if (context.platform) parts.push(...PLATFORM_NEGATIVES[context.platform]);
    if (context.style === 'Luxury') parts.push('cheap', 'tacky', 'gaudy', 'over the top');
    if (context.style === 'Minimal') parts.push('cluttered', 'busy', 'overwhelming');
    if (context.style === 'Cinematic') parts.push('flat lighting', 'low production value');
    return parts.join(', ');
  }

  private quality(quality?: string): string {
    const parts = [...QUALITY];
    if (quality === 'Ultra' || quality === 'High') parts.push('standard quality', 'mediocre');
    return parts.join(', ');
  }
}

export const negativePromptService = new NegativePromptService();