import type {
  IVideoProviderAdapter,
  ProviderConfig,
  ProviderGenerationInput,
  ProviderGenerationOutput,
  ProviderJobStatus,
  ProviderHealth,
  ProviderCostEstimate,
} from '../../../types/providers.js';
import type { VideoProviderName } from '../../../types/video.js';

/**
 * Shared behavior for every video provider adapter: cost calculation,
 * header building, input validation and error normalization. Concrete
 * adapters implement the network-facing methods.
 */
export abstract class BaseVideoProvider implements IVideoProviderAdapter {
  abstract readonly name: VideoProviderName;
  abstract readonly config: ProviderConfig;

  abstract generateVideo(input: ProviderGenerationInput): Promise<ProviderGenerationOutput>;
  abstract checkStatus(externalJobId: string): Promise<ProviderJobStatus>;
  abstract cancelJob(externalJobId: string): Promise<boolean>;
  abstract getResult(externalJobId: string): Promise<ProviderGenerationOutput | null>;
  abstract healthCheck(): Promise<ProviderHealth>;

  async isAvailable(): Promise<boolean> {
    try {
      const health = await this.healthCheck();
      return health.status === 'Available' || health.status === 'Degraded';
    } catch {
      return false;
    }
  }

  calculateCost(input: ProviderGenerationInput): ProviderCostEstimate {
    const pricing = this.config.pricing;
    const duration = input.settings.duration;
    const resolution = input.settings.resolution;
    const quality = input.settings.quality;

    const baseCost = pricing.costPerGeneration;
    const durationCost = duration * pricing.baseCostPerSecond;
    const resolutionMultiplier = pricing.resolutionMultipliers[resolution] ?? 1.0;
    const qualityMultiplier = pricing.qualityMultipliers[quality] ?? 1.0;
    const total = (baseCost + durationCost) * resolutionMultiplier * qualityMultiplier;

    return {
      provider: this.name,
      model: input.model,
      estimatedCost: Number(total.toFixed(4)),
      currency: pricing.currency,
      breakdown: {
        baseCost,
        durationCost,
        resolutionMultiplier,
        qualityMultiplier,
        total: Number(total.toFixed(4)),
      },
      estimatedTime: this.estimateGenerationTime(input),
      confidence: 0.85,
    };
  }

  protected estimateGenerationTime(input: ProviderGenerationInput): number {
    const base = 30;
    const durationFactor = input.settings.duration / 10;
    const qualityFactor =
      input.settings.quality === 'Ultra' ? 3 : input.settings.quality === 'High' ? 2 : input.settings.quality === 'Draft' ? 0.5 : 1;
    return Math.round(base * durationFactor * qualityFactor);
  }

  protected buildHeaders(apiKey: string, extra: Record<string, string> = {}): Record<string, string> {
    return {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
      ...extra,
    };
  }

  protected validateInput(input: ProviderGenerationInput): void {
    if (!input.prompt || input.prompt.trim().length === 0) {
      throw new Error('Prompt is required');
    }
    if (!input.apiKey) {
      throw new Error(`API key not configured for ${this.name}`);
    }
    if (input.settings.duration > this.config.maxDuration) {
      throw new Error(`Duration ${input.settings.duration}s exceeds max ${this.config.maxDuration}s for ${this.name}`);
    }
    if (!this.config.supportedAspectRatios.includes(input.settings.aspectRatio)) {
      throw new Error(`Aspect ratio ${input.settings.aspectRatio} not supported by ${this.name}`);
    }
  }

  protected handleError(error: unknown, context: string): Error {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return new Error(`${this.name} ${context}: ${message}`);
  }

  protected defaultHealth(status: ProviderHealth['status']): ProviderHealth {
    return {
      provider: this.name,
      status,
      availability: status === 'Available' ? 100 : status === 'Degraded' ? 70 : 0,
      averageResponseTime: 0,
      successRate: status === 'Unavailable' ? 0 : 100,
      failureRate: status === 'Unavailable' ? 100 : 0,
      currentQueueSize: 0,
      lastChecked: new Date(),
      consecutiveFailures: 0,
      uptime: status === 'Unavailable' ? 0 : 100,
    };
  }

  protected resolveDimensions(settings: { resolution: string; aspectRatio: string }): { width: number; height: number } {
    const baseHeight =
      settings.resolution === '4K' ? 2160 : settings.resolution === '2K' ? 1440 : settings.resolution === '1080' ? 1080 : 720;
    const [arW, arH] = settings.aspectRatio.split(':').map(Number);
    const ratio = arW / arH;
    let width = Math.round(baseHeight * ratio);
    width = Math.round(width / 8) * 8;
    const height = Math.round(baseHeight / 8) * 8;
    return { width, height };
  }
}