/**
 * Frontend API types — DTOs and response shapes for the Video Studio API.
 * Mirrors the backend contracts in server/types.
 */

// ---------- Shared ----------
export type VideoProviderName = 'HuggingFace' | 'Runway' | 'Kling' | 'Veo' | 'Wan' | 'Pika' | 'Luma';
export type VideoPlatform = 'TikTok' | 'Instagram' | 'YouTube' | 'Facebook' | 'Pinterest';
export type Resolution = '720' | '1080' | '2K' | '4K';
export type AspectRatio = '9:16' | '1:1' | '16:9' | '4:5';
export type VideoQuality = 'Draft' | 'Standard' | 'High' | 'Ultra';
export type VideoDuration = 5 | 10 | 15 | 20 | 30;
export type FPS = 24 | 30 | 60;
export type CameraMotion = 'Static' | 'Pan' | 'Zoom' | 'Orbit';
export type Lighting = 'Soft' | 'Luxury' | 'Studio' | 'Dark';
export type VideoBackground = 'Transparent' | 'White' | 'Black' | 'Gradient' | 'Generated AI';
export type VideoSpeed = 'Slow' | 'Normal' | 'Fast';

export type VideoJobStatus =
  | 'Queued'
  | 'Analyzing'
  | 'Processing'
  | 'Rendering'
  | 'Completed'
  | 'Failed'
  | 'Cancelled';

export interface VideoGenerationSettings {
  resolution: Resolution;
  aspectRatio: AspectRatio;
  duration: VideoDuration;
  fps: FPS;
  quality: VideoQuality;
  cameraMotion?: CameraMotion;
  lighting?: Lighting;
  background?: VideoBackground;
  speed?: VideoSpeed;
  platform?: VideoPlatform;
  voice?: string;
  music?: string;
  subtitles?: boolean;
  transitions?: string;
  animations?: string;
  captionStyle?: string;
  logoPosition?: string;
  brandColors?: string[];
  watermark?: boolean;
  aiCreativity?: number;
}

// ---------- Templates ----------
export interface VideoTemplate {
  id: string;
  category: string;
  subcategory: string | null;
  name: string;
  description: string | null;
  style: string | null;
  platform: string | null;
  difficulty: string;
  popularity: number;
  thumbnailUrl: string | null;
  previewUrl: string | null;
  basePromptTemplate: string;
  supportedModels: string[];
  estimatedDuration: number;
  estimatedCost: string;
  metadata: Record<string, unknown>;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface TemplateSearchParams {
  category?: string;
  subcategory?: string;
  style?: string;
  platform?: string;
  difficulty?: string;
  search?: string;
  sortBy?: 'popularity' | 'estimatedCost' | 'estimatedDuration' | 'name' | 'createdAt';
  sortOrder?: 'asc' | 'desc';
  limit?: number;
  offset?: number;
}

export interface TemplateListResponse {
  items: VideoTemplate[];
  total: number;
}

export interface CategoryListResponse {
  category: string;
  count: number;
}

export interface RankedTemplate {
  template: VideoTemplate;
  score: number;
  reasoning: string[];
  breakdown: {
    categoryMatch: number;
    styleMatch: number;
    platformMatch: number;
    popularity: number;
    costFit: number;
    favoriteBoost: number;
  };
}

// ---------- Video Jobs ----------
export interface VideoJob {
  id: string;
  provider: string;
  externalJobId: string | null;
  workspaceId: string;
  userId: string;
  productId: string | null;
  templateId: string | null;
  prompt: string;
  negativePrompt: string | null;
  model: string;
  settings: Record<string, unknown>;
  status: VideoJobStatus;
  progress: number;
  resultUrl: string | null;
  thumbnailUrl: string | null;
  duration: number | null;
  resolution: string | null;
  aspectRatio: string | null;
  cacheHash: string | null;
  errorMessage: string | null;
  retryCount: number;
  priority: number;
  estimatedCost: string | null;
  actualCost: string | null;
  startedAt: string | null;
  completedAt: string | null;
  createdAt: string;
}

export interface GenerateVideoDTO {
  productId: string;
  templateId: string;
  platform?: VideoPlatform;
  settings: VideoGenerationSettings;
  blockIds?: string[];
  customPrompt?: string;
}

export interface GenerateVideoResponse {
  jobId: string;
  status: VideoJobStatus;
  provider: VideoProviderName;
  fallbackChain: VideoProviderName[];
  estimatedCost: number;
  estimatedDuration: number;
}

export interface JobListResponse {
  items: VideoJob[];
  total: number;
}

// ---------- Video History ----------
export interface VideoHistoryRecord {
  id: string;
  jobId: string | null;
  userId: string;
  workspaceId: string;
  productId: string | null;
  templateId: string | null;
  videoUrl: string;
  thumbnailUrl: string | null;
  title: string | null;
  description: string | null;
  tags: string[];
  platform: string | null;
  provider: string | null;
  estimatedCost: string | null;
  isFavorite: boolean;
  isPublished: boolean;
  publishedAt: string | null;
  createdAt: string;
}

export interface HistoryListResponse {
  items: VideoHistoryRecord[];
  total: number;
}

// ---------- Brand ----------
export interface BrandProfile {
  id: string;
  workspaceId: string;
  name: string;
  logoUrl: string | null;
  colors: string[];
  fonts: string[];
  tone: string | null;
  voice: string | null;
  personality: string[];
  values: string[];
  luxuryLevel: number;
  visualIdentity: string | null;
  writingStyle: string | null;
  ctaStyle: string | null;
  description: string | null;
  website: string | null;
  analysis: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
}

export interface CreateBrandDTO {
  name: string;
  logoUrl?: string;
  colors?: string[];
  fonts?: string[];
  tone?: string;
  voice?: string;
  personality?: string[];
  values?: string[];
  luxuryLevel?: number;
  visualIdentity?: string;
  writingStyle?: string;
  ctaStyle?: string;
  description?: string;
  website?: string;
}

export interface BrandAnalysis {
  visualStyle: string;
  voiceProfile: { tone: string; personality: string[]; values: string[]; language: string };
  luxuryScore: number;
  modernScore: number;
  playfulScore: number;
  professionalScore: number;
  ctaPatterns: string[];
  recommendedVideoStyles: string[];
  recommendedMusic: string[];
  recommendedVoice: string;
  confidence: number;
}

export interface BrandAnalysisResult {
  brand: BrandProfile;
  analysis: BrandAnalysis;
}

// ---------- Audience ----------
export interface AudienceProfile {
  id: string;
  workspaceId: string;
  name: string;
  ageGroup: string;
  gender: string;
  interests: string[];
  buyingIntent: string;
  incomeLevel: string;
  lifestyle: string[];
  location: string[];
  language: string | null;
  analysis: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
}

export interface CreateAudienceDTO {
  name: string;
  ageGroup: string;
  gender: string;
  interests?: string[];
  buyingIntent?: string;
  incomeLevel?: string;
  lifestyle?: string[];
  location?: string[];
  language?: string;
}

export interface AudienceAnalysis {
  emotionalTriggers: string[];
  painPoints: string[];
  aspirations: string[];
  preferredStyle: string[];
  preferredVideoPace: string;
  preferredCTA: string[];
  preferredPlatforms: string[];
  preferredMusic: string[];
  preferredHooks: string[];
  engagementPatterns: { bestTimeOfDay: string; bestDaysOfWeek: string[]; averageWatchTime: number };
  conversionDrivers: string[];
  objections: string[];
  confidence: number;
}

export interface AudienceAnalysisResult {
  audience: AudienceProfile;
  analysis: AudienceAnalysis;
}

// ---------- Campaign ----------
export interface CampaignProfile {
  id: string;
  workspaceId: string;
  name: string;
  productId: string | null;
  brandId: string | null;
  audienceId: string | null;
  goal: string;
  platforms: string[];
  status: string;
  startDate: string | null;
  endDate: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CreateCampaignDTO {
  name: string;
  productId?: string;
  brandId?: string;
  audienceId?: string;
  goal?: string;
  platforms?: VideoPlatform[];
}

export interface GenerateCampaignDTO {
  productId: string;
  platforms?: VideoPlatform[];
}

export interface CampaignGeneration {
  id: string;
  campaignId: string;
  workspaceId: string;
  platform: string;
  videoConcept: string;
  caption: string;
  hook: string;
  cta: string;
  hashtags: string[];
  thumbnailIdea: string | null;
  publishingStrategy: Record<string, unknown>;
  prompt: string;
  negativePrompt: string | null;
  templateId: string | null;
  estimatedCost: string | null;
  estimatedDuration: number | null;
  createdAt: string;
}

export interface CampaignIntelligenceResult {
  campaignId: string;
  generations: CampaignGeneration[];
  overallStrategy: {
    theme: string;
    messaging: string[];
    visualDirection: string;
    keyBenefits: string[];
  };
}

// ---------- Providers ----------
export interface ProviderInfo {
  id: string;
  name: VideoProviderName;
  displayName: string;
  tier: string;
  baseUrl: string;
  supportedModels: string[];
  defaultModel: string;
  maxDuration: number;
  supportedAspectRatios: string[];
  supportedResolutions: string[];
  pricing: Record<string, unknown>;
  rateLimits: Record<string, unknown>;
  features: Record<string, unknown>;
  priority: number;
  isActive: boolean;
}

export interface ProviderHealth {
  provider: VideoProviderName;
  status: 'Available' | 'Degraded' | 'Unavailable' | 'Maintenance';
  availability: number;
  averageResponseTime: number;
  successRate: number;
  failureRate: number;
  currentQueueSize: number;
  lastChecked: string;
  lastSuccess: string | null;
  lastFailure: string | null;
  consecutiveFailures: number;
  uptime: number;
}

export interface ProviderStatistics {
  id: string;
  provider: string;
  workspaceId: string | null;
  period: string;
  totalJobs: number;
  successfulJobs: number;
  failedJobs: number;
  cancelledJobs: number;
  successRate: string;
  averageGenerationTime: number;
  averageCost: string;
  totalCost: string;
  totalDuration: number;
  lastResponseTime: number;
  lastJobAt: string | null;
  updatedAt: string;
}

export interface ProviderSettings {
  id: string;
  workspaceId: string;
  autoRouting: boolean;
  defaultProvider: string;
  fallbackEnabled: boolean;
  fallbackChain: string[];
  maxCostPerVideo: string;
  preferredQuality: string;
  apiKeys: Record<string, string>;
  customPriorities: Record<string, number>;
  excludedProviders: string[];
  createdAt: string;
  updatedAt: string;
}

export interface UpdateProviderSettingsDTO {
  defaultProvider?: VideoProviderName;
  autoRouting?: boolean;
  fallbackEnabled?: boolean;
  fallbackChain?: VideoProviderName[];
  maxCostPerVideo?: number;
  preferredQuality?: string;
  apiKeys?: Record<string, string>;
  customPriorities?: Record<string, number>;
  excludedProviders?: VideoProviderName[];
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

export interface CompareCostDTO {
  prompt: string;
  settings: VideoGenerationSettings;
  providers?: VideoProviderName[];
}

export interface RoutingDecision {
  selectedProvider: VideoProviderName;
  fallbackChain: VideoProviderName[];
  reasoning: string[];
  scores: Record<VideoProviderName, number>;
  estimatedCost: number;
  estimatedTime: number;
}

export interface SelectProviderDTO {
  prompt: string;
  settings: VideoGenerationSettings;
  criteria?: {
    prioritize?: 'cost' | 'speed' | 'quality' | 'availability' | 'balanced';
    maxCost?: number;
    maxWaitTime?: number;
    requiredFeatures?: string[];
    preferredProviders?: VideoProviderName[];
    excludedProviders?: VideoProviderName[];
  };
}

export interface ProviderTestResult {
  provider: VideoProviderName;
  success: boolean;
  responseTime: number;
  message: string;
  details?: Record<string, unknown>;
  testedAt: string;
}

// ---------- Prompt ----------
export interface ComposePromptDTO {
  productId: string;
  templateId: string;
  platform?: VideoPlatform;
  blockIds?: string[];
  customPrompt?: string;
  videoSettings?: Partial<VideoGenerationSettings>;
}

export interface ComposedPrompt {
  id: string;
  prompt: string;
  negativePrompt: string;
  safetyPrompt: string;
  components: {
    product: string;
    brand: string;
    audience: string;
    platform: string;
    template: string;
    campaign: string;
    blocks: string[];
    custom: string;
    settings: string;
  };
  metadata: {
    tokenCount: number;
    estimatedCost: number;
    estimatedDuration: number;
    qualityScore: number;
    compositionTime: number;
  };
  createdAt: string;
}

export interface PromptPreviewResult {
  finalPrompt: string;
  negativePrompt: string;
  estimatedCost: number;
  estimatedDuration: number;
  recommendedProvider: VideoProviderName;
  qualityScore: number;
  tokenCount: number;
  breakdown: {
    productContribution: number;
    brandContribution: number;
    audienceContribution: number;
    platformContribution: number;
    templateContribution: number;
    blocksContribution: number;
  };
  warnings: string[];
  suggestions: string[];
}

export interface PromptPlan {
  composed: ComposedPrompt;
  preview: PromptPreviewResult;
}

export interface PreviewPromptDTO {
  prompt: string;
  negativePrompt?: string;
  provider?: VideoProviderName;
  settings?: Partial<VideoGenerationSettings>;
}

export interface PromptVariation {
  type: 'Conservative' | 'Balanced' | 'Creative';
  prompt: string;
  negativePrompt: string;
  creativityLevel: number;
  estimatedCost: number;
  estimatedQuality: number;
  reasoning: string;
}

export interface MultiVariationResult {
  variations: PromptVariation[];
  recommended: 'Conservative' | 'Balanced' | 'Creative';
  reasoning: string;
}

export interface VariationsDTO {
  prompt: string;
  negativePrompt?: string;
  context?: {
    productId?: string;
    brandId?: string;
    audienceId?: string;
  };
}

// ---------- Product ----------
export interface AnalyzeProductDTO {
  product: Record<string, unknown>;
  source?: 'Shopify' | 'Amazon' | 'WooCommerce' | 'AliExpress' | 'Manual' | 'CSV' | 'API';
}

export interface ProductIntelligenceResult {
  productId: string;
  product: Record<string, unknown>;
  textIntelligence: Record<string, unknown>;
  imageIntelligence: Record<string, unknown>;
  videoReadyScore: Record<string, unknown>;
}

export interface ProductAnalysisRecord {
  id: string;
  productId: string;
  workspaceId: string;
  vibe: string | null;
  targetAudience: string | null;
  productType: string | null;
  category: string | null;
  recommendedStyles: string[];
  keywords: string[];
  videoReadyScore: number;
  luxuryScore: number;
  viralScore: number;
  improvements: string[];
  bestImageUrl: string | null;
  dominantColors: string[];
  lighting: string | null;
  backgroundType: string | null;
  needsBackgroundRemoval: boolean;
  needsEnhancement: boolean;
  processedImages: string[];
  rawAnalysis: Record<string, unknown>;
  analyzedAt: string;
}