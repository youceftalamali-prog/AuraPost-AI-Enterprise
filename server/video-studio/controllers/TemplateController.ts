import type { Request } from 'express';
import { getRequestContext } from './context.js';
import {
  templateLibraryService,
  templateRankingService,
  templateAnalyticsService,
} from '../services/video/templates/index.js';
import { productAnalysisRepository } from '../repositories/ProductAnalysisRepository.js';
import { ApiError } from '../middleware/errorHandler.js';
import type { TemplateSortField } from '../repositories/VideoTemplateRepository.js';
import type { VideoPlatform } from '../types/video.js';

export class TemplateController {
  async search(req: Request) {
    const { category, subcategory, style, platform, difficulty, search, sortBy, sortOrder, limit, offset } = req.query as Record<
      string,
      string | undefined
    >;

    const result = await templateLibraryService.search({
      filter: { category, subcategory, style, platform, difficulty, search, activeOnly: true },
      sortBy: (sortBy as TemplateSortField) ?? 'popularity',
      sortOrder: sortOrder === 'asc' ? 'asc' : 'desc',
      limit: limit ? Number(limit) : 50,
      offset: offset ? Number(offset) : 0,
    });

    return { success: true, data: result };
  }

  async getById(req: Request) {
    const { id } = req.params;
    const template = await templateLibraryService.getById(id);
    if (!template) throw ApiError.notFound('Template not found');
    await templateAnalyticsService.recordUsage(id, 'view');
    return { success: true, data: template };
  }

  async getCategories(_req: Request) {
    const categories = await templateLibraryService.getCategories();
    return { success: true, data: categories };
  }

  async getByCategory(req: Request) {
    const { category } = req.params;
    const limit = req.query.limit ? Number(req.query.limit) : 50;
    const templates = await templateLibraryService.getByCategory(category, limit);
    return { success: true, data: templates };
  }

  async getTrending(req: Request) {
    const limit = req.query.limit ? Number(req.query.limit) : 20;
    const templates = await templateLibraryService.getTrending(limit);
    return { success: true, data: templates };
  }

  async getNewest(req: Request) {
    const limit = req.query.limit ? Number(req.query.limit) : 20;
    const templates = await templateLibraryService.getNewest(limit);
    return { success: true, data: templates };
  }

  async getRecommended(req: Request) {
    const ctx = getRequestContext(req);
    const { productId } = req.params;
    const platform = req.query.platform as VideoPlatform | undefined;
    const limit = req.query.limit ? Number(req.query.limit) : 10;

    const analysis = await productAnalysisRepository.findByProductAndWorkspace(productId, ctx.workspaceId);
    const favorites = await templateLibraryService.listFavorites(ctx.userId);

    const ranked = await templateRankingService.rankForProduct(
      analysis?.category ?? 'General',
      {
        textIntelligence: analysis
          ? {
              category: analysis.category ?? 'General',
              subcategory: 'General',
              productType: analysis.productType ?? 'General',
              targetAudience: analysis.targetAudience ? [analysis.targetAudience] : [],
              marketingAngle: (analysis.recommendedStyles as string[]) ?? [],
              emotionalTriggers: [],
              painPoints: [],
              benefits: [],
              luxuryScore: analysis.luxuryScore,
              viralScore: analysis.viralScore,
              vibe: (analysis.vibe as never) ?? 'Modern',
              ctaSuggestions: [],
              keywords: (analysis.keywords as string[]) ?? [],
              language: 'en',
              confidence: 0.8,
              analysisMethod: 'rule-based',
            }
          : undefined,
        platform,
        favoriteIds: favorites.map((f) => f.id),
      },
      limit
    );

    return { success: true, data: ranked };
  }

  async listFavorites(req: Request) {
    const ctx = getRequestContext(req);
    const favorites = await templateLibraryService.listFavorites(ctx.userId);
    return { success: true, data: favorites };
  }

  async toggleFavorite(req: Request) {
    const ctx = getRequestContext(req);
    const { id } = req.params;
    const isFavorite = await templateLibraryService.toggleFavorite(ctx.userId, id);
    return { success: true, data: { templateId: id, isFavorite } };
  }
}

export const templateController = new TemplateController();