import { BaseVideoProvider } from '../base/BaseVideoProvider.js';
import type {
  ProviderConfig,
  ProviderGenerationInput,
  ProviderGenerationOutput,
  ProviderJobStatus,
  ProviderHealth,
} from '../../../types/providers.js';
import { withTimeout } from '../../../utils/timeout.js';

const REQUEST_TIMEOUT_MS = 120_000;

export class WanAdapter extends BaseVideoProvider {
  readonly name = 'Wan' as const;

  readonly config: ProviderConfig = {
    name: 'Wan',
    displayName: 'Wan 2.1',
    tier: 'Budget',
    baseUrl: 'https://api-inference.huggingface.co',
    apiKeyEnvVar: 'HF_TOKEN',
    supportedModels: ['Wan-AI/Wan2.1-T2V-14B', 'Wan-AI/Wan2.1-I2V-14B'],
    defaultModel: 'Wan-AI/Wan2.1-T2V-14B',
    maxDuration: 15,
    supportedAspectRatios: ['9:16', '1:1', '16:9', '4:5'],
    supportedResolutions: ['720', '1080'],
    pricing: {
      baseCostPerSecond: 0.003,
      costPerGeneration: 0.02,
      resolutionMultipliers: { '720': 0.7, '1080': 1.0, '2K': 1.5, '4K': 2.0 },
      qualityMultipliers: { Draft: 0.5, Standard: 1.0, High: 1.4, Ultra: 1.8 },
      currency: 'USD',
    },
    rateLimits: { requestsPerMinute: 20, requestsPerHour: 400, concurrentJobs: 4, maxQueueSize: 40 },
    features: {
      textToVideo: true,
      imageToVideo: true,
      videoToVideo: false,
      supportsNegativePrompt: true,
      supportsCameraControl: false,
      supportsAudio: false,
      supportsLipSync: false,
      maxFps: 24,
      minDuration: 2,
      maxDuration: 15,
    },
    priority: 15,
    isActive: true,
  };

  async generateVideo(input: ProviderGenerationInput): Promise<ProviderGenerationOutput> {
    this.validateInput(input);
    const url = `${this.config.baseUrl}/models/${input.model}`;
    const { width, height } = this.resolveDimensions(input.settings);
    const payload = {
      inputs: input.prompt,
      parameters: {
        negative_prompt: input.negativePrompt ?? 'blurry, low quality, distorted',
        width,
        height,
        num_frames: input.settings.duration * 24,
        num_inference_steps: 30,
        guidance_scale: 7.0,
      },
    };

    try {
      const response = await withTimeout(
        () => fetch(url, { method: 'POST', headers: { ...this.buildHeaders(input.apiKey), Accept: 'video/mp4' }, body: JSON.stringify(payload) }),
        REQUEST_TIMEOUT_MS,
        'Wan generate'
      );
      if (!response.ok) {
        const text = await response.text();
        throw new Error(`HTTP ${response.status}: ${text}`);
      }
      const contentType = response.headers.get('content-type') ?? '';
      if (contentType.includes('video') || contentType.includes('octet-stream')) {
        const buffer = Buffer.from(await response.arrayBuffer());
        const videoUrl = await this.store(buffer);
        return {
          externalJobId: `wan-${Date.now()}`,
          status: 'Completed',
          videoUrl,
          duration: input.settings.duration,
          cost: this.calculateCost(input).estimatedCost,
          provider: this.name,
          model: input.model,
        };
      }
      const json = (await response.json()) as { id?: string };
      return { externalJobId: json.id ?? `wan-${Date.now()}`, status: 'Processing', provider: this.name, model: input.model };
    } catch (error) {
      throw this.handleError(error, 'generateVideo');
    }
  }

  async checkStatus(_externalJobId: string): Promise<ProviderJobStatus> {
    return 'Completed';
  }

  async cancelJob(_externalJobId: string): Promise<boolean> {
    return false;
  }

  async getResult(_externalJobId: string): Promise<ProviderGenerationOutput | null> {
    return null;
  }

  async healthCheck(): Promise<ProviderHealth> {
    const start = Date.now();
    try {
      const response = await withTimeout(
        () => fetch(`${this.config.baseUrl}/models/${this.config.defaultModel}`, { headers: this.buildHeaders(process.env.HF_TOKEN ?? '') }),
        10_000,
        'Wan health'
      );
      const health = this.defaultHealth(response.ok || response.status === 503 ? 'Available' : 'Degraded');
      return { ...health, averageResponseTime: Date.now() - start, lastChecked: new Date() };
    } catch {
      return { ...this.defaultHealth('Unavailable'), lastChecked: new Date(), lastFailure: new Date(), consecutiveFailures: 1 };
    }
  }

  private async store(buffer: Buffer): Promise<string> {
    const fs = await import('node:fs/promises');
    const path = await import('node:path');
    const { randomUUID } = await import('node:crypto');
    const dir = process.env.VIDEO_STORAGE_DIR ?? './storage/videos';
    await fs.mkdir(dir, { recursive: true });
    const filename = `${randomUUID()}.mp4`;
    await fs.writeFile(path.join(dir, filename), buffer);
    return `/storage/videos/${filename}`;
  }
}