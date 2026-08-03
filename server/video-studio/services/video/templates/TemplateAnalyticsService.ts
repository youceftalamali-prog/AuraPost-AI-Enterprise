import { videoTemplateRepository } from '../../../repositories/VideoTemplateRepository.js';
import { videoHistoryRepository } from '../../../repositories/VideoHistoryRepository.js';
import type { VideoTemplate } from '../../../types/entities.js';

export type TemplateUsageType = 'view' | 'select' | 'use';

/**
 * Tracks template usage. Popularity is incremented on real usage so the
 * marketplace ranking reflects actual demand over time.
 */
export class TemplateAnalyticsService {
  async recordUsage(templateId: string, type: TemplateUsageType): Promise<void> {
    if (type === 'use') {
      await videoTemplateRepository.incrementPopularity(templateId);
    }
  }

  async getTopTemplates(limit = 10): Promise<VideoTemplate[]> {
    const { items } = await videoTemplateRepository.query({
      sortBy: 'popularity',
      sortOrder: 'desc',
      limit,
    });
    return items;
  }

  async getRecentlyUsed(userId: string, workspaceId: string, limit = 10): Promise<VideoTemplate[]> {
    const { items } = await videoHistoryRepository.query({ userId, workspaceId, limit: 50 });
    const seen = new Set<string>();
    const templates: VideoTemplate[] = [];
    for (const entry of items) {
      if (!entry.templateId || seen.has(entry.templateId)) continue;
      seen.add(entry.templateId);
      const template = await videoTemplateRepository.findById(entry.templateId);
      if (template) templates.push(template);
      if (templates.length >= limit) break;
    }
    return templates;
  }
}

export const templateAnalyticsService = new TemplateAnalyticsService();