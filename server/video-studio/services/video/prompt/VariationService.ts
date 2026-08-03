import type { MultiVariationResult, PromptVariation, VariationType } from '../../../types/prompt.js';
import { promptOptimizationService } from './PromptOptimizationService.js';
import { negativePromptService } from './NegativePromptService.js';

const CONSERVATIVE_SUFFIX = 'clean, professional, well-lit, product-focused';
const BALANCED_SUFFIX = 'professional quality, well-composed, visually appealing, engaging';
const CREATIVE_SUFFIX = 'artistic vision, unique perspective, creative composition, striking, memorable, innovative, bold';

export interface VariationContext {
  productId?: string;
  brandId?: string;
  audienceId?: string;
}

/**
 * Produces three prompt variations (Conservative / Balanced / Creative)
 * and recommends one based on context.
 */
export class VariationService {
  generate(basePrompt: string, negativePrompt: string | undefined, context: VariationContext = {}): MultiVariationResult {
    const negative = negativePrompt ?? negativePromptService.generate().combined;

    const variations: PromptVariation[] = [
      this.buildVariation('Conservative', basePrompt, negative, CONSERVATIVE_SUFFIX, 20),
      this.buildVariation('Balanced', basePrompt, negative, BALANCED_SUFFIX, 50),
      this.buildVariation('Creative', basePrompt, negative, CREATIVE_SUFFIX, 85),
    ];

    const recommended = this.recommend(context);
    return {
      variations,
      recommended,
      reasoning: this.reasoning(recommended, variations),
    };
  }

  private buildVariation(
    type: VariationType,
    basePrompt: string,
    negative: string,
    suffix: string,
    creativity: number
  ): PromptVariation {
    const optimized = promptOptimizationService.optimize(`${basePrompt}. ${suffix}`, { preserveQuality: true });
    const prompt = optimized.optimizedPrompt;
    const tokens = promptOptimizationService.estimateTokens(prompt);

    const creativityMultiplier = 1 + creativity / 200;
    const estimatedCost = Number((tokens * 0.0001 * creativityMultiplier).toFixed(4));
    const estimatedQuality = Math.min(100, 60 + creativity / 2);

    return {
      type,
      prompt,
      negativePrompt: negative,
      creativityLevel: creativity,
      estimatedCost,
      estimatedQuality: Math.round(estimatedQuality),
      reasoning: this.variationReasoning(type),
    };
  }

  private variationReasoning(type: VariationType): string {
    if (type === 'Conservative') return 'Optimized for reliability and cost efficiency. Safe, predictable results.';
    if (type === 'Balanced') return 'Balanced creativity with good quality-to-cost ratio.';
    return 'High creativity with artistic flair. Best for standout content.';
  }

  private recommend(context: VariationContext): VariationType {
    if (context.brandId && !context.audienceId) return 'Conservative';
    if (context.audienceId) return 'Balanced';
    if (!context.brandId && !context.audienceId && !context.productId) return 'Creative';
    return 'Balanced';
  }

  private reasoning(recommended: VariationType, variations: PromptVariation[]): string {
    const v = variations.find((x) => x.type === recommended);
    if (!v) return 'Balanced approach recommended for general use.';
    return `Recommended: ${recommended}. ${v.reasoning} Estimated quality: ${v.estimatedQuality}%, cost: $${v.estimatedCost}`;
  }
}

export const variationService = new VariationService();