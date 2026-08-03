import { createHash } from 'node:crypto';
import { videoCacheRepository } from '../repositories/VideoCacheRepository.js';
import type { VideoCacheRecord } from '../types/entities.js';
import type { VideoGenerationSettings } from '../types/video.js';
import { createVideoLogger } from '../utils/videoLogger.js';

const logger = createVideoLogger('VideoCacheService');

export interface CacheablePayload {
  prompt: string;
  negativePrompt?: string;
  imageUrl?: string;
  settings: VideoGenerationSettings;
  provider: string;
  model: string;
}

export interface CacheLookupResult {
  hit: boolean;
  entry?: VideoCacheRecord;
}

/**
 * Persistent video cache keyed by a SHA-256 content hash of the
 * generation inputs. Identical requests return the cached video at zero
 * cost. Distinct from OptimizedCache (in-memory hot cache).
 */
export class VideoCacheService {
  /**
   * Deterministic hash of the generation inputs. Insensitive to prompt
   * casing/whitespace and ignores settings that don't affect output.
   */
  generateHash(payload: CacheablePayload): string {
    const normalized = {
      prompt: payload.prompt.trim().toLowerCase(),
      negativePrompt: (payload.negativePrompt ?? '').trim().toLowerCase(),
      imageUrl: payload.imageUrl ?? '',
      settings: this.normalizeSettings(payload.settings),
      provider: payload.provider,
      model: payload.model,
    };
    const serialized = JSON.stringify(normalized, Object.keys(normalized).sort());
    return createHash('sha256').update(serialized).digest('hex');
  }

  private normalizeSettings(settings: VideoGenerationSettings): Record<string, unknown> {
    const keys = [
      'resolution',
      'aspectRatio',
      'duration',
      'fps',
      'quality',
      'cameraMotion',
      'lighting',
      'background',
      'speed',
      'aiCreativity',
    ];
    const normalized: Record<string, unknown> = {};
    for (const key of keys) {
      const value = (settings as unknown as Record<string, unknown>)[key];
      if (value !== undefined && value !== null) normalized[key] = value;
    }
    return normalized;
  }

  async lookup(cacheHash: string): Promise<CacheLookupResult> {
    const entry = await videoCacheRepository.findByHash(cacheHash);
    if (!entry) return { hit: false };
    return { hit: true, entry };
  }

  async store(
    payload: CacheablePayload,
    output: { videoUrl: string; thumbnailUrl?: string; duration?: number; cost?: number },
    ttlDays = 30
  ): Promise<VideoCacheRecord> {
    const cacheHash = this.generateHash(payload);
    const expiresAt = new Date(Date.now() + ttlDays * 24 * 60 * 60 * 1000);

    const entry = await videoCacheRepository.create({
      cacheHash,
      prompt: payload.prompt,
      settings: payload.settings as unknown as Record<string, unknown>,
      videoUrl: output.videoUrl,
      thumbnailUrl: output.thumbnailUrl ?? null,
      provider: payload.provider,
      model: payload.model,
      duration: output.duration ?? null,
      resolution: payload.settings.resolution,
      cost: String(output.cost ?? 0),
      usageCount: 0,
      lastUsedAt: new Date(),
      expiresAt,
    });

    logger.info('Video cache entry stored', { cacheHash, ttlDays });
    return entry;
  }

  async recordHit(cacheId: string): Promise<void> {
    await videoCacheRepository.incrementUsage(cacheId);
  }

  async invalidate(cacheHash: string): Promise<boolean> {
    return videoCacheRepository.deleteByHash(cacheHash);
  }

  async cleanupExpired(): Promise<number> {
    return videoCacheRepository.cleanupExpired();
  }

  async getStats(): Promise<{ totalEntries: number; totalHits: number; hitRate: number }> {
    return videoCacheRepository.getStats();
  }
}

export const videoCacheService = new VideoCacheService();