import { BaseVideoProvider } from '../base/BaseVideoProvider.js';
import type {
  ProviderConfig,
  ProviderGenerationInput,
  ProviderGenerationOutput,
  ProviderJobStatus,
  ProviderHealth,
} from '../../../types/providers.js';
import { withTimeout } from '../../../utils/timeout.js';

const REQUEST_TIMEOUT_MS = 30_000;

export class PikaAdapter extends BaseVideoProvider {
  readonly name = 'Pika' as const;

  readonly config: ProviderConfig = {
    name: 'Pika',
    displayName: 'Pika Labs',
    tier: 'Standard',
    baseUrl: 'https://api.pika.art/v1',
    apiKeyEnvVar: 'PIKA_API_KEY',
    supportedModels: ['pika-1.0', 'pika-1.5'],
    defaultModel: 'pika-1.5',
    maxDuration: 4,
    supportedAspectRatios: ['9:16', '1:1', '16:9'],
    supportedResolutions: ['720', '1080'],
    pricing: {
      baseCostPerSecond: 0.03,
      costPerGeneration: 0.15,
      resolutionMultipliers: { '720': 0.8, '1080': 1.0, '2K': 1.5, '4K': 2.0 },
      qualityMultipliers: { Draft: 0.6, Standard: 1.0, High: 1.3, Ultra: 1.7 },
      currency: 'USD',
    },
    rateLimits: { requestsPerMinute: 10, requestsPerHour: 150, concurrentJobs: 3, maxQueueSize: 15 },
    features: {
      textToVideo: true,
      imageToVideo: true,
      videoToVideo: true,
      supportsNegativePrompt: true,
      supportsCameraControl: true,
      supportsAudio: false,
      supportsLipSync: false,
      maxFps: 24,
      minDuration: 2,
      maxDuration: 4,
    },
    priority: 35,
    isActive: true,
  };

  async generateVideo(input: ProviderGenerationInput): Promise<ProviderGenerationOutput> {
    this.validateInput(input);
    const url = `${this.config.baseUrl}/generate`;
    const payload: Record<string, unknown> = {
      prompt: input.prompt,
      negative_prompt: input.negativePrompt,
      duration: Math.min(input.settings.duration, this.config.maxDuration),
      aspect_ratio: input.settings.aspectRatio,
      guidance_scale: 12,
      motion: this.mapMotion(input.settings.cameraMotion),
    };
    if (input.imageUrl) payload.image_url = input.imageUrl;

    try {
      const response = await withTimeout(
        () => fetch(url, { method: 'POST', headers: this.buildHeaders(input.apiKey), body: JSON.stringify(payload) }),
        REQUEST_TIMEOUT_MS,
        'Pika generate'
      );
      if (!response.ok) {
        const text = await response.text();
        throw new Error(`HTTP ${response.status}: ${text}`);
      }
      const json = (await response.json()) as { id: string };
      return { externalJobId: json.id, status: 'Queued', provider: this.name, model: input.model };
    } catch (error) {
      throw this.handleError(error, 'generateVideo');
    }
  }

  async checkStatus(externalJobId: string): Promise<ProviderJobStatus> {
    try {
      const response = await withTimeout(
        () => fetch(`${this.config.baseUrl}/generations/${externalJobId}`, { headers: this.buildHeaders(process.env.PIKA_API_KEY ?? '') }),
        15_000,
        'Pika status'
      );
      if (!response.ok) return 'Failed';
      const json = (await response.json()) as { status: string };
      switch (json.status) {
        case 'queued':
          return 'Queued';
        case 'processing':
          return 'Processing';
        case 'completed':
          return 'Completed';
        case 'failed':
          return 'Failed';
        default:
          return 'Processing';
      }
    } catch {
      return 'Failed';
    }
  }

  async cancelJob(_externalJobId: string): Promise<boolean> {
    return false;
  }

  async getResult(externalJobId: string): Promise<ProviderGenerationOutput | null> {
    try {
      const response = await withTimeout(
        () => fetch(`${this.config.baseUrl}/generations/${externalJobId}`, { headers: this.buildHeaders(process.env.PIKA_API_KEY ?? '') }),
        15_000,
        'Pika result'
      );
      if (!response.ok) return null;
      const json = (await response.json()) as { status: string; video_url?: string; duration?: number };
      if (json.status === 'completed' && json.video_url) {
        return { externalJobId, status: 'Completed', videoUrl: json.video_url, duration: json.duration, provider: this.name, model: 'pika-1.5' };
      }
      return null;
    } catch {
      return null;
    }
  }

  async healthCheck(): Promise<ProviderHealth> {
    const start = Date.now();
    try {
      const response = await withTimeout(
        () => fetch(`${this.config.baseUrl}/health`, { headers: this.buildHeaders(process.env.PIKA_API_KEY ?? '') }),
        10_000,
        'Pika health'
      );
      const health = this.defaultHealth(response.ok ? 'Available' : 'Degraded');
      return { ...health, averageResponseTime: Date.now() - start, lastChecked: new Date() };
    } catch {
      return { ...this.defaultHealth('Unavailable'), lastChecked: new Date(), lastFailure: new Date(), consecutiveFailures: 1 };
    }
  }

  private mapMotion(motion?: string): number {
    if (!motion) return 2;
    const map: Record<string, number> = { Static: 1, Pan: 2, Zoom: 3, Orbit: 3 };
    return map[motion] ?? 2;
  }
}