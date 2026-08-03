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

export class HuggingFaceAdapter extends BaseVideoProvider {
  readonly name = 'HuggingFace' as const;

  readonly config: ProviderConfig = {
    name: 'HuggingFace',
    displayName: 'Hugging Face',
    tier: 'Free',
    baseUrl: 'https://api-inference.huggingface.co',
    apiKeyEnvVar: 'HF_TOKEN',
    supportedModels: [
      'stabilityai/stable-video-diffusion-img2vid',
      'ali-vilab/AnimateDiff',
      'Lightricks/LTX-Video',
      'tencent/HunyuanVideo',
      'genmo/mochi-1-preview',
      'Wan-AI/Wan2.1-T2V-14B',
      'THUDM/CogVideoX-5b',
    ],
    defaultModel: 'stabilityai/stable-video-diffusion-img2vid',
    maxDuration: 30,
    supportedAspectRatios: ['9:16', '1:1', '16:9', '4:5'],
    supportedResolutions: ['720', '1080'],
    pricing: {
      baseCostPerSecond: 0.002,
      costPerGeneration: 0.01,
      resolutionMultipliers: { '720': 0.7, '1080': 1.0, '2K': 1.5, '4K': 2.0 },
      qualityMultipliers: { Draft: 0.5, Standard: 1.0, High: 1.5, Ultra: 2.0 },
      currency: 'USD',
      freeTierCredits: 100,
    },
    rateLimits: { requestsPerMinute: 30, requestsPerHour: 500, concurrentJobs: 5, maxQueueSize: 50 },
    features: {
      textToVideo: true,
      imageToVideo: true,
      videoToVideo: false,
      supportsNegativePrompt: true,
      supportsCameraControl: false,
      supportsAudio: false,
      supportsLipSync: false,
      maxFps: 30,
      minDuration: 2,
      maxDuration: 30,
    },
    priority: 10,
    isActive: true,
  };

  async generateVideo(input: ProviderGenerationInput): Promise<ProviderGenerationOutput> {
    this.validateInput(input);
    const url = `${this.config.baseUrl}/models/${input.model}`;
    const payload = this.buildPayload(input);

    try {
      const response = await withTimeout(
        () =>
          fetch(url, {
            method: 'POST',
            headers: { ...this.buildHeaders(input.apiKey), Accept: 'video/mp4' },
            body: JSON.stringify(payload),
          }),
        REQUEST_TIMEOUT_MS,
        'HuggingFace generate'
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
          externalJobId: `hf-${Date.now()}`,
          status: 'Completed',
          videoUrl,
          duration: input.settings.duration,
          cost: this.calculateCost(input).estimatedCost,
          provider: this.name,
          model: input.model,
        };
      }

      const json = (await response.json()) as { id?: string; error?: string };
      if (json.error) throw new Error(json.error);
      return {
        externalJobId: json.id ?? `hf-${Date.now()}`,
        status: 'Processing',
        provider: this.name,
        model: input.model,
      };
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
        () => fetch(`${this.config.baseUrl}/models`, { headers: this.buildHeaders(process.env.HF_TOKEN ?? '') }),
        10_000,
        'HuggingFace health'
      );
      const health = this.defaultHealth(response.ok ? 'Available' : 'Degraded');
      return { ...health, averageResponseTime: Date.now() - start, lastChecked: new Date() };
    } catch {
      return { ...this.defaultHealth('Unavailable'), lastChecked: new Date(), lastFailure: new Date(), consecutiveFailures: 1 };
    }
  }

  private buildPayload(input: ProviderGenerationInput): Record<string, unknown> {
    const { width, height } = this.resolveDimensions(input.settings);
    if (input.imageUrl) {
      return {
        inputs: input.imageUrl,
        parameters: {
          motion_bucket_id: 27,
          noise_aug_strength: 0.02,
          num_frames: input.settings.duration * input.settings.fps,
          fps: input.settings.fps,
        },
      };
    }
    return {
      inputs: input.prompt,
      parameters: {
        negative_prompt: input.negativePrompt ?? 'blurry, low quality, distorted',
        width,
        height,
        num_frames: input.settings.duration * input.settings.fps,
        num_inference_steps: this.inferenceSteps(input.settings.quality),
        guidance_scale: 7.5,
      },
    };
  }

  private inferenceSteps(quality: string): number {
    if (quality === 'Draft') return 15;
    if (quality === 'Standard') return 25;
    if (quality === 'High') return 40;
    if (quality === 'Ultra') return 60;
    return 25;
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