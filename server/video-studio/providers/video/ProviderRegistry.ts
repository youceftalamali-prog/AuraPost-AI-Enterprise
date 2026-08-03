import type { IVideoProviderAdapter } from '../../types/providers.js';
import type { VideoProviderName } from '../../types/video.js';
import { HuggingFaceAdapter } from './adapters/HuggingFaceAdapter.js';
import { RunwayAdapter } from './adapters/RunwayAdapter.js';
import { VeoAdapter } from './adapters/VeoAdapter.js';
import { KlingAdapter } from './adapters/KlingAdapter.js';
import { WanAdapter } from './adapters/WanAdapter.js';
import { PikaAdapter } from './adapters/PikaAdapter.js';
import { LumaAdapter } from './adapters/LumaAdapter.js';

/**
 * Central registry of all video provider adapters. Adding a provider is
 * a single line here; nothing else in the system needs to change.
 */
class ProviderRegistry {
  private providers = new Map<VideoProviderName, IVideoProviderAdapter>();

  constructor() {
    const defaults: IVideoProviderAdapter[] = [
      new HuggingFaceAdapter(),
      new WanAdapter(),
      new KlingAdapter(),
      new RunwayAdapter(),
      new PikaAdapter(),
      new LumaAdapter(),
      new VeoAdapter(),
    ];
    for (const provider of defaults) this.register(provider);
  }

  register(provider: IVideoProviderAdapter): void {
    this.providers.set(provider.name, provider);
  }

  unregister(name: VideoProviderName): void {
    this.providers.delete(name);
  }

  get(name: VideoProviderName): IVideoProviderAdapter | undefined {
    return this.providers.get(name);
  }

  getOrThrow(name: VideoProviderName): IVideoProviderAdapter {
    const provider = this.providers.get(name);
    if (!provider) throw new Error(`Provider not registered: ${name}`);
    return provider;
  }

  getAll(): IVideoProviderAdapter[] {
    return Array.from(this.providers.values());
  }

  getActive(): IVideoProviderAdapter[] {
    return this.getAll().filter((p) => p.config.isActive);
  }

  getNames(): VideoProviderName[] {
    return this.getAll()
      .sort((a, b) => a.config.priority - b.config.priority)
      .map((p) => p.name);
  }

  has(name: VideoProviderName): boolean {
    return this.providers.has(name);
  }
}

export const providerRegistry = new ProviderRegistry();