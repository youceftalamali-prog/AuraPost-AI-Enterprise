import type { PromptPreviewResult } from '../../../types/prompt.js';
import type { VideoGenerationSettings, VideoProviderName } from '../../../types/video.js';
import { promptOptimizationService } from './PromptOptimizationService.js';

const PROVIDER_COST_FACTOR: Record<VideoProviderName, number> = {
  HuggingFace: 1.0,
  Wan: 1.1,
  Pika: 1.2,
  Kling: 1.3,
  Luma: 1.4,
  Runway: 1.5,
  Veo: 1.8,
};

const QUALITY_FACTOR: Record<string, number> = {
  Draft: 0.5,
  Standard: 1.0,
  High: 1.5,
  Ultra: 2.0,
};

const RESOLUTION_FACTOR: Record<string, number> = {
  '720': 0.7,
  '1080': 1.0,
  '2K': 1.8,
  '4K': 3.0,
};

export interface PreviewInput {
  prompt: string;
  negativePrompt?: string;
  provider?: VideoProviderName;
  settings?: Partial<VideoGenerationSettings>;
  breakdown?: PromptPreviewResult['breakdown'];
}

/**
 * Previews a prompt before generation: estimated cost, duration, quality,
 * recommended provider, plus warnings and improvement suggestions.
 */
export class PromptPreviewService {
  preview(input: PreviewInput): PromptPreviewResult {
    const settings = input.settings ?? {};
    const provider = input.provider ?? this.recommendProvider(settings);
    const tokenCount = promptOptimizationService.estimateTokens(input.prompt);

    const duration = settings.duration ?? 10;
    const qualityFactor = QUALITY_FACTOR[settings.quality ?? 'High'] ?? 1.0;
    const resolutionFactor = RESOLUTION_FACTOR[settings.resolution ?? '1080'] ?? 1.0;
    const providerFactor = PROVIDER_COST_FACTOR[provider] ?? 1.0;

    const estimatedCost = Number((tokenCount * 0.0001 * qualityFactor * resolutionFactor * providerFactor * (duration / 10)).toFixed(4));
    const qualityScore = this.qualityScore(input.prompt, settings);

    return {
      finalPrompt: input.prompt,
      negativePrompt: input.negativePrompt ?? '',
      estimatedCost,
      estimatedDuration: duration,
      recommendedProvider: provider,
      qualityScore,
      tokenCount,
      breakdown:
        input.breakdown ?? {
          productContribution: 20,
          brandContribution: 15,
          audienceContribution: 15,
          platformContribution: 15,
          templateContribution: 20,
          blocksContribution: 10,
        },
      warnings: this.warnings(input.prompt, estimatedCost, settings),
      suggestions: this.suggestions(input.prompt, settings),
    };
  }

  private recommendProvider(settings: Partial<VideoGenerationSettings>): VideoProviderName {
    if (settings.quality === 'Ultra') return 'Veo';
    if (settings.quality === 'Draft') return 'HuggingFace';
    if ((settings.duration ?? 10) > 20) return 'Runway';
    return 'HuggingFace';
  }

  private qualityScore(prompt: string, settings: Partial<VideoGenerationSettings>): number {
    let score = 50;
    if (prompt.length > 100) score += 10;
    if (prompt.length > 250) score += 10;
    if (settings.quality === 'Ultra') score += 20;
    else if (settings.quality === 'High') score += 15;
    else if (settings.quality === 'Standard') score += 8;
    if (settings.resolution === '4K') score += 10;
    else if (settings.resolution === '2K') score += 5;
    return Math.min(100, score);
  }

  private warnings(prompt: string, cost: number, settings: Partial<VideoGenerationSettings>): string[] {
    const warnings: string[] = [];
    if (prompt.length < 40) warnings.push('Prompt is very short — add more detail for better results.');
    if (prompt.length > 1500) warnings.push('Prompt is very long — may increase cost and reduce coherence.');
    if (cost > 0.5) warnings.push(`Estimated cost ($${cost}) is high. Consider Draft quality or shorter duration.`);
    if (settings.quality === 'Ultra') warnings.push('Ultra quality significantly increases cost and generation time.');
    if (settings.resolution === '4K') warnings.push('4K resolution is expensive — 1080p is usually enough for social.');
    return warnings;
  }

  private suggestions(prompt: string, settings: Partial<VideoGenerationSettings>): string[] {
    const suggestions: string[] = [];
    const lower = prompt.toLowerCase();
    if (!lower.includes('lighting')) suggestions.push('Specify lighting (e.g. soft, studio, golden hour).');
    if (!lower.includes('camera')) suggestions.push('Specify camera movement (e.g. orbit, pan, zoom).');
    if (!lower.includes('style') && !lower.includes('cinematic')) suggestions.push('Add a style descriptor (e.g. cinematic, minimal).');
    if (settings.platform === 'TikTok' && !lower.includes('vertical') && !lower.includes('9:16')) {
      suggestions.push('For TikTok, ensure vertical 9:16 framing.');
    }
    return suggestions;
  }
}

export const promptPreviewService = new PromptPreviewService();