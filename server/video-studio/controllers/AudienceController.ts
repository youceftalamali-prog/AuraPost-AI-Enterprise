import type { Request } from 'express';
import { getRequestContext } from './context.js';
import { audienceRepository } from '../repositories/AudienceRepository.js';
import { audienceIntelligenceService } from '../services/video/brand/index.js';
import { ApiError } from '../middleware/errorHandler.js';
import type { CreateAudienceDTO } from '../types/api.js';

export class AudienceController {
  async list(req: Request) {
    const ctx = getRequestContext(req);
    const audiences = await audienceRepository.findByWorkspace(ctx.workspaceId);
    return { success: true, data: audiences };
  }

  async getById(req: Request) {
    const { id } = req.params;
    const audience = await audienceRepository.findById(id);
    if (!audience) throw ApiError.notFound('Audience not found');
    return { success: true, data: audience };
  }

  async create(req: Request) {
    const ctx = getRequestContext(req);
    const dto = req.body as CreateAudienceDTO;
    if (!dto.name) throw ApiError.badRequest('Audience name is required');
    if (!dto.ageGroup || !dto.gender) throw ApiError.badRequest('ageGroup and gender are required');

    const audience = await audienceRepository.create({
      workspaceId: ctx.workspaceId,
      name: dto.name,
      ageGroup: dto.ageGroup,
      gender: dto.gender,
      interests: dto.interests ?? [],
      buyingIntent: dto.buyingIntent ?? 'Medium',
      incomeLevel: dto.incomeLevel ?? 'Mixed',
      lifestyle: dto.lifestyle ?? [],
      location: dto.location ?? [],
      language: dto.language ?? null,
      analysis: {},
    });

    return { success: true, data: audience };
  }

  async update(req: Request) {
    const { id } = req.params;
    const dto = req.body as Partial<CreateAudienceDTO>;
    const audience = await audienceRepository.update(id, { ...dto });
    if (!audience) throw ApiError.notFound('Audience not found');
    return { success: true, data: audience };
  }

  async analyze(req: Request) {
    const { id } = req.params;
    const result = await audienceIntelligenceService.analyze(id);
    return { success: true, data: result };
  }

  async remove(req: Request) {
    const { id } = req.params;
    const deleted = await audienceRepository.delete(id);
    if (!deleted) throw ApiError.notFound('Audience not found');
    return { success: true, data: { deleted: true } };
  }
}

export const audienceController = new AudienceController();