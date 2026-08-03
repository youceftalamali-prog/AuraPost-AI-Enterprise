import type { Request } from 'express';
import { getRequestContext } from './context.js';
import { brandRepository } from '../repositories/BrandRepository.js';
import { brandIntelligenceService } from '../services/video/brand/index.js';
import { ApiError } from '../middleware/errorHandler.js';
import type { CreateBrandDTO } from '../types/api.js';

export class BrandController {
  async list(req: Request) {
    const ctx = getRequestContext(req);
    const brands = await brandRepository.findByWorkspace(ctx.workspaceId);
    return { success: true, data: brands };
  }

  async getById(req: Request) {
    const { id } = req.params;
    const brand = await brandRepository.findById(id);
    if (!brand) throw ApiError.notFound('Brand not found');
    return { success: true, data: brand };
  }

  async create(req: Request) {
    const ctx = getRequestContext(req);
    const dto = req.body as CreateBrandDTO;
    if (!dto.name) throw ApiError.badRequest('Brand name is required');

    const brand = await brandRepository.create({
      workspaceId: ctx.workspaceId,
      name: dto.name,
      logoUrl: dto.logoUrl ?? null,
      colors: dto.colors ?? [],
      fonts: dto.fonts ?? [],
      tone: dto.tone ?? null,
      voice: dto.voice ?? null,
      personality: dto.personality ?? [],
      values: dto.values ?? [],
      luxuryLevel: dto.luxuryLevel ?? 50,
      visualIdentity: dto.visualIdentity ?? null,
      writingStyle: dto.writingStyle ?? null,
      ctaStyle: dto.ctaStyle ?? null,
      description: dto.description ?? null,
      website: dto.website ?? null,
      analysis: {},
    });

    return { success: true, data: brand };
  }

  async update(req: Request) {
    const { id } = req.params;
    const dto = req.body as Partial<CreateBrandDTO>;
    const brand = await brandRepository.update(id, { ...dto });
    if (!brand) throw ApiError.notFound('Brand not found');
    return { success: true, data: brand };
  }

  async analyze(req: Request) {
    const { id } = req.params;
    const result = await brandIntelligenceService.analyze(id);
    return { success: true, data: result };
  }

  async remove(req: Request) {
    const { id } = req.params;
    const deleted = await brandRepository.delete(id);
    if (!deleted) throw ApiError.notFound('Brand not found');
    return { success: true, data: { deleted: true } };
  }
}

export const brandController = new BrandController();