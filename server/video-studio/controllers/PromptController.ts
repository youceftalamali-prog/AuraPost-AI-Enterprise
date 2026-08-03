import type { Request } from 'express';
import { getRequestContext } from './context.js';
import { promptOrchestrationService } from '../services/video/prompt/index.js';
import { ApiError } from '../middleware/errorHandler.js';
import type { ComposePromptDTO, PreviewPromptDTO, VariationsDTO } from '../types/api.js';
import type { VideoProviderName } from '../types/video.js';

export class PromptController {
  async compose(req: Request) {
    const ctx = getRequestContext(req);
    const dto = req.body as ComposePromptDTO;
    if (!dto.productId || !dto.templateId) throw ApiError.badRequest('productId and templateId are required');

    const plan = await promptOrchestrationService.composeAndPreview(
      {
        productId: dto.productId,
        workspaceId: ctx.workspaceId,
        templateId: dto.templateId,
        platform: dto.platform,
        blockIds: dto.blockIds,
        customInstructions: dto.customPrompt,
        videoSettings: dto.videoSettings,
      },
      undefined
    );

    return { success: true, data: plan };
  }

  async preview(req: Request) {
    const dto = req.body as PreviewPromptDTO;
    if (!dto.prompt) throw ApiError.badRequest('prompt is required');

    const preview = promptOrchestrationService.preview(
      dto.prompt,
      dto.negativePrompt,
      dto.provider as VideoProviderName | undefined,
      dto.settings ?? {}
    );

    return { success: true, data: preview };
  }

  async variations(req: Request) {
    const dto = req.body as VariationsDTO;
    if (!dto.prompt) throw ApiError.badRequest('prompt is required');

    const result = promptOrchestrationService.variations(dto.prompt, dto.negativePrompt, {
      productId: dto.context?.productId,
      brandId: dto.context?.brandId,
      audienceId: dto.context?.audienceId,
    });

    return { success: true, data: result };
  }
}

export const promptController = new PromptController();