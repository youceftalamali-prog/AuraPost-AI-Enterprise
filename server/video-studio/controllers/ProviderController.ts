import type { Request } from 'express';
import { getRequestContext } from './context.js';
import {
  providerManagerService,
  providerHealthService,
  providerStatisticsService,
  providerSettingsService,
  providerCostService,
  providerRouterService,
} from '../services/video/providers/index.js';
import { ApiError } from '../middleware/errorHandler.js';
import type { CompareCostDTO, SelectProviderDTO, UpdateProviderSettingsDTO } from '../types/api.js';
import type { VideoProviderName, VideoGenerationSettings } from '../types/video.js';
import type { ProviderGenerationInput } from '../types/providers.js';

export class ProviderController {
  async list(req: Request) {
    const activeOnly = req.query.activeOnly !== 'false';
    const providers = await providerManagerService.listProviders(activeOnly);
    return { success: true, data: providers };
  }

  async getHealth(_req: Request) {
    const health = await providerHealthService.getAllHealth();
    return { success: true, data: health };
  }

  async getProviderHealth(req: Request) {
    const { provider } = req.params;
    const health = await providerHealthService.getHealth(provider as VideoProviderName);
    return { success: true, data: health };
  }

  async getStatistics(req: Request) {
    const period = (req.query.period as string) ?? 'all';
    const { provider } = req.params;
    if (provider) {
      const stats = await providerStatisticsService.getStatistics(provider as VideoProviderName, period);
      return { success: true, data: stats };
    }
    const stats = await providerStatisticsService.getAllStatistics(period);
    return { success: true, data: stats };
  }

  async getSettings(req: Request) {
    const ctx = getRequestContext(req);
    const settings = await providerSettingsService.getSafeSettings(ctx.workspaceId);
    return { success: true, data: settings };
  }

  async updateSettings(req: Request) {
    const ctx = getRequestContext(req);
    const dto = req.body as UpdateProviderSettingsDTO;
    const settings = await providerSettingsService.updateSettings(ctx.workspaceId, dto);
    return { success: true, data: { ...settings, apiKeys: undefined } };
  }

  async compareCost(req: Request) {
    const ctx = getRequestContext(req);
    const dto = req.body as CompareCostDTO;
    if (!dto.prompt || !dto.settings) throw ApiError.badRequest('prompt and settings are required');

    const input = this.buildInput(ctx.workspaceId, ctx.userId, dto.prompt, dto.settings);
    const result = providerCostService.compare(input, dto.providers as VideoProviderName[] | undefined);
    return { success: true, data: result };
  }

  async select(req: Request) {
    const ctx = getRequestContext(req);
    const dto = req.body as SelectProviderDTO;
    if (!dto.prompt || !dto.settings) throw ApiError.badRequest('prompt and settings are required');

    const input = this.buildInput(ctx.workspaceId, ctx.userId, dto.prompt, dto.settings);
    const criteria = dto.criteria ?? { prioritize: 'balanced' as const };
    const decision = await providerRouterService.route(input, criteria);
    return { success: true, data: decision };
  }

  async test(req: Request) {
    const { provider } = req.body as { provider: VideoProviderName };
    if (!provider) throw ApiError.badRequest('provider is required');
    const result = await providerManagerService.testProvider(provider);
    return { success: true, data: result };
  }

  private buildInput(
    workspaceId: string,
    userId: string,
    prompt: string,
    settings: VideoGenerationSettings
  ): ProviderGenerationInput {
    return {
      prompt,
      model: '',
      settings,
      apiKey: '',
      workspaceId,
      userId,
    };
  }
}

export const providerController = new ProviderController();