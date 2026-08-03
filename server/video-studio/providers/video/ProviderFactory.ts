import type { IVideoProviderAdapter } from '../../types/providers.js';
import type { VideoProviderName } from '../../types/video.js';
import { providerRegistry } from './ProviderRegistry.js';

/**
 * Factory for obtaining provider adapter instances from the registry.
 * Kept separate so callers can depend on creation without touching the
 * registry's mutation surface.
 */
class ProviderFactory {
  create(name: VideoProviderName): IVideoProviderAdapter {
    return providerRegistry.getOrThrow(name);
  }

  createMany(names: VideoProviderName[]): IVideoProviderAdapter[] {
    return names.map((name) => providerRegistry.getOrThrow(name));
  }

  createAllActive(): IVideoProviderAdapter[] {
    return providerRegistry.getActive();
  }

  createByTier(tier: string): IVideoProviderAdapter[] {
    return providerRegistry.getAll().filter((p) => p.config.tier === tier);
  }

  createByPriority(): IVideoProviderAdapter[] {
    return providerRegistry.getAll().sort((a, b) => a.config.priority - b.config.priority);
  }

  exists(name: VideoProviderName): boolean {
    return providerRegistry.has(name);
  }

  availableNames(): VideoProviderName[] {
    return providerRegistry.getNames();
  }
}

export const providerFactory = new ProviderFactory();