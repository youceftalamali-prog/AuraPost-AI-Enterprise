import { db } from '../db/index.js';
import { videoProviders } from '../db/schema/providers.js';
import { createVideoLogger } from '../utils/videoLogger.js';
import type { NewVideoProviderRecord } from '../types/entities.js';

const logger = createVideoLogger('ProvidersSeed');

/**
 * Seeds the provider catalog. Mirrors the in-code adapter registry so the
 * dashboard and routing can read provider metadata from the database.
 */
const PROVIDERS = [
  {
    name: 'HuggingFace',
    displayName: 'Hugging Face',
    tier: 'Free',
    baseUrl: 'https://api-inference.huggingface.co',
    apiKeyEnvVar: 'HF_TOKEN',
    supportedModels: ['stabilityai/stable-video-diffusion-img2vid', 'ali-vilab/AnimateDiff', 'Lightricks/LTX-Video', 'tencent/HunyuanVideo', 'genmo/mochi-1-preview', 'Wan-AI/Wan2.1-T2V-14B', 'THUDM/CogVideoX-5b'],
    defaultModel: 'stabilityai/stable-video-diffusion-img2vid',
    maxDuration: 30,
    supportedAspectRatios: ['9:16', '1:1', '16:9', '4:5'],
    supportedResolutions: ['720', '1080'],
    pricing: { baseCostPerSecond: 0.002, costPerGeneration: 0.01, resolutionMultipliers: { '720': 0.7, '1080': 1.0, '2K': 1.5, '4K': 2.0 }, qualityMultipliers: { Draft: 0.5, Standard: 1.0, High: 1.5, Ultra: 2.0 }, currency: 'USD', freeTierCredits: 100 },
    rateLimits: { requestsPerMinute: 30, requestsPerHour: 500, concurrentJobs: 5, maxQueueSize: 50 },
    features: { textToVideo: true, imageToVideo: true, videoToVideo: false, supportsNegativePrompt: true, supportsCameraControl: false, supportsAudio: false, supportsLipSync: false, maxFps: 30, minDuration: 2, maxDuration: 30 },
    priority: 10,
    isActive: true,
  },
  {
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
    pricing: { baseCostPerSecond: 0.003, costPerGeneration: 0.02, resolutionMultipliers: { '720': 0.7, '1080': 1.0, '2K': 1.5, '4K': 2.0 }, qualityMultipliers: { Draft: 0.5, Standard: 1.0, High: 1.4, Ultra: 1.8 }, currency: 'USD' },
    rateLimits: { requestsPerMinute: 20, requestsPerHour: 400, concurrentJobs: 4, maxQueueSize: 40 },
    features: { textToVideo: true, imageToVideo: true, videoToVideo: false, supportsNegativePrompt: true, supportsCameraControl: false, supportsAudio: false, supportsLipSync: false, maxFps: 24, minDuration: 2, maxDuration: 15 },
    priority: 15,
    isActive: true,
  },
  {
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
    pricing: { baseCostPerSecond: 0.04, costPerGeneration: 0.2, resolutionMultipliers: { '720': 0.8, '1080': 1.0, '2K': 1.5, '4K': 2.0 }, qualityMultipliers: { Draft: 0.6, Standard: 1.0, High: 1.3, Ultra: 1.8 }, currency: 'USD' },
    rateLimits: { requestsPerMinute: 15, requestsPerHour: 300, concurrentJobs: 5, maxQueueSize: 30 },
    features: { textToVideo: true, imageToVideo: true, videoToVideo: false, supportsNegativePrompt: true, supportsCameraControl: true, supportsAudio: false, supportsLipSync: true, maxFps: 30, minDuration: 5, maxDuration: 10 },
    priority: 25,
    isActive: true,
  },
  {
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
    pricing: { baseCostPerSecond: 0.05, costPerGeneration: 0.25, resolutionMultipliers: { '720': 0.8, '1080': 1.0, '2K': 1.5, '4K': 2.5 }, qualityMultipliers: { Draft: 0.6, Standard: 1.0, High: 1.4, Ultra: 2.0 }, currency: 'USD' },
    rateLimits: { requestsPerMinute: 10, requestsPerHour: 200, concurrentJobs: 3, maxQueueSize: 20 },
    features: { textToVideo: true, imageToVideo: true, videoToVideo: true, supportsNegativePrompt: false, supportsCameraControl: true, supportsAudio: false, supportsLipSync: false, maxFps: 30, minDuration: 4, maxDuration: 16 },
    priority: 20,
    isActive: true,
  },
  {
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
    pricing: { baseCostPerSecond: 0.03, costPerGeneration: 0.15, resolutionMultipliers: { '720': 0.8, '1080': 1.0, '2K': 1.5, '4K': 2.0 }, qualityMultipliers: { Draft: 0.6, Standard: 1.0, High: 1.3, Ultra: 1.7 }, currency: 'USD' },
    rateLimits: { requestsPerMinute: 10, requestsPerHour: 150, concurrentJobs: 3, maxQueueSize: 15 },
    features: { textToVideo: true, imageToVideo: true, videoToVideo: true, supportsNegativePrompt: true, supportsCameraControl: true, supportsAudio: false, supportsLipSync: false, maxFps: 24, minDuration: 2, maxDuration: 4 },
    priority: 35,
    isActive: true,
  },
  {
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
    pricing: { baseCostPerSecond: 0.04, costPerGeneration: 0.3, resolutionMultipliers: { '720': 0.8, '1080': 1.0, '2K': 1.5, '4K': 2.0 }, qualityMultipliers: { Draft: 0.6, Standard: 1.0, High: 1.4, Ultra: 1.9 }, currency: 'USD' },
    rateLimits: { requestsPerMinute: 8, requestsPerHour: 120, concurrentJobs: 2, maxQueueSize: 10 },
    features: { textToVideo: true, imageToVideo: true, videoToVideo: false, supportsNegativePrompt: false, supportsCameraControl: true, supportsAudio: false, supportsLipSync: false, maxFps: 30, minDuration: 5, maxDuration: 10 },
    priority: 40,
    isActive: true,
  },
  {
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
    pricing: { baseCostPerSecond: 0.1, costPerGeneration: 0.5, resolutionMultipliers: { '720': 0.7, '1080': 1.0, '2K': 1.8, '4K': 3.0 }, qualityMultipliers: { Draft: 0.5, Standard: 1.0, High: 1.5, Ultra: 2.5 }, currency: 'USD' },
    rateLimits: { requestsPerMinute: 5, requestsPerHour: 100, concurrentJobs: 2, maxQueueSize: 10 },
    features: { textToVideo: true, imageToVideo: true, videoToVideo: false, supportsNegativePrompt: true, supportsCameraControl: true, supportsAudio: true, supportsLipSync: false, maxFps: 30, minDuration: 4, maxDuration: 8 },
    priority: 30,
    isActive: true,
  },
];

export async function seedProviders(): Promise<number> {
  logger.info('Seeding providers...');
  let inserted = 0;

  for (const provider of PROVIDERS) {
    try {
      const updateData = { ...provider, updatedAt: new Date() };
      await db
        .insert(videoProviders)
        .values(provider)
        .onConflictDoUpdate({ target: videoProviders.name, set: updateData });
      inserted++;
    } catch (error) {
      logger.error('Failed to seed provider', error as Error, { name: provider.name });
    }
  }

  logger.info('Providers seeded', { count: inserted });
  return inserted;
}