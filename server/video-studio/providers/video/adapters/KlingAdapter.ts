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

export class KlingAdapter extends BaseVideoProvider {
  readonly name = 'Kling' as const;

  readonly config: ProviderConfig = {
    name: 'Kling',
    displayName: 'Kling AI',
    tier: 'Premium',
    baseUrl: 'https://api.klingai.com/v1',
    apiKeyEnvVar: 'KLING_API_KEY',
    supportedModels: ['kling-v1', 'kling-v1-5', 'kling-v1-6'],
    defaultModel: 'kling-v1-6',
    maxDuration: 10,
    supportedAspectRatios: ['9:16', '1:1', '16:9'],
    supportedResolutions: ['720', '1080'],
    pricing: {
      baseCostPerSecond: 0.04,
      costPerGeneration: 0.2,
      resolutionMultipliers: { '720': 0.8, '1080': 1.0, '2K': 1.5, '4K': 2.0 },
      qualityMultipliers: { Draft: 0.6, Standard: 1.0, High: 1.3, Ultra: 1.8 },
      currency: 'USD',
    },
    rateLimits: { requestsPerMinute: 15, requestsPerHour: 300, concurrentJobs: 5, maxQueueSize: 30 },
    features: {
      textToVideo: true,
      imageToVideo: true,
      videoToVideo: false,
      supportsNegativePrompt: true,
      supportsCameraControl: true,
      supportsAudio: false,
      supportsLipSync: true,
      maxFps: 30,
      minDuration: 5,
      maxDuration: 10,
    },
    priority: 25,
    isActive: true,
  };

  async generateVideo(input: ProviderGenerationInput): Promise<ProviderGenerationOutput> {
    this.validateInput(input);
    const endpoint = input.imageUrl ? '/videos/image2video' : '/videos/text2video';
    const url = `${this.config.baseUrl}${endpoint}`;
    const payload: Record<string, unknown> = {
      model: input.model,
      prompt: input.prompt,
      negative_prompt: input.negativePrompt,
      duration: Math.min(input.settings.duration, this.config.maxDuration),
      aspect_ratio: input.settings.aspectRatio,
      mode: input.settings.quality === 'Ultra' ? 'professional' : 'standard',
    };
    if (input.imageUrl) payload.image = input.imageUrl;
    if (input.settings.cameraMotion) payload.camera_control = { type: this.mapCameraMotion(input.settings.cameraMotion) };

    try {
      const response = await withTimeout(
        () => fetch(url, { method: 'POST', headers: this.buildHeaders(input.apiKey), body: JSON.stringify(payload) }),
        REQUEST_TIMEOUT_MS,
        'Kling generate'
      );
      if (!response.ok) {
        const text = await response.text();
        throw new Error(`HTTP ${response.status}: ${text}`);
      }
      const json = (await response.json()) as { data?: { task_id?: string } };
      return { externalJobId: json.data?.task_id ?? `kling-${Date.now()}`, status: 'Queued', provider: this.name, model: input.model };
    } catch (error) {
      throw this.handleError(error, 'generateVideo');
    }
  }

  async checkStatus(externalJobId: string): Promise<ProviderJobStatus> {
    try {
      const response = await withTimeout(
        () => fetch(`${this.config.baseUrl}/videos/text2video/${externalJobId}`, { headers: this.buildHeaders(process.env.KLING_API_KEY ?? '') }),
        15_000,
        'Kling status'
      );
      if (!response.ok) return 'Failed';
      const json = (await response.json()) as { data?: { task_status?: string } };
      switch (json.data?.task_status) {
        case 'submitted':
        case 'queued':
          return 'Queued';
        case 'processing':
          return 'Processing';
        case 'succeed':
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
        () => fetch(`${this.config.baseUrl}/videos/text2video/${externalJobId}`, { headers: this.buildHeaders(process.env.KLING_API_KEY ?? '') }),
        15_000,
        'Kling result'
      );
      if (!response.ok) return null;
      const json = (await response.json()) as {
        data?: { task_status?: string; task_result?: { videos?: Array<{ url?: string; duration?: number }> } };
      };
      const videos = json.data?.task_result?.videos;
      if (json.data?.task_status === 'succeed' && videos && videos.length > 0 && videos[0].url) {
        return {
          externalJobId,
          status: 'Completed',
          videoUrl: videos[0].url,
          duration: videos[0].duration,
          provider: this.name,
          model: 'kling-v1-6',
        };
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
        () => fetch(`${this.config.baseUrl}/videos/text2video`, { headers: this.buildHeaders(process.env.KLING_API_KEY ?? '') }),
        10_000,
        'Kling health'
      );
      const health = this.defaultHealth(response.status !== 500 ? 'Available' : 'Degraded');
      return { ...health, averageResponseTime: Date.now() - start, lastChecked: new Date() };
    } catch {
      return { ...this.defaultHealth('Unavailable'), lastChecked: new Date(), lastFailure: new Date(), consecutiveFailures: 1 };
    }
  }

  private mapCameraMotion(motion: string): string {
    const map: Record<string, string> = { Static: 'static', Pan: 'horizontal', Zoom: 'zoom', Orbit: 'rotate' };
    return map[motion] ?? 'static';
  }
}