import { providerRepository } from '../../../repositories/ProviderRepository.js';
import { providerRegistry } from '../../../providers/video/ProviderRegistry.js';
import type { ProviderSettingsRecord } from '../../../types/entities.js';
import type { VideoProviderName } from '../../../types/video.js';
import type { UpdateProviderSettingsDTO } from '../../../types/api.js';
import { maskSecret } from '../../../utils/sanitize.js';

const DEFAULT_CHAIN: VideoProviderName[] = ['Runway', 'Wan', 'Kling', 'Veo', 'HuggingFace', 'Pika', 'Luma'];

/**
 * Per-workspace provider configuration: default provider, auto-routing,
 * fallback chain, cost ceiling and API keys.
 */
export class ProviderSettingsService {
  async getSettings(workspaceId: string): Promise<ProviderSettingsRecord> {
    const existing = await providerRepository.findSettings(workspaceId);
    if (existing) return existing;
    return providerRepository.upsertSettings(workspaceId, {
      autoRouting: true,
      defaultProvider: 'HuggingFace',
      fallbackEnabled: true,
      fallbackChain: DEFAULT_CHAIN,
      maxCostPerVideo: '1.00',
      preferredQuality: 'High',
      apiKeys: {},
      customPriorities: {},
      excludedProviders: [],
    });
  }

  async updateSettings(workspaceId: string, dto: UpdateProviderSettingsDTO): Promise<ProviderSettingsRecord> {
    const current = await this.getSettings(workspaceId);

    const apiKeys = dto.apiKeys ? { ...(current.apiKeys as Record<string, string>), ...dto.apiKeys } : undefined;

    return providerRepository.upsertSettings(workspaceId, {
      defaultProvider: dto.defaultProvider ?? current.defaultProvider,
      autoRouting: dto.autoRouting ?? current.autoRouting,
      fallbackEnabled: dto.fallbackEnabled ?? current.fallbackEnabled,
      fallbackChain: dto.fallbackChain ?? (current.fallbackChain as VideoProviderName[]),
      maxCostPerVideo: dto.maxCostPerVideo !== undefined ? String(dto.maxCostPerVideo) : current.maxCostPerVideo,
      preferredQuality: dto.preferredQuality ?? current.preferredQuality,
      apiKeys,
      customPriorities: dto.customPriorities ?? (current.customPriorities as Record<string, number>),
      excludedProviders: dto.excludedProviders ?? (current.excludedProviders as VideoProviderName[]),
    });
  }

  /**
   * Resolves the API key for a provider: workspace override first, then
   * the environment variable declared by the adapter config.
   */
  async getApiKey(workspaceId: string, provider: VideoProviderName): Promise<string> {
    const settings = await providerRepository.findSettings(workspaceId);
    const keys = (settings?.apiKeys ?? {}) as Record<string, string>;
    if (keys[provider]) return keys[provider];

    const adapter = providerRegistry.get(provider);
    if (adapter) return process.env[adapter.config.apiKeyEnvVar] ?? '';
    return '';
  }

  async getFallbackChain(workspaceId: string): Promise<VideoProviderName[]> {
    const settings = await this.getSettings(workspaceId);
    const chain = (settings.fallbackChain as VideoProviderName[]) ?? [];
    return chain.length > 0 ? chain : DEFAULT_CHAIN;
  }

  /** Returns settings with API keys masked, safe for API responses. */
  async getSafeSettings(workspaceId: string): Promise<ProviderSettingsRecord> {
    const settings = await this.getSettings(workspaceId);
    const keys = (settings.apiKeys ?? {}) as Record<string, string>;
    const masked: Record<string, string> = {};
    for (const [provider, key] of Object.entries(keys)) {
      masked[provider] = maskSecret(key);
    }
    return { ...settings, apiKeys: masked };
  }
}

export const providerSettingsService = new ProviderSettingsService();