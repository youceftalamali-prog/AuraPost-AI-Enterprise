/**
 * AI Provider Types
 * Common types and interfaces for all AI providers
 * Phase: 5.4 Part 4
 */

// ============================================
// AI PROVIDER TYPES
// ============================================

export type AIProviderType =
  | 'openai'
  | 'gemini'
  | 'stability'
  | 'replicate'
  | 'custom';

export type AIModelCategory =
  | 'image-generation'
  | 'image-editing'
  | 'background-removal'
  | 'upscaling'
  | 'inpainting'
  | 'object-removal'
  | 'style-transfer'
  | 'face-enhancement'
  | 'relighting'
  | 'recoloring'
  | 'text-to-image'
  | 'image-to-image';

export type AIModelStatus = 'available' | 'unavailable' | 'deprecated' | 'beta';

// ============================================
// AI MODEL
// ============================================

export interface AIModel {
  id: string;
  provider: AIProviderType;
  name: string;
  displayName: string;
  category: AIModelCategory;
  status: AIModelStatus;
  description: string;
  capabilities: string[];
  maxInputSize?: number;
  maxOutputSize?: number;
  supportedFormats: string[];
  pricing: {
    costPerCall?: number;
    costPerSecond?: number;
    costPerMegapixel?: number;
    freeTier?: boolean;
  };
  rateLimits: {
    requestsPerMinute: number;
    requestsPerDay: number;
    concurrentRequests: number;
  };
  estimatedLatencyMs: number;
  version: string;
  releasedAt: string;
  updatedAt: string;
}

// ============================================
// AI REQUEST
// ============================================

export interface AIRequest {
  id: string;
  provider: AIProviderType;
  modelId: string;
  action: string;
  input: AIInput;
  parameters: Record<string, any>;
  userId: string;
  workspaceId: string;
  projectId?: string;
  createdAt: number;
  timeoutMs?: number;
  priority?: 'low' | 'medium' | 'high' | 'critical';
}

export interface AIInput {
  type: 'image' | 'text' | 'image-and-text' | 'mask' | 'multi-image';
  imageData?: string | Blob | ArrayBuffer;
  imageUrl?: string;
  imageWidth?: number;
  imageHeight?: number;
  text?: string;
  negativeText?: string;
  maskData?: string | Blob;
  maskUrl?: string;
  additionalImages?: Array<{
    url?: string;
    data?: string | Blob;
    role: string;
  }>;
  metadata?: Record<string, any>;
}

// ============================================
// AI RESPONSE
// ============================================

export interface AIResponse {
  id: string;
  requestId: string;
  provider: AIProviderType;
  modelId: string;
  action: string;
  status: AIResponseStatus;
  output?: AIOutput;
  error?: AIError;
  processingTimeMs: number;
  creditsUsed: number;
  metadata?: Record<string, any>;
  createdAt: number;
  completedAt?: number;
}

export type AIResponseStatus =
  | 'pending'
  | 'processing'
  | 'completed'
  | 'failed'
  | 'cancelled'
  | 'timeout';

export interface AIOutput {
  type: 'image' | 'text' | 'multi-image' | 'data';
  imageData?: string; // base64 or data URL
  imageUrl?: string;
  imageWidth?: number;
  imageHeight?: number;
  text?: string;
  multipleImages?: Array<{
    imageData?: string;
    imageUrl?: string;
    width?: number;
    height?: number;
    label?: string;
  }>;
  data?: any;
}

export interface AIError {
  code: string;
  message: string;
  details?: Record<string, any>;
  retryable: boolean;
  suggestedAction?: string;
}

// ============================================
// AI PROVIDER CONFIG
// ============================================

export interface ImageAIProviderConfig {
  provider: AIProviderType;
  apiKey: string;
  baseUrl?: string;
  organizationId?: string;
  region?: string;
  timeoutMs?: number;
  maxRetries?: number;
  enableLogging?: boolean;
  customHeaders?: Record<string, string>;
}

// ============================================
// AI PROVIDER CAPABILITIES
// ============================================

export interface AIProviderCapabilities {
  supportedActions: string[];
  supportedFormats: string[];
  maxInputResolution: {
    width: number;
    height: number;
  };
  maxOutputResolution: {
    width: number;
    height: number;
  };
  supportsBatching: boolean;
  supportsStreaming: boolean;
  supportsCancellation: boolean;
  supportsWebhooks: boolean;
  averageLatencyMs: number;
  reliability: number; // 0-1
}

// ============================================
// AI JOB
// ============================================

export interface AIJob {
  id: string;
  requestId: string;
  status: AIJobStatus;
  progress: number; // 0-100
  request: AIRequest;
  response?: AIResponse;
  createdAt: number;
  startedAt?: number;
  completedAt?: number;
  retryCount: number;
  maxRetries: number;
  error?: AIError;
  metadata?: Record<string, any>;
}

export type AIJobStatus =
  | 'queued'
  | 'processing'
  | 'completed'
  | 'failed'
  | 'cancelled'
  | 'retrying';

// ============================================
// AI CREDITS
// ============================================

export interface AICreditTransaction {
  id: string;
  userId: string;
  workspaceId: string;
  amount: number;
  type: 'credit' | 'debit';
  action: string;
  provider: AIProviderType;
  modelId: string;
  requestId?: string;
  description: string;
  balanceAfter: number;
  createdAt: number;
}

export interface AICreditBalance {
  userId: string;
  workspaceId: string;
  totalCredits: number;
  usedCredits: number;
  remainingCredits: number;
  monthlyLimit: number;
  monthlyUsed: number;
  monthlyRemaining: number;
  lastUpdated: number;
}

// ============================================
// AI HISTORY
// ============================================

export interface AIHistoryEntry {
  id: string;
  userId: string;
  workspaceId: string;
  projectId?: string;
  layerId?: string;
  action: string;
  provider: AIProviderType;
  modelId: string;
  input: AIInput;
  output?: AIOutput;
  status: AIResponseStatus;
  creditsUsed: number;
  processingTimeMs: number;
  createdAt: number;
  completedAt?: number;
  metadata?: Record<string, any>;
}

// ============================================
// AI PROMPT
// ============================================

export interface AIPrompt {
  id: string;
  name: string;
  description: string;
  category: string;
  template: string;
  variables: AIPromptVariable[];
  defaultParameters: Record<string, any>;
  tags: string[];
  isPublic: boolean;
  usageCount: number;
  rating: number;
  createdAt: number;
  updatedAt: number;
}

export interface AIPromptVariable {
  name: string;
  type: 'text' | 'number' | 'select' | 'image';
  description: string;
  required: boolean;
  defaultValue?: any;
  options?: string[];
  validation?: {
    minLength?: number;
    maxLength?: number;
    min?: number;
    max?: number;
  };
}

// ============================================
// AI PROVIDER INTERFACE
// ============================================

export interface IAIProvider {
  /**
   * Get provider type
   */
  getType(): AIProviderType;

  /**
   * Check if provider is available
   */
  isAvailable(): Promise<boolean>;

  /**
   * Get provider capabilities
   */
  getCapabilities(): AIProviderCapabilities;

  /**
   * Get available models
   */
  getModels(): Promise<AIModel[]>;

  /**
   * Get model by ID
   */
  getModel(modelId: string): Promise<AIModel | null>;

  /**
   * Execute AI request
   */
  execute(request: AIRequest): Promise<AIResponse>;

  /**
   * Cancel request
   */
  cancel(requestId: string): Promise<boolean>;

  /**
   * Get request status
   */
  getStatus(requestId: string): Promise<AIJobStatus>;

  /**
   * Validate API key
   */
  validateApiKey(apiKey: string): Promise<boolean>;

  /**
   * Get rate limit info
   */
  getRateLimitInfo(): Promise<{
    requestsRemaining: number;
    requestsLimit: number;
    resetAt: number;
  }>;

  /**
   * Cleanup resources
   */
  destroy(): void;
}

// ============================================
// AI ACTION TYPES
// ============================================

export type AIAction =
  | 'remove-background'
  | 'inpaint'
  | 'outpaint'
  | 'object-removal'
  | 'generative-fill'
  | 'upscale'
  | 'relight'
  | 'recolor'
  | 'face-enhance'
  | 'style-transfer'
  | 'text-to-image'
  | 'image-to-image'
  | 'image-variation'
  | 'image-edit'
  | 'colorize'
  | 'denoise'
  | 'sharpen'
  | 'blur-background'
  | 'replace-sky'
  | 'image-analysis'
  | 'portrait-enhance';

// ============================================
// AI ACTION PARAMETERS
// ============================================

export interface RemoveBackgroundParams {
  outputFormat?: 'png' | 'webp' | 'jpg';
  matteType?: 'soft' | 'hard' | 'refined';
  preserveHair?: boolean;
  preserveShadows?: boolean;
}

export interface InpaintParams {
  prompt?: string;
  negativePrompt?: string;
  strength?: number;
  guidanceScale?: number;
  steps?: number;
}

export interface UpscaleParams {
  scale: 2 | 4 | 8;
  preserveDetails?: boolean;
  enhanceFace?: boolean;
  outputFormat?: 'png' | 'webp' | 'jpg';
}

export interface StyleTransferParams {
  style: string;
  strength: number;
  preserveColors?: boolean;
  preserveComposition?: boolean;
}

export interface GenerativeFillParams {
  prompt: string;
  negativePrompt?: string;
  guidanceScale?: number;
  steps?: number;
  seed?: number;
}

export interface RelightParams {
  lightDirection?: 'left' | 'right' | 'top' | 'bottom' | 'front' | 'back';
  lightIntensity?: number;
  lightColor?: string;
  ambientLight?: number;
}

export interface RecolorParams {
  targetColor: string;
  replacementColor: string;
  tolerance?: number;
  preserveShading?: boolean;
}

export interface FaceEnhanceParams {
  strength?: number;
  preserveIdentity?: boolean;
  smoothSkin?: boolean;
  enhanceEyes?: boolean;
}

// ============================================
// AI PROVIDER REGISTRY
// ============================================

export interface AIProviderRegistry {
  register(provider: IAIProvider): void;
  unregister(providerType: AIProviderType): void;
  get(providerType: AIProviderType): IAIProvider | null;
  getAll(): IAIProvider[];
  isAvailable(providerType: AIProviderType): Promise<boolean>;
  getAvailableProviders(): Promise<IAIProvider[]>;
}

// ============================================
// AI ERROR CODES
// ============================================

export enum AIErrorCode {
  INVALID_API_KEY = 'INVALID_API_KEY',
  RATE_LIMIT_EXCEEDED = 'RATE_LIMIT_EXCEEDED',
  QUOTA_EXCEEDED = 'QUOTA_EXCEEDED',
  INSUFFICIENT_CREDITS = 'INSUFFICIENT_CREDITS',
  INVALID_INPUT = 'INVALID_INPUT',
  UNSUPPORTED_FORMAT = 'UNSUPPORTED_FORMAT',
  IMAGE_TOO_LARGE = 'IMAGE_TOO_LARGE',
  IMAGE_TOO_SMALL = 'IMAGE_TOO_SMALL',
  UNSUPPORTED_ACTION = 'UNSUPPORTED_ACTION',
  PROVIDER_UNAVAILABLE = 'PROVIDER_UNAVAILABLE',
  MODEL_UNAVAILABLE = 'MODEL_UNAVAILABLE',
  TIMEOUT = 'TIMEOUT',
  NETWORK_ERROR = 'NETWORK_ERROR',
  INTERNAL_ERROR = 'INTERNAL_ERROR',
  CANCELLED = 'CANCELLED',
  INVALID_MASK = 'INVALID_MASK',
  INVALID_PROMPT = 'INVALID_PROMPT',
  CONTENT_POLICY_VIOLATION = 'CONTENT_POLICY_VIOLATION',
}

// ============================================
// AI METRICS
// ============================================

export interface AIMetrics {
  totalRequests: number;
  successfulRequests: number;
  failedRequests: number;
  cancelledRequests: number;
  totalProcessingTimeMs: number;
  averageProcessingTimeMs: number;
  totalCreditsUsed: number;
  totalImagesProcessed: number;
  successRate: number;
  errorDistribution: Record<string, number>;
  providerDistribution: Record<string, number>;
  actionDistribution: Record<string, number>;
}

// ============================================
// AI CACHE
// ============================================

export interface AICacheEntry {
  key: string;
  input: AIInput;
  output: AIOutput;
  provider: AIProviderType;
  modelId: string;
  action: string;
  parameters: Record<string, any>;
  createdAt: number;
  expiresAt: number;
  hitCount: number;
  size: number;
}

export interface AICacheConfig {
  enabled: boolean;
  maxSize: number; // in bytes
  maxEntries: number;
  ttlMs: number;
  enableDiskCache: boolean;
  cacheDirectory?: string;
}