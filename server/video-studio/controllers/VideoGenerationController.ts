import type { Request } from 'express';
import { getRequestContext } from './context.js';
import { providerRepository } from '../repositories/ProviderRepository.js';
import { videoHistoryRepository } from '../repositories/VideoHistoryRepository.js';
import { videoTemplateRepository } from '../repositories/VideoTemplateRepository.js';
import { providerManagerService, providerSettingsService, providerRouterService } from '../services/video/providers/index.js';
import { promptOrchestrationService } from '../services/video/prompt/index.js';
import { templateAnalyticsService } from '../services/video/templates/index.js';
import { ApiError } from '../middleware/errorHandler.js';
import type { GenerateVideoDTO } from '../types/api.js';
import type { VideoProviderName, VideoJobStatus } from '../types/video.js';
import { DatabaseManager } from '../../db.js';

/**
 * Video generation + jobs + history. Generation composes a prompt,
 * routes to a provider chain and queues the render; the queue worker
 * (server/queue) performs the actual provider call.
 */
export class VideoGenerationController {
  async generate(req: Request) {
    const ctx = getRequestContext(req);
    const dto = req.body as GenerateVideoDTO;
    if (!dto.productId || !dto.templateId) throw ApiError.badRequest('productId and templateId are required');

    const template = await videoTemplateRepository.findById(dto.templateId);
    if (!template) throw ApiError.notFound('Template not found');

    const settings = dto.settings;
    const settingsRecord = settings as unknown as Record<string, unknown>;

    // Compose the optimized prompt
    const plan = await promptOrchestrationService.composeAndPreview(
      {
        productId: dto.productId,
        workspaceId: ctx.workspaceId,
        templateId: dto.templateId,
        platform: dto.platform,
        blockIds: dto.blockIds,
        customInstructions: dto.customPrompt,
        videoSettings: settings,
      },
      undefined
    );

    // Resolve provider chain
    const settings2 = await providerSettingsService.getSettings(ctx.workspaceId);
    const chain = settings2.fallbackEnabled
      ? await providerSettingsService.getFallbackChain(ctx.workspaceId)
      : [(settings2.defaultProvider as VideoProviderName)];

    const routingInput = {
      prompt: plan.composed.prompt,
      model: '',
      settings,
      apiKey: '',
      workspaceId: ctx.workspaceId,
      userId: ctx.userId,
    };
    const decision = settings2.autoRouting
      ? await providerRouterService.route(routingInput, { prioritize: 'balanced' })
      : { selectedProvider: settings2.defaultProvider as VideoProviderName, fallbackChain: chain, reasoning: [], scores: {} as never, estimatedCost: plan.preview.estimatedCost, estimatedTime: plan.preview.estimatedDuration };

    // Gate on AuraPost's existing credits system before creating/queuing the job.
    const estimatedCredits = Math.max(1, Math.ceil(decision.estimatedCost));
    const dbManager = await DatabaseManager.getInstance();
    const hasCredits = await dbManager.checkCreditBalance(ctx.workspaceId, estimatedCredits, 'video');
    if (!hasCredits) {
      throw ApiError.forbidden(`Insufficient video credits: this generation requires ${estimatedCredits} credits.`);
    }

    // Create the job row (the queue worker picks it up)
    const job = await providerRepository.createJob({
      provider: decision.selectedProvider,
      externalJobId: null,
      workspaceId: ctx.workspaceId,
      userId: ctx.userId,
      productId: dto.productId,
      templateId: dto.templateId,
      prompt: plan.composed.prompt,
      negativePrompt: plan.composed.negativePrompt,
      model: template.supportedModels[0] ?? '',
      settings: settingsRecord,
      status: 'Queued',
      progress: 0,
      resultUrl: null,
      thumbnailUrl: null,
      duration: settings.duration,
      resolution: settings.resolution,
      aspectRatio: settings.aspectRatio,
      cacheHash: null,
      errorMessage: null,
      retryCount: 0,
      priority: 0,
      estimatedCost: String(plan.preview.estimatedCost),
      actualCost: null,
      startedAt: null,
      completedAt: null,
    });

    await templateAnalyticsService.recordUsage(dto.templateId, 'use');

    return {
      success: true,
      data: {
        jobId: job.id,
        status: job.status,
        provider: decision.selectedProvider,
        fallbackChain: decision.fallbackChain,
        estimatedCost: plan.preview.estimatedCost,
        estimatedDuration: plan.preview.estimatedDuration,
      },
    };
  }

  async listJobs(req: Request) {
    const ctx = getRequestContext(req);
    const status = req.query.status as VideoJobStatus | undefined;
    const provider = req.query.provider as VideoProviderName | undefined;
    const limit = req.query.limit ? Number(req.query.limit) : 50;
    const offset = req.query.offset ? Number(req.query.offset) : 0;

    const result = await providerRepository.queryJobs({ userId: ctx.userId, workspaceId: ctx.workspaceId, status, provider, limit, offset });
    return { success: true, data: result };
  }

  async getJob(req: Request) {
    const { id } = req.params;
    const job = await providerRepository.findJobById(id);
    if (!job) throw ApiError.notFound('Job not found');
    return { success: true, data: job };
  }

  async cancelJob(req: Request) {
    const { id } = req.params;
    const job = await providerRepository.findJobById(id);
    if (!job) throw ApiError.notFound('Job not found');
    if (job.status === 'Completed' || job.status === 'Failed' || job.status === 'Cancelled') {
      throw ApiError.badRequest('Job already finished');
    }
    await providerRepository.updateJobStatus(id, 'Cancelled');
    return { success: true, data: { cancelled: true } };
  }

  async retryJob(req: Request) {
    const { id } = req.params;
    const job = await providerRepository.findJobById(id);
    if (!job) throw ApiError.notFound('Job not found');
    if (job.status !== 'Failed') throw ApiError.badRequest('Only failed jobs can be retried');
    await providerRepository.updateJobStatus(id, 'Queued', { errorMessage: null, progress: 0 });
    return { success: true, data: { retried: true } };
  }

  async listHistory(req: Request) {
    const ctx = getRequestContext(req);
    const favoriteOnly = req.query.favoriteOnly === 'true';
    const platform = req.query.platform as string | undefined;
    const limit = req.query.limit ? Number(req.query.limit) : 50;
    const offset = req.query.offset ? Number(req.query.offset) : 0;

    const result = await videoHistoryRepository.query({ userId: ctx.userId, workspaceId: ctx.workspaceId, favoriteOnly, platform, limit, offset });
    return { success: true, data: result };
  }

  async deleteHistory(req: Request) {
    const ctx = getRequestContext(req);
    const { id } = req.params;
    const deleted = await videoHistoryRepository.delete(id, ctx.userId);
    if (!deleted) throw ApiError.notFound('History entry not found');
    return { success: true, data: { deleted: true } };
  }

  async toggleHistoryFavorite(req: Request) {
    const ctx = getRequestContext(req);
    const { id } = req.params;
    const updated = await videoHistoryRepository.toggleFavorite(id, ctx.userId);
    if (!updated) throw ApiError.notFound('History entry not found');
    return { success: true, data: { id, isFavorite: updated.isFavorite } };
  }
}

export const videoGenerationController = new VideoGenerationController();