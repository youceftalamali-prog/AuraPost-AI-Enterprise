import type { Request } from 'express';
import { getRequestContext } from './context.js';
import { campaignRepository } from '../repositories/CampaignRepository.js';
import { campaignGenerationService } from '../services/video/brand/index.js';
import { productAnalysisRepository } from '../repositories/ProductAnalysisRepository.js';
import { ApiError } from '../middleware/errorHandler.js';
import type { CreateCampaignDTO, GenerateCampaignDTO } from '../types/api.js';
import type { VideoPlatform } from '../types/video.js';

export class CampaignController {
  async list(req: Request) {
    const ctx = getRequestContext(req);
    const campaigns = await campaignRepository.findByWorkspace(ctx.workspaceId);
    return { success: true, data: campaigns };
  }

  async getById(req: Request) {
    const { id } = req.params;
    const campaign = await campaignRepository.findById(id);
    if (!campaign) throw ApiError.notFound('Campaign not found');
    return { success: true, data: campaign };
  }

  async create(req: Request) {
    const ctx = getRequestContext(req);
    const dto = req.body as CreateCampaignDTO;
    if (!dto.name) throw ApiError.badRequest('Campaign name is required');

    const campaign = await campaignRepository.create({
      workspaceId: ctx.workspaceId,
      name: dto.name,
      productId: dto.productId ?? null,
      brandId: dto.brandId ?? null,
      audienceId: dto.audienceId ?? null,
      goal: dto.goal ?? 'Conversion',
      platforms: dto.platforms ?? [],
      status: 'Draft',
      startDate: null,
      endDate: null,
    });

    return { success: true, data: campaign };
  }

  async generate(req: Request) {
    const ctx = getRequestContext(req);
    const { id } = req.params;
    const dto = req.body as GenerateCampaignDTO;
    if (!dto.productId) throw ApiError.badRequest('productId is required');

    const campaign = await campaignRepository.findById(id);
    if (!campaign) throw ApiError.notFound('Campaign not found');

    const analysis = await productAnalysisRepository.findByProductAndWorkspace(dto.productId, ctx.workspaceId);
    const productName = analysis?.category ?? 'Product';
    const productCategory = analysis?.category ?? 'General';

    const result = await campaignGenerationService.generate(
      id,
      ctx.workspaceId,
      productName,
      productCategory,
      (dto.platforms ?? []) as VideoPlatform[]
    );

    return { success: true, data: result };
  }

  async getGenerations(req: Request) {
    const { id } = req.params;
    const generations = await campaignRepository.findGenerationsByCampaign(id);
    return { success: true, data: generations };
  }

  async remove(req: Request) {
    const { id } = req.params;
    await campaignRepository.deleteGenerationsByCampaign(id);
    const deleted = await campaignRepository.delete(id);
    if (!deleted) throw ApiError.notFound('Campaign not found');
    return { success: true, data: { deleted: true } };
  }
}

export const campaignController = new CampaignController();