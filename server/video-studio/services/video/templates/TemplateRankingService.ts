import { videoTemplateRepository } from '../../../repositories/VideoTemplateRepository.js';
import type { VideoTemplate } from '../../../types/entities.js';
import type { TextIntelligenceResult } from '../../../types/intelligence.js';
import type { VideoPlatform } from '../../../types/video.js';

export interface TemplateRankingContext {
  textIntelligence?: TextIntelligenceResult;
  platform?: VideoPlatform;
  maxCost?: number;
  favoriteIds?: string[];
}

export interface RankedTemplate {
  template: VideoTemplate;
  score: number;
  reasoning: string[];
  breakdown: {
    categoryMatch: number;
    styleMatch: number;
    platformMatch: number;
    popularity: number;
    costFit: number;
    favoriteBoost: number;
  };
}

const VIBE_COMPATIBILITY: Record<string, string[]> = {
  Luxury: ['Luxury', 'Cinematic', 'Elegant', 'Premium'],
  Premium: ['Premium', 'Cinematic', 'Modern'],
  Modern: ['Modern', 'Minimal', 'Tech', 'Clean'],
  Casual: ['Lifestyle', 'Casual', 'Cozy'],
  Bold: ['Dynamic', 'Bold', 'Vibrant', 'High Energy'],
  Minimal: ['Minimal', 'Clean', 'Modern'],
  Classic: ['Classic', 'Elegant', 'Cinematic'],
  Budget: ['Lifestyle', 'Casual', 'Dynamic'],
};

/**
 * Ranks templates for a specific product/context using a weighted score
 * over category, style, platform, popularity, cost fit and favorites.
 */
export class TemplateRankingService {
  async rankForProduct(category: string, context: TemplateRankingContext, limit = 10): Promise<RankedTemplate[]> {
    const candidates = await videoTemplateRepository.findByCategory(category, true);
    const pool = candidates.length > 0 ? candidates : await videoTemplateRepository.findAll(true);
    return this.rank(pool, context, limit);
  }

  rank(templates: VideoTemplate[], context: TemplateRankingContext, limit = 10): RankedTemplate[] {
    const text = context.textIntelligence;
    const vibe = text?.vibe;
    const compatibleStyles = vibe ? VIBE_COMPATIBILITY[vibe] ?? [] : [];
    const favoriteSet = new Set(context.favoriteIds ?? []);

    const ranked: RankedTemplate[] = templates.map((template) => {
      const reasoning: string[] = [];

      const categoryMatch = text?.category ? this.categoryScore(template, text.category) : 50;
      if (categoryMatch >= 80) reasoning.push(`Matches category: ${template.category}`);

      const styleMatch = this.styleScore(template, compatibleStyles);
      if (styleMatch >= 70) reasoning.push(`Style fits ${vibe} vibe`);

      const platformMatch = this.platformScore(template, context.platform);
      if (platformMatch >= 80 && context.platform) reasoning.push(`Optimized for ${context.platform}`);

      const popularity = Math.max(0, Math.min(100, template.popularity));
      if (popularity >= 80) reasoning.push('Highly popular');

      const costFit = this.costScore(template, context.maxCost);
      if (context.maxCost !== undefined && costFit >= 80) reasoning.push('Within budget');

      const favoriteBoost = favoriteSet.has(template.id) ? 100 : 0;
      if (favoriteBoost > 0) reasoning.push('In your favorites');

      const score = Math.round(
        categoryMatch * 0.3 +
          styleMatch * 0.25 +
          platformMatch * 0.15 +
          popularity * 0.15 +
          costFit * 0.1 +
          favoriteBoost * 0.05
      );

      return {
        template,
        score,
        reasoning,
        breakdown: { categoryMatch, styleMatch, platformMatch, popularity, costFit, favoriteBoost },
      };
    });

    return ranked.sort((a, b) => b.score - a.score).slice(0, limit);
  }

  private categoryScore(template: VideoTemplate, category: string): number {
    if (template.category === category) return 100;
    if (template.subcategory && template.subcategory.toLowerCase() === category.toLowerCase()) return 80;
    return 20;
  }

  private styleScore(template: VideoTemplate, compatibleStyles: string[]): number {
    if (!template.style || compatibleStyles.length === 0) return 50;
    return compatibleStyles.includes(template.style) ? 100 : 40;
  }

  private platformScore(template: VideoTemplate, platform?: VideoPlatform): number {
    if (!platform) return 50;
    if (!template.platform) return 60;
    return template.platform === platform ? 100 : 40;
  }

  private costScore(template: VideoTemplate, maxCost?: number): number {
    if (maxCost === undefined) return 70;
    const cost = parseFloat(template.estimatedCost);
    if (Number.isNaN(cost)) return 60;
    if (cost <= maxCost) return 100;
    if (cost <= maxCost * 1.25) return 60;
    return 20;
  }
}

export const templateRankingService = new TemplateRankingService();