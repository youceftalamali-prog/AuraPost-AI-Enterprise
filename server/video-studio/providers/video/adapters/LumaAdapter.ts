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

export class LumaAdapter extends BaseVideoProvider {
  readonly name = 'Luma' as const;

  readonly config: ProviderConfig = {
    name: 'Luma',
    displayName: 'Luma AI',
    tier: 'Premium',
    baseUrl: 'https://api.lumalabs.ai/dream-machine/v1',
    apiKeyEnvVar: 'LUMA_API_KEY',
    supportedModels: ['dream-machine', 'ray-2'],
    defaultModel: 'dream-machine',
    maxDuration: 10,
    supportedAspectRatios: ['9:16', '1:1', '16:9'],
    supportedResolutions: ['720', '1080'],
    pricing: {
      baseCostPerSecond: 0.04,
      costPerGeneration: 0.3,
      resolutionMultipliers: { '720': 0.8, '1080': 1.0, '2K': 1.5, '4K': 2.0 },
      qualityMultipliers: { Draft: 0.6, Standard: 1.0, High: 1.4, Ultra: 1.9 },
      currency: 'USD',
    },
    rateLimits: { requestsPerMinute: 8, requestsPerHour: 120, concurrentJobs: 2, maxQueueSize: 10 },
    features: {
      textToVideo: true,
      imageToVideo: true,
      videoToVideo: false,
      supportsNegativePrompt: false,
      supportsCameraControl: true,
      supportsAudio: false,
      supportsLipSync: false,
      maxFps: 30,
      minDuration: 5,
      maxDuration: 10,
    },
    priority: 40,
    isActive: true,
  };

  async generateVideo(input: ProviderGenerationInput): Promise<ProviderGenerationOutput> {
    this.validateInput(input);
    const url = `${this.config.baseUrl}/generations`;
    const payload: Record<string, unknown> = {
      prompt: input.prompt,
      model: input.model,
      aspect_ratio: input.settings.aspectRatio,
      loop: false,
      enhance_prompt: true,
    };
    if (input.imageUrl) payload.keyframes = { frame0: { type: 'image', url: input.imageUrl } };

    try {
      const response = await withTimeout(
        () => fetch(url, { method: 'POST', headers: this.buildHeaders(input.apiKey), body: JSON.stringify(payload) }),
        REQUEST_TIMEOUT_MS,
        'Luma generate'
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
        () => fetch(`${this.config.baseUrl}/generations/${externalJobId}`, { headers: this.buildHeaders(process.env.LUMA_API_KEY ?? '') }),
        15_000,
        'Luma status'
      );
      if (!response.ok) return 'Failed';
      const json = (await response.json()) as { state: string };
      switch (json.state) {
        case 'queued':
          return 'Queued';
        case 'dreaming':
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

  async cancelJob(externalJobId: string): Promise<boolean> {
    try {
      const response = await fetch(`${this.config.baseUrl}/generations/${externalJobId}`, {
        method: 'DELETE',
        headers: this.buildHeaders(process.env.LUMA_API_KEY ?? ''),
      });
      return response.ok;
    } catch {
      return false;
    }
  }

  async getResult(externalJobId: string): Promise<ProviderGenerationOutput | null> {
    try {
      const response = await withTimeout(
        () => fetch(`${this.config.baseUrl}/generations/${externalJobId}`, { headers: this.buildHeaders(process.env.LUMA_API_KEY ?? '') }),
        15_000,
        'Luma result'
      );
      if (!response.ok) return null;
      const json = (await response.json()) as { state: string; assets?: { video?: string } };
      if (json.state === 'completed' && json.assets?.video) {
        return { externalJobId, status: 'Completed', videoUrl: json.assets.video, provider: this.name, model: 'dream-machine' };
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
        () => fetch(`${this.config.baseUrl}/generations`, { headers: this.buildHeaders(process.env.LUMA_API_KEY ?? '') }),
        10_000,
        'Luma health'
      );
      const health = this.defaultHealth(response.ok || response.status === 401 ? 'Available' : 'Degraded');
      return { ...health, averageResponseTime: Date.now() - start, lastChecked: new Date() };
    } catch {
      return { ...this.defaultHealth('Unavailable'), lastChecked: new Date(), lastFailure: new Date(), consecutiveFailures: 1 };
    }
  }
}