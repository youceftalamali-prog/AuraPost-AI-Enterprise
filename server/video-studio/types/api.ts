/**
 * API-layer types: request context, response envelopes and DTOs.
 */
import type { VideoGenerationSettings, VideoPlatform, VideoProviderName } from './video.js';
import type { RoutingCriteria } from './providers.js';
import type { VariationType } from './prompt.js';
import type { CampaignGoal } from './brand.js';

/** Populated by the auth middleware from the existing AuraPost session. */
export interface RequestContext {
  userId: string;
  workspaceId: string;
  userEmail?: string;
}

export interface ApiSuccess<T> {
  success: true;
  data: T;
}

export interface ApiFailure {
  success: false;
  error: string;
  code: string;
  details?: unknown;
}

export type ApiResponse<T> = ApiSuccess<T> | ApiFailure;

export interface Paginated<T> {
  items: T[];
  total: number;
  limit: number;
  offset: number;
}

// ---------- Generation DTOs ----------
export interface ComposePromptDTO {
  productId: string;
  templateId: string;
  platform?: VideoPlatform;
  blockIds?: string[];
  customPrompt?: string;
  videoSettings?: VideoGenerationSettings;
}

export interface GenerateVideoDTO {
  productId: string;
  templateId: string;
  platform?: VideoPlatform;
  settings: VideoGenerationSettings;
  blockIds?: string[];
  customPrompt?: string;
}

export interface PreviewPromptDTO {
  prompt: string;
  negativePrompt?: string;
  provider?: VideoProviderName;
  settings?: Partial<VideoGenerationSettings>;
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

// ---------- Provider DTOs ----------
export interface CompareCostDTO {
  prompt: string;
  settings: VideoGenerationSettings;
  providers?: VideoProviderName[];
}

export interface SelectProviderDTO {
  prompt: string;
  settings: VideoGenerationSettings;
  criteria?: RoutingCriteria;
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

// ---------- Brand / audience / campaign DTOs ----------
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

export interface CreateCampaignDTO {
  name: string;
  productId?: string;
  brandId?: string;
  audienceId?: string;
  goal?: CampaignGoal;
  platforms?: VideoPlatform[];
}

export interface GenerateCampaignDTO {
  productId: string;
  platforms?: VideoPlatform[];
}

export type { VariationType };