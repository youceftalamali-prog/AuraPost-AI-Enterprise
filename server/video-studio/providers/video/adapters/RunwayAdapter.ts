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

export class RunwayAdapter extends BaseVideoProvider {
  readonly name = 'Runway' as const;

  readonly config: ProviderConfig = {
    name: 'Runway',
    displayName: 'Runway ML',
    tier: 'Premium',
    baseUrl: 'https://api.dev.runwayml.com/v1',
    apiKeyEnvVar: 'RUNWAY_API_KEY',
    supportedModels: ['gen3-alpha', 'gen3-alpha-turbo', 'gen2'],
    defaultModel: 'gen3-alpha',
    maxDuration: 16,
    supportedAspectRatios: ['9:16', '1:1', '16:9'],
    supportedResolutions: ['720', '1080', '2K'],
    pricing: {
      baseCostPerSecond: 0.05,
      costPerGeneration: 0.25,
      resolutionMultipliers: { '720': 0.8, '1080': 1.0, '2K': 1.5, '4K': 2.5 },
      qualityMultipliers: { Draft: 0.6, Standard: 1.0, High: 1.4, Ultra: 2.0 },
      currency: 'USD',
    },
    rateLimits: { requestsPerMinute: 10, requestsPerHour: 200, concurrentJobs: 3, maxQueueSize: 20 },
    features: {
      textToVideo: true,
      imageToVideo: true,
      videoToVideo: true,
      supportsNegativePrompt: false,
      supportsCameraControl: true,
      supportsAudio: false,
      supportsLipSync: false,
      maxFps: 30,
      minDuration: 4,
      maxDuration: 16,
    },
    priority: 20,
    isActive: true,
  };

  async generateVideo(input: ProviderGenerationInput): Promise<ProviderGenerationOutput> {
    this.validateInput(input);
    const endpoint = input.imageUrl ? '/image_to_video' : '/text_to_video';
    const url = `${this.config.baseUrl}${endpoint}`;

    const payload: Record<string, unknown> = {
      model: input.model,
      promptText: input.prompt,
      duration: Math.min(input.settings.duration, this.config.maxDuration),
      ratio: input.settings.aspectRatio,
    };
    if (input.imageUrl) payload.promptImage = input.imageUrl;
    if (input.settings.cameraMotion) payload.cameraMotion = this.mapCameraMotion(input.settings.cameraMotion);

    try {
      const response = await withTimeout(
        () =>
          fetch(url, {
            method: 'POST',
            headers: this.buildHeaders(input.apiKey, { 'X-Runway-Version': '2024-11-06' }),
            body: JSON.stringify(payload),
          }),
        REQUEST_TIMEOUT_MS,
        'Runway generate'
      );

      if (!response.ok) {
        const text = await response.text();
        throw new Error(`HTTP ${response.status}: ${text}`);
      }

      const json = (await response.json()) as { id: string };
      return {
        externalJobId: json.id,
        status: 'Queued',
        provider: this.name,
        model: input.model,
        metadata: { createdAt: new Date().toISOString() },
      };
    } catch (error) {
      throw this.handleError(error, 'generateVideo');
    }
  }

  async checkStatus(externalJobId: string): Promise<ProviderJobStatus> {
    try {
      const response = await withTimeout(
        () =>
          fetch(`${this.config.baseUrl}/tasks/${externalJobId}`, {
            headers: this.buildHeaders(process.env.RUNWAY_API_KEY ?? '', { 'X-Runway-Version': '2024-11-06' }),
          }),
        15_000,
        'Runway status'
      );
      if (!response.ok) return 'Failed';
      const json = (await response.json()) as { status: string; output?: string[] };
      switch (json.status) {
        case 'PENDING':
        case 'THROTTLED':
          return 'Queued';
        case 'RUNNING':
          return 'Processing';
        case 'SUCCEEDED':
          return 'Completed';
        case 'FAILED':
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
        () =>
          fetch(`${this.config.baseUrl}/tasks/${externalJobId}`, {
            headers: this.buildHeaders(process.env.RUNWAY_API_KEY ?? '', { 'X-Runway-Version': '2024-11-06' }),
          }),
        15_000,
        'Runway result'
      );
      if (!response.ok) return null;
      const json = (await response.json()) as { status: string; output?: string[] };
      if (json.status === 'SUCCEEDED' && json.output && json.output.length > 0) {
        return {
          externalJobId,
          status: 'Completed',
          videoUrl: json.output[0],
          provider: this.name,
          model: 'gen3-alpha',
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
        () =>
          fetch(`${this.config.baseUrl}/tasks`, {
            headers: this.buildHeaders(process.env.RUNWAY_API_KEY ?? '', { 'X-Runway-Version': '2024-11-06' }),
          }),
        10_000,
        'Runway health'
      );
      const health = this.defaultHealth(response.ok || response.status === 401 ? 'Available' : 'Degraded');
      return { ...health, averageResponseTime: Date.now() - start, lastChecked: new Date() };
    } catch {
      return { ...this.defaultHealth('Unavailable'), lastChecked: new Date(), lastFailure: new Date(), consecutiveFailures: 1 };
    }
  }

  private mapCameraMotion(motion: string): string {
    const map: Record<string, string> = { Static: 'static', Pan: 'pan_right', Zoom: 'zoom_in', Orbit: 'orbit_left' };
    return map[motion] ?? 'static';
  }
}