import type { ComposedPrompt, MultiVariationResult, PromptPreviewResult, PromptCompositionInput } from '../../../types/prompt.js';
import type { VideoGenerationSettings, VideoProviderName } from '../../../types/video.js';
import { promptCompositionService } from './PromptCompositionService.js';
import { promptPreviewService } from './PromptPreviewService.js';
import { variationService, type VariationContext } from './VariationService.js';

export interface PromptPlan {
  composed: ComposedPrompt;
  preview: PromptPreviewResult;
}

/**
 * Top-level prompt orchestration: compose → preview → variations.
 * Controllers call this single facade instead of individual services.
 */
export class PromptOrchestrationService {
  async composeAndPreview(input: PromptCompositionInput, provider?: VideoProviderName): Promise<PromptPlan> {
    const composed = await promptCompositionService.compose(input);
    const preview = promptPreviewService.preview({
      prompt: composed.prompt,
      negativePrompt: composed.negativePrompt,
      provider,
      settings: input.videoSettings,
      breakdown: {
        productContribution: composed.components.product ? 20 : 0,
        brandContribution: composed.components.brand ? 15 : 0,
        audienceContribution: composed.components.audience ? 15 : 0,
        platformContribution: composed.components.platform ? 15 : 0,
        templateContribution: composed.components.template ? 20 : 0,
        blocksContribution: composed.components.blocks.length > 0 ? 10 : 0,
      },
    });
    return { composed, preview };
  }

  variations(prompt: string, negativePrompt: string | undefined, context: VariationContext = {}): MultiVariationResult {
    return variationService.generate(prompt, negativePrompt, context);
  }

  preview(
    prompt: string,
    negativePrompt: string | undefined,
    provider: VideoProviderName | undefined,
    settings: Partial<VideoGenerationSettings>
  ): PromptPreviewResult {
    return promptPreviewService.preview({ prompt, negativePrompt, provider, settings });
  }
}

export const promptOrchestrationService = new PromptOrchestrationService();