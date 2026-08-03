import { providerRepository } from '../../../repositories/ProviderRepository.js';
import { providerRegistry } from '../../../providers/video/ProviderRegistry.js';
import { providerHealthCache } from '../../../cache/optimizedCache.js';
import type { ProviderHealth } from '../../../types/providers.js';
import type { VideoProviderName } from '../../../types/video.js';

const CACHE_TTL_MS = 60_000;

/**
 * Tracks provider health. Reads are served from an in-memory cache and
 * refreshed from the adapter's live health check on miss/expiry.
 */
export class ProviderHealthService {
  async getHealth(provider: VideoProviderName): Promise<ProviderHealth> {
    const cached = providerHealthCache.get(provider) as ProviderHealth | undefined;
    if (cached) return cached;

    const adapter = providerRegistry.get(provider);
    if (!adapter) {
      return this.unavailable(provider);
    }

    try {
      const health = await adapter.healthCheck();
      providerHealthCache.set(provider, health, CACHE_TTL_MS);
      await this.persist(provider, health);
      return health;
    } catch {
      const health = this.unavailable(provider);
      providerHealthCache.set(provider, health, CACHE_TTL_MS);
      return health;
    }
  }

  async getAllHealth(): Promise<ProviderHealth[]> {
    const names = providerRegistry.getNames();
    const results: ProviderHealth[] = [];
    for (const name of names) {
      results.push(await this.getHealth(name));
    }
    return results;
  }

  async recordSuccess(provider: VideoProviderName): Promise<void> {
    const current = await this.getHealth(provider);
    const updated: ProviderHealth = {
      ...current,
      status: 'Available',
      successRate: Math.min(100, current.successRate + 1),
      failureRate: Math.max(0, current.failureRate - 0.5),
      consecutiveFailures: 0,
      lastSuccess: new Date(),
      lastChecked: new Date(),
    };
    providerHealthCache.set(provider, updated, CACHE_TTL_MS);
    await this.persist(provider, updated);
  }

  async recordFailure(provider: VideoProviderName): Promise<void> {
    const current = await this.getHealth(provider);
    const consecutiveFailures = current.consecutiveFailures + 1;
    const status: ProviderHealth['status'] =
      consecutiveFailures >= 5 ? 'Unavailable' : consecutiveFailures >= 3 ? 'Degraded' : current.status;

    const updated: ProviderHealth = {
      ...current,
      status,
      failureRate: Math.min(100, current.failureRate + 2),
      successRate: Math.max(0, current.successRate - 1),
      consecutiveFailures,
      lastFailure: new Date(),
      lastChecked: new Date(),
    };
    providerHealthCache.set(provider, updated, CACHE_TTL_MS);
    await this.persist(provider, updated);
  }

  private async persist(provider: VideoProviderName, health: ProviderHealth): Promise<void> {
    try {
      await providerRepository.upsertHealth(provider, {
        status: health.status,
        availability: String(health.availability),
        averageResponseTime: health.averageResponseTime,
        successRate: String(health.successRate),
        failureRate: String(health.failureRate),
        currentQueueSize: health.currentQueueSize,
        lastSuccess: health.lastSuccess ?? null,
        lastFailure: health.lastFailure ?? null,
        consecutiveFailures: health.consecutiveFailures,
        uptime: String(health.uptime),
      });
    } catch {
      // Persistence is best-effort; cache remains authoritative for reads.
    }
  }

  private unavailable(provider: VideoProviderName): ProviderHealth {
    return {
      provider,
      status: 'Unavailable',
      availability: 0,
      averageResponseTime: 0,
      successRate: 0,
      failureRate: 100,
      currentQueueSize: 0,
      lastChecked: new Date(),
      consecutiveFailures: 0,
      uptime: 0,
    };
  }
}

export const providerHealthService = new ProviderHealthService();