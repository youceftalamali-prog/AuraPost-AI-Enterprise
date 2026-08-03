/**
 * Provider-layer domain types: adapter contract, generation I/O,
 * routing decisions, cost estimates and health snapshots.
 */
import type {
  VideoProviderName,
  ProviderTier,
  VideoGenerationSettings,
} from './video.js';

export type ProviderJobStatus =
  | 'Queued'
  | 'Processing'
  | 'Rendering'
  | 'Completed'
  | 'Failed'
  | 'Cancelled'
  | 'Timeout';

export interface ProviderPricing {
  baseCostPerSecond: number;
  costPerGeneration: number;
  resolutionMultipliers: Record<string, number>;
  qualityMultipliers: Record<string, number>;
  currency: string;
  freeTierCredits?: number;
}

export interface ProviderRateLimits {
  requestsPerMinute: number;
  requestsPerHour: number;
  concurrentJobs: number;
  maxQueueSize: number;
}

export interface ProviderFeatures {
  textToVideo: boolean;
  imageToVideo: boolean;
  videoToVideo: boolean;
  supportsNegativePrompt: boolean;
  supportsCameraControl: boolean;
  supportsAudio: boolean;
  supportsLipSync: boolean;
  maxFps: number;
  minDuration: number;
  maxDuration: number;
}

export interface ProviderConfig {
  name: VideoProviderName;
  displayName: string;
  tier: ProviderTier;
  baseUrl: string;
  apiKeyEnvVar: string;
  supportedModels: string[];
  defaultModel: string;
  maxDuration: number;
  supportedAspectRatios: string[];
  supportedResolutions: string[];
  pricing: ProviderPricing;
  rateLimits: ProviderRateLimits;
  features: ProviderFeatures;
  priority: number;
  isActive: boolean;
}

export interface ProviderGenerationInput {
  prompt: string;
  negativePrompt?: string;
  imageUrl?: string;
  model: string;
  settings: VideoGenerationSettings;
  apiKey: string;
  workspaceId: string;
  userId: string;
}

export interface ProviderGenerationOutput {
  externalJobId: string;
  status: ProviderJobStatus;
  videoUrl?: string;
  thumbnailUrl?: string;
  duration?: number;
  cost?: number;
  provider: VideoProviderName;
  model: string;
  metadata?: Record<string, unknown>;
}

/**
 * Health snapshot returned by an adapter's live health check.
 * Distinct from ProviderHealthRecord (the persisted DB row).
 */
export interface ProviderHealth {
  provider: VideoProviderName;
  status: 'Available' | 'Degraded' | 'Unavailable' | 'Maintenance';
  availability: number;
  averageResponseTime: number;
  successRate: number;
  failureRate: number;
  currentQueueSize: number;
  lastChecked: Date;
  lastSuccess?: Date;
  lastFailure?: Date;
  consecutiveFailures: number;
  uptime: number;
}

export interface ProviderCostEstimate {
  provider: VideoProviderName;
  model: string;
  estimatedCost: number;
  currency: string;
  breakdown: {
    baseCost: number;
    durationCost: number;
    resolutionMultiplier: number;
    qualityMultiplier: number;
    total: number;
  };
  estimatedTime: number;
  confidence: number;
}

export interface CostComparisonResult {
  estimates: ProviderCostEstimate[];
  cheapest: ProviderCostEstimate;
  fastest: ProviderCostEstimate;
  bestQuality: ProviderCostEstimate;
  recommended: ProviderCostEstimate;
  reasoning: string;
}

export type RoutingPriority = 'cost' | 'speed' | 'quality' | 'availability' | 'balanced';

export interface RoutingCriteria {
  prioritize: RoutingPriority;
  maxCost?: number;
  maxWaitTime?: number;
  requiredFeatures?: string[];
  preferredProviders?: VideoProviderName[];
  excludedProviders?: VideoProviderName[];
}

export interface RoutingDecision {
  selectedProvider: VideoProviderName;
  fallbackChain: VideoProviderName[];
  reasoning: string[];
  scores: Record<VideoProviderName, number>;
  estimatedCost: number;
  estimatedTime: number;
}

export interface ProviderTestResult {
  provider: VideoProviderName;
  success: boolean;
  responseTime: number;
  message: string;
  details?: Record<string, unknown>;
  testedAt: Date;
}

/**
 * The adapter contract every video provider must implement.
 */
export interface IVideoProviderAdapter {
  readonly name: VideoProviderName;
  readonly config: ProviderConfig;
  generateVideo(input: ProviderGenerationInput): Promise<ProviderGenerationOutput>;
  checkStatus(externalJobId: string): Promise<ProviderJobStatus>;
  cancelJob(externalJobId: string): Promise<boolean>;
  getResult(externalJobId: string): Promise<ProviderGenerationOutput | null>;
  calculateCost(input: ProviderGenerationInput): ProviderCostEstimate;
  healthCheck(): Promise<ProviderHealth>;
  isAvailable(): Promise<boolean>;
}