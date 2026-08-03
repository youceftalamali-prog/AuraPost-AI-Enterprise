import { providerRegistry } from '../../../providers/video/ProviderRegistry.js';
import { providerRepository } from '../../../repositories/ProviderRepository.js';
import { getBreaker } from '../../../utils/circuitBreaker.js';
import { withRetry } from '../../../utils/retry.js';
import { withTimeout } from '../../../utils/timeout.js';
import type {
  ProviderGenerationInput,
  ProviderGenerationOutput,
  ProviderTestResult,
  IVideoProviderAdapter,
} from '../../../types/providers.js';
import type { VideoProviderName } from '../../../types/video.js';
import type { VideoProviderRecord } from '../../../types/entities.js';
import { providerHealthService } from './ProviderHealthService.js';
import { providerSettingsService } from './ProviderSettingsService.js';
import { providerRouterService } from './ProviderRouterService.js';

const GENERATION_TIMEOUT_MS = 120_000;

/**
 * Facade over the provider fleet: lists providers, tests them, and runs
 * generation through the fallback chain with circuit breaker + retry +
 * timeout protection.
 */
export class ProviderManagerService {
  async listProviders(activeOnly = true): Promise<VideoProviderRecord[]> {
    const records = await providerRepository.findAllProviders(activeOnly);
    if (records.length > 0) return records;
    // Fall back to the in-code registry if the table is not seeded yet.
    return providerRegistry.getAll().map((a) => a.config as unknown as VideoProviderRecord);
  }

  async testProvider(provider: VideoProviderName): Promise<ProviderTestResult> {
    const adapter = providerRegistry.get(provider);
    if (!adapter) {
      return { provider, success: false, responseTime: 0, message: 'Provider not registered', testedAt: new Date() };
    }
    const start = Date.now();
    try {
      const health = await withTimeout(() => adapter.healthCheck(), 10_000, `${provider} health check`);
      const ok = health.status === 'Available' || health.status === 'Degraded';
      return {
        provider,
        success: ok,
        responseTime: Date.now() - start,
        message: `Provider is ${health.status}`,
        details: { availability: health.availability, successRate: health.successRate },
        testedAt: new Date(),
      };
    } catch (error) {
      return {
        provider,
        success: false,
        responseTime: Date.now() - start,
        message: error instanceof Error ? error.message : 'Health check failed',
        testedAt: new Date(),
      };
    }
  }

  /**
   * Runs generation across the fallback chain. Each provider call is
   * wrapped in a circuit breaker, retry (transient only) and timeout.
   */
  async generateWithFallback(
    input: ProviderGenerationInput,
    chain: VideoProviderName[]
  ): Promise<ProviderGenerationOutput> {
    const errors: Array<{ provider: VideoProviderName; error: string }> = [];

    for (const providerName of chain) {
      const adapter = providerRegistry.get(providerName);
      if (!adapter) continue;

      const apiKey = await providerSettingsService.getApiKey(input.workspaceId, providerName);
      if (!apiKey) {
        errors.push({ provider: providerName, error: 'No API key configured' });
        continue;
      }

      const breaker = getBreaker(providerName);
      try {
        const output = await breaker.exec(() =>
          withRetry(
            () => withTimeout(() => adapter.generateVideo({ ...input, apiKey }), GENERATION_TIMEOUT_MS, `${providerName} generate`),
            { maxAttempts: 2 }
          )
        );
        await providerHealthService.recordSuccess(providerName);
        return output;
      } catch (error) {
        await providerHealthService.recordFailure(providerName);
        errors.push({ provider: providerName, error: error instanceof Error ? error.message : 'Generation failed' });
      }
    }

    const summary = errors.map((e) => `${e.provider}: ${e.error}`).join('; ');
    throw new Error(`All providers failed — ${summary}`);
  }

  async selectAdapter(provider: VideoProviderName): Promise<IVideoProviderAdapter> {
    return providerRegistry.getOrThrow(provider);
  }

  getDefaultChain(): VideoProviderName[] {
    return providerRouterService.getDefaultChain();
  }
}

export const providerManagerService = new ProviderManagerService();