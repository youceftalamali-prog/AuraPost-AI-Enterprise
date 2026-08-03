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

export class VeoAdapter extends BaseVideoProvider {
  readonly name = 'Veo' as const;

  readonly config: ProviderConfig = {
    name: 'Veo',
    displayName: 'Google Veo',
    tier: 'Enterprise',
    baseUrl: 'https://generativelanguage.googleapis.com/v1beta',
    apiKeyEnvVar: 'GOOGLE_AI_API_KEY',
    supportedModels: ['veo-2', 'veo-1'],
    defaultModel: 'veo-2',
    maxDuration: 8,
    supportedAspectRatios: ['9:16', '16:9'],
    supportedResolutions: ['720', '1080', '2K', '4K'],
    pricing: {
      baseCostPerSecond: 0.1,
      costPerGeneration: 0.5,
      resolutionMultipliers: { '720': 0.7, '1080': 1.0, '2K': 1.8, '4K': 3.0 },
      qualityMultipliers: { Draft: 0.5, Standard: 1.0, High: 1.5, Ultra: 2.5 },
      currency: 'USD',
    },
    rateLimits: { requestsPerMinute: 5, requestsPerHour: 100, concurrentJobs: 2, maxQueueSize: 10 },
    features: {
      textToVideo: true,
      imageToVideo: true,
      videoToVideo: false,
      supportsNegativePrompt: true,
      supportsCameraControl: true,
      supportsAudio: true,
      supportsLipSync: false,
      maxFps: 30,
      minDuration: 4,
      maxDuration: 8,
    },
    priority: 30,
    isActive: true,
  };

  async generateVideo(input: ProviderGenerationInput): Promise<ProviderGenerationOutput> {
    this.validateInput(input);
    const url = `${this.config.baseUrl}/models/${input.model}:predictLongRunning?key=${input.apiKey}`;
    const payload = {
      instances: [
        {
          prompt: input.prompt,
          image: input.imageUrl ? { bytesBase64Encoded: input.imageUrl } : undefined,
        },
      ],
      parameters: {
        aspectRatio: input.settings.aspectRatio,
        durationSeconds: Math.min(input.settings.duration, this.config.maxDuration),
        negativePrompt: input.negativePrompt,
        personGeneration: 'allow_adult',
      },
    };

    try {
      const response = await withTimeout(
        () => fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) }),
        REQUEST_TIMEOUT_MS,
        'Veo generate'
      );
      if (!response.ok) {
        const text = await response.text();
        throw new Error(`HTTP ${response.status}: ${text}`);
      }
      const json = (await response.json()) as { name: string };
      return { externalJobId: json.name, status: 'Queued', provider: this.name, model: input.model };
    } catch (error) {
      throw this.handleError(error, 'generateVideo');
    }
  }

  async checkStatus(externalJobId: string): Promise<ProviderJobStatus> {
    try {
      const response = await withTimeout(
        () => fetch(`${this.config.baseUrl}/${externalJobId}?key=${process.env.GOOGLE_AI_API_KEY ?? ''}`),
        15_000,
        'Veo status'
      );
      if (!response.ok) return 'Failed';
      const json = (await response.json()) as { done?: boolean; error?: unknown };
      if (json.done) return json.error ? 'Failed' : 'Completed';
      return 'Processing';
    } catch {
      return 'Failed';
    }
  }

  async cancelJob(externalJobId: string): Promise<boolean> {
    try {
      const response = await fetch(`${this.config.baseUrl}/${externalJobId}:cancel?key=${process.env.GOOGLE_AI_API_KEY ?? ''}`, {
        method: 'POST',
      });
      return response.ok;
    } catch {
      return false;
    }
  }

  async getResult(externalJobId: string): Promise<ProviderGenerationOutput | null> {
    try {
      const response = await withTimeout(
        () => fetch(`${this.config.baseUrl}/${externalJobId}?key=${process.env.GOOGLE_AI_API_KEY ?? ''}`),
        15_000,
        'Veo result'
      );
      if (!response.ok) return null;
      const json = (await response.json()) as {
        done?: boolean;
        response?: { generateVideoResponse?: { generatedSamples?: Array<{ video?: { uri?: string } }> } };
      };
      const samples = json.response?.generateVideoResponse?.generatedSamples;
      if (json.done && samples && samples.length > 0 && samples[0].video?.uri) {
        return { externalJobId, status: 'Completed', videoUrl: samples[0].video.uri, provider: this.name, model: 'veo-2' };
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
        () => fetch(`${this.config.baseUrl}/models?key=${process.env.GOOGLE_AI_API_KEY ?? ''}`),
        10_000,
        'Veo health'
      );
      const health = this.defaultHealth(response.ok ? 'Available' : 'Degraded');
      return { ...health, averageResponseTime: Date.now() - start, lastChecked: new Date() };
    } catch {
      return { ...this.defaultHealth('Unavailable'), lastChecked: new Date(), lastFailure: new Date(), consecutiveFailures: 1 };
    }
  }
}