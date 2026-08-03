import { productAnalysisRepository } from '../../../repositories/ProductAnalysisRepository.js';
import { brandRepository } from '../../../repositories/BrandRepository.js';
import { audienceRepository } from '../../../repositories/AudienceRepository.js';
import { videoTemplateRepository } from '../../../repositories/VideoTemplateRepository.js';
import { promptBlockRepository } from '../../../repositories/PromptBlockRepository.js';
import type { ComposedPrompt, PromptCompositionInput } from '../../../types/prompt.js';
import type { BrandAnalysis, AudienceAnalysis } from '../../../types/intelligence.js';
import type { VideoPlatform } from '../../../types/video.js';
import { promptOptimizationService } from './PromptOptimizationService.js';
import { negativePromptService } from './NegativePromptService.js';

const PLATFORM_SPECS: Record<VideoPlatform, { aspect: string; pace: string; hook: string }> = {
  TikTok: { aspect: '9:16', pace: 'fast-paced', hook: 'attention-grabbing opening' },
  Instagram: { aspect: '9:16', pace: 'aesthetic', hook: 'visual hook' },
  YouTube: { aspect: '16:9', pace: 'informative', hook: 'strong opening statement' },
  Facebook: { aspect: '16:9', pace: 'story-driven', hook: 'relatable opening' },
  Pinterest: { aspect: '9:16', pace: 'inspirational', hook: 'aesthetic visual' },
};

/**
 * Composes a single optimized prompt from every intelligence source:
 * product, brand, audience, platform, template, blocks, custom text and
 * render settings — then optimizes it and attaches a negative prompt.
 */
export class PromptCompositionService {
  async compose(input: PromptCompositionInput): Promise<ComposedPrompt> {
    const startedAt = Date.now();

    const components = {
      product: '',
      brand: '',
      audience: '',
      platform: '',
      template: '',
      campaign: '',
      blocks: [] as string[],
      custom: input.customInstructions ?? '',
      settings: '',
    };

    if (input.productId) {
      components.product = await this.productComponent(input.productId, input.workspaceId);
    }
    if (input.brandId) {
      components.brand = await this.brandComponent(input.brandId);
    }
    if (input.audienceId) {
      components.audience = await this.audienceComponent(input.audienceId);
    }
    if (input.platform) {
      components.platform = this.platformComponent(input.platform as VideoPlatform);
    }
    if (input.templateId) {
      components.template = await this.templateComponent(input.templateId);
    }
    if (input.blockIds && input.blockIds.length > 0) {
      const blocks = await promptBlockRepository.findByIds(input.blockIds);
      components.blocks = blocks.map((b) => b.promptFragment);
    }
    if (input.videoSettings) {
      components.settings = this.settingsComponent(input.videoSettings);
    }

    const rawPrompt = this.assemble(components);
    const optimized = promptOptimizationService.optimize(rawPrompt, { preserveQuality: true });
    const negative = negativePromptService.generate({
      platform: input.platform as VideoPlatform | undefined,
      quality: input.videoSettings?.quality,
    });

    const tokenCount = promptOptimizationService.estimateTokens(optimized.optimizedPrompt);
    const duration = input.videoSettings?.duration ?? 10;
    const qualityScore = this.qualityScore(components, tokenCount);

    return {
      id: `composed-${Date.now()}`,
      prompt: optimized.optimizedPrompt,
      negativePrompt: negative.combined,
      safetyPrompt: negative.safetyPrompt,
      components,
      metadata: {
        tokenCount,
        estimatedCost: Number((tokenCount * 0.0001 * (duration / 10)).toFixed(4)),
        estimatedDuration: duration,
        qualityScore,
        compositionTime: Date.now() - startedAt,
      },
      createdAt: new Date(),
    };
  }

  private async productComponent(productId: string, workspaceId: string): Promise<string> {
    const analysis = await productAnalysisRepository.findByProductAndWorkspace(productId, workspaceId);
    if (!analysis) return '';
    const parts: string[] = [];
    if (analysis.productType) parts.push(`${analysis.productType} product`);
    if (analysis.vibe) parts.push(`${analysis.vibe} style`);
    const colors = analysis.dominantColors ?? [];
    if (colors.length > 0) parts.push(`featuring colors: ${colors.join(', ')}`);
    const keywords = analysis.keywords ?? [];
    if (keywords.length > 0) parts.push(`keywords: ${keywords.slice(0, 5).join(', ')}`);
    return parts.join(', ');
  }

  private async brandComponent(brandId: string): Promise<string> {
    const brand = await brandRepository.findById(brandId);
    if (!brand) return '';
    const analysis = (brand.analysis ?? {}) as unknown as BrandAnalysis;
    const parts: string[] = [];
    if (brand.name) parts.push(`${brand.name} brand aesthetic`);
    const colors = brand.colors ?? [];
    if (colors.length > 0) parts.push(`brand colors: ${colors.join(', ')}`);
    if (analysis.visualStyle) parts.push(`${analysis.visualStyle} visual style`);
    if (brand.tone) parts.push(`${brand.tone} tone`);
    return parts.join(', ');
  }

  private async audienceComponent(audienceId: string): Promise<string> {
    const audience = await audienceRepository.findById(audienceId);
    if (!audience) return '';
    const analysis = (audience.analysis ?? {}) as unknown as AudienceAnalysis;
    const parts: string[] = [];
    parts.push(`targeting ${audience.ageGroup} ${audience.gender}`);
    const interests = audience.interests ?? [];
    if (interests.length > 0) parts.push(`interests: ${interests.slice(0, 3).join(', ')}`);
    if (analysis.preferredVideoPace) parts.push(`${analysis.preferredVideoPace} pace`);
    return parts.join(', ');
  }

  private platformComponent(platform: VideoPlatform): string {
    const spec = PLATFORM_SPECS[platform];
    return `${platform} format, ${spec.aspect} aspect ratio, ${spec.pace}, ${spec.hook}`;
  }

  private async templateComponent(templateId: string): Promise<string> {
    const template = await videoTemplateRepository.findById(templateId);
    return template?.basePromptTemplate ?? '';
  }

  private settingsComponent(settings: PromptCompositionInput['videoSettings']): string {
    if (!settings) return '';
    const parts: string[] = [];
    if (settings.resolution) parts.push(`${settings.resolution}p resolution`);
    if (settings.cameraMotion) parts.push(`${settings.cameraMotion} camera movement`);
    if (settings.lighting) parts.push(`${settings.lighting} lighting`);
    if (settings.quality) parts.push(`${settings.quality} quality`);
    return parts.join(', ');
  }

  private assemble(components: ComposedPrompt['components']): string {
    const ordered = [
      components.template,
      components.product,
      components.brand,
      components.audience,
      components.platform,
      components.campaign,
      ...components.blocks,
      components.settings,
      components.custom,
    ];
    return ordered
      .map((s) => s.trim())
      .filter((s) => s.length > 0)
      .join('. ')
      .replace(/\.\s*\./g, '.')
      .replace(/\s+/g, ' ')
      .trim();
  }

  private qualityScore(components: ComposedPrompt['components'], tokenCount: number): number {
    let score = 40;
    const filled = [
      components.product,
      components.brand,
      components.audience,
      components.platform,
      components.template,
      components.settings,
      components.custom,
    ].filter((s) => s.length > 0).length;
    score += filled * 6;
    score += components.blocks.length * 3;
    if (tokenCount > 80) score += 5;
    return Math.min(100, score);
  }
}

export const promptCompositionService = new PromptCompositionService();