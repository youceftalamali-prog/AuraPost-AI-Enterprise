import {
  videoTemplateRepository,
  type TemplateFilter,
  type TemplateSortField,
} from '../../../repositories/VideoTemplateRepository.js';
import type { VideoTemplate } from '../../../types/entities.js';

export interface TemplateSearchParams {
  filter?: TemplateFilter;
  sortBy?: TemplateSortField;
  sortOrder?: 'asc' | 'desc';
  limit?: number;
  offset?: number;
}

/**
 * Catalog access for video templates: search, browse, categories and
 * per-user favorites. Ranking lives in TemplateRankingService.
 */
export class TemplateLibraryService {
  async search(params: TemplateSearchParams): Promise<{ items: VideoTemplate[]; total: number }> {
    return videoTemplateRepository.query({
      filter: params.filter,
      sortBy: params.sortBy ?? 'popularity',
      sortOrder: params.sortOrder ?? 'desc',
      limit: params.limit ?? 50,
      offset: params.offset ?? 0,
    });
  }

  async getById(id: string): Promise<VideoTemplate | null> {
    return videoTemplateRepository.findById(id);
  }

  async getByIds(ids: string[]): Promise<VideoTemplate[]> {
    return videoTemplateRepository.findByIds(ids);
  }

  async getByCategory(category: string, limit = 50): Promise<VideoTemplate[]> {
    const all = await videoTemplateRepository.findByCategory(category, true);
    return all.slice(0, limit);
  }

  async getCategories(): Promise<Array<{ category: string; count: number }>> {
    return videoTemplateRepository.getCategories();
  }

  async getTrending(limit = 20): Promise<VideoTemplate[]> {
    const { items } = await videoTemplateRepository.query({
      sortBy: 'popularity',
      sortOrder: 'desc',
      limit,
    });
    return items;
  }

  async getNewest(limit = 20): Promise<VideoTemplate[]> {
    const { items } = await videoTemplateRepository.query({
      sortBy: 'createdAt',
      sortOrder: 'desc',
      limit,
    });
    return items;
  }

  // ---------- Favorites ----------
  async listFavorites(userId: string): Promise<VideoTemplate[]> {
    return videoTemplateRepository.getUserFavorites(userId);
  }

  async isFavorite(userId: string, templateId: string): Promise<boolean> {
    return videoTemplateRepository.isFavorite(userId, templateId);
  }

  async toggleFavorite(userId: string, templateId: string): Promise<boolean> {
    const exists = await videoTemplateRepository.findById(templateId);
    if (!exists) throw new Error('Template not found');

    const isFav = await videoTemplateRepository.isFavorite(userId, templateId);
    if (isFav) {
      await videoTemplateRepository.removeFavorite(userId, templateId);
      return false;
    }
    await videoTemplateRepository.addFavorite(userId, templateId);
    return true;
  }
}

export const templateLibraryService = new TemplateLibraryService();