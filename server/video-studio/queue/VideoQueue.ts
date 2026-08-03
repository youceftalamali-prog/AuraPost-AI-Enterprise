import { providerRepository } from '../repositories/ProviderRepository.js';
import { videoHistoryRepository } from '../repositories/VideoHistoryRepository.js';
import { providerManagerService } from '../services/video/providers/ProviderManagerService.js';
import { providerStatisticsService } from '../services/video/providers/ProviderStatisticsService.js';
import { providerSettingsService } from '../services/video/providers/ProviderSettingsService.js';
import { videoCacheService } from '../cache/VideoCacheService.js';
import { createVideoLogger } from '../utils/videoLogger.js';
import type { VideoGenerationSettings, VideoProviderName } from '../types/video.js';
import type { ProviderGenerationInput } from '../types/providers.js';
import type { ProviderJobRecord } from '../types/entities.js';
import { DatabaseManager } from '../../db.js';

const logger = createVideoLogger('VideoQueue');

const POLL_INTERVAL_MS = 5000;
const BATCH_SIZE = 5;
const MAX_RETRIES = 3;

/**
 * Background worker that processes queued video generation jobs.
 *
 * Flow per job:
 *   1. Mark Processing
 *   2. Check content-hash cache → hit? serve cached video (cost 0)
 *   3. Run generation through the provider fallback chain
 *      (circuit breaker + retry + timeout live inside ProviderManager)
 *   4. On success: persist result, cache it, write history, record stats
 *   5. On failure: retry up to MAX_RETRIES, then mark Failed
 *
 * The worker is disabled when VIDEO_QUEUE_ENABLED=false so the API can
 * run standalone (e.g. in tests).
 */
class VideoQueue {
  private running = false;
  private timer: NodeJS.Timeout | null = null;
  private processing = new Set<string>();

  start(): void {
    if (this.running) return;
    if (process.env.VIDEO_QUEUE_ENABLED === 'false') {
      logger.info('Video queue disabled (VIDEO_QUEUE_ENABLED=false)');
      return;
    }
    this.running = true;
    logger.info('Video queue worker started', { pollIntervalMs: POLL_INTERVAL_MS, batchSize: BATCH_SIZE });
    this.scheduleNext();
  }

  stop(): void {
    this.running = false;
    if (this.timer) {
      clearTimeout(this.timer);
      this.timer = null;
    }
    logger.info('Video queue worker stopped');
  }

  private scheduleNext(): void {
    if (!this.running) return;
    this.timer = setTimeout(() => void this.poll(), POLL_INTERVAL_MS);
    this.timer.unref?.();
  }

  private async poll(): Promise<void> {
    try {
      const jobs = await providerRepository.findPendingJobs(BATCH_SIZE);
      const pending = jobs.filter((j) => !this.processing.has(j.id));
      if (pending.length > 0) {
        logger.info(`Processing ${pending.length} job(s)`);
        await Promise.all(pending.map((job) => this.processJob(job.id)));
      }
    } catch (error) {
      logger.error('Queue poll error', error as Error);
    } finally {
      this.scheduleNext();
    }
  }

  private async processJob(jobId: string): Promise<void> {
    if (this.processing.has(jobId)) return;
    this.processing.add(jobId);
    const startedAt = Date.now();

    try {
      const job = await providerRepository.findJobById(jobId);
      if (!job) {
        logger.warn('Job not found', { jobId });
        return;
      }
      if (job.status !== 'Queued') {
        logger.warn('Job not in Queued state', { jobId, status: job.status });
        return;
      }

      await providerRepository.updateJobStatus(jobId, 'Processing');

      const settings = (job.settings as unknown as VideoGenerationSettings) ?? ({} as VideoGenerationSettings);
      const chain = (await providerSettingsService.getFallbackChain(job.workspaceId)) as VideoProviderName[];

      // 1. Content-hash cache check
      const cachePayload = {
        prompt: job.prompt,
        negativePrompt: job.negativePrompt ?? undefined,
        imageUrl: undefined,
        settings,
        provider: job.provider,
        model: job.model,
      };
      const cacheHash = videoCacheService.generateHash(cachePayload);
      const cached = await videoCacheService.lookup(cacheHash);

      if (cached.hit && cached.entry) {
        await videoCacheService.recordHit(cached.entry.id);
        await providerRepository.updateJobStatus(jobId, 'Completed', {
          resultUrl: cached.entry.videoUrl,
          thumbnailUrl: cached.entry.thumbnailUrl,
          progress: 100,
          cacheHash,
          actualCost: '0',
        });
        await this.saveHistory(job, cached.entry.videoUrl, cached.entry.thumbnailUrl ?? null);
        logger.info('Job served from cache', { jobId });
        return;
      }

      // 2. Generate through fallback chain
      const input: ProviderGenerationInput = {
        prompt: job.prompt,
        negativePrompt: job.negativePrompt ?? undefined,
        imageUrl: undefined,
        model: job.model,
        settings,
        apiKey: '',
        workspaceId: job.workspaceId,
        userId: job.userId,
      };

      const output = await providerManagerService.generateWithFallback(input, chain);

      // Deduct AuraPost credits for the actual cost incurred (cache hits above
      // are free and already returned before reaching this point).
      const actualCost = Math.max(0, Math.ceil(output.cost ?? 0));
      if (actualCost > 0) {
        const dbManager = await DatabaseManager.getInstance();
        await dbManager.consumeCredits(
          job.workspaceId,
          'video',
          actualCost,
          'video_consume',
          job.id,
          `Video generation via ${job.provider}`
        );
      }

      // 3. Persist success
      await providerRepository.updateJobStatus(jobId, 'Completed', {
        resultUrl: output.videoUrl ?? null,
        thumbnailUrl: output.thumbnailUrl ?? null,
        progress: 100,
        actualCost: String(output.cost ?? 0),
        cacheHash,
      });

      if (output.videoUrl) {
        await videoCacheService.store(cachePayload, {
          videoUrl: output.videoUrl,
          thumbnailUrl: output.thumbnailUrl,
          duration: output.duration,
          cost: output.cost,
        });
      }

      await this.saveHistory(job, output.videoUrl ?? null, output.thumbnailUrl ?? null);

      const generationTime = Math.round((Date.now() - startedAt) / 1000);
      await providerStatisticsService.recordJobCompletion({
        provider: output.provider,
        success: true,
        duration: output.duration ?? settings.duration ?? 10,
        cost: output.cost ?? 0,
        generationTime,
        workspaceId: job.workspaceId,
      });

      logger.info('Job completed', { jobId, provider: output.provider, cost: output.cost });
    } catch (error) {
      logger.error('Job failed', error as Error, { jobId });
      await this.handleFailure(jobId, error as Error);
    } finally {
      this.processing.delete(jobId);
    }
  }

  private async handleFailure(jobId: string, error: Error): Promise<void> {
    const job = await providerRepository.findJobById(jobId);
    if (!job) return;

    const retryCount = await providerRepository.incrementJobRetry(jobId);

    if (retryCount < MAX_RETRIES) {
      await providerRepository.updateJobStatus(jobId, 'Queued', {
        errorMessage: error.message,
        progress: 0,
      });
      logger.info('Job re-queued for retry', { jobId, retryCount });
    } else {
      await providerRepository.updateJobStatus(jobId, 'Failed', { errorMessage: error.message });
      await providerStatisticsService.recordJobCompletion({
        provider: job.provider as VideoProviderName,
        success: false,
        duration: 0,
        cost: 0,
        generationTime: 0,
        workspaceId: job.workspaceId,
      });
      logger.error('Job permanently failed', undefined, { jobId, retryCount });
    }
  }

  private async saveHistory(
    job: ProviderJobRecord,
    videoUrl: string | null,
    thumbnailUrl: string | null
  ): Promise<void> {
    if (!videoUrl) return;
    await videoHistoryRepository.create({
      jobId: job.id,
      userId: job.userId,
      workspaceId: job.workspaceId,
      productId: job.productId,
      templateId: job.templateId,
      videoUrl,
      thumbnailUrl,
      title: `Video ${new Date().toISOString().slice(0, 10)}`,
      description: job.prompt.slice(0, 200),
      tags: [],
      platform: null,
      provider: job.provider,
      estimatedCost: job.estimatedCost,
      isFavorite: false,
      isPublished: false,
      publishedAt: null,
    });
  }
}

export const videoQueue = new VideoQueue();