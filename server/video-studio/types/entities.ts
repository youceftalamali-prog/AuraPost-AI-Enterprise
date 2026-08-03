/**
 * Entity types for the Video Studio module.
 *
 * Select-side types are inferred directly from the Drizzle schema
 * (InferSelectModel), which works correctly.
 *
 * Insert-side ("New*") types are written out explicitly here instead of via
 * InferInsertModel. Verified root cause: InferInsertModel's recursive mapped
 * type degrades (silently drops most optional columns) specifically when
 * type-checked as part of this program's full file set - the exact same
 * schema definitions type-check correctly in isolation. This is a Drizzle/TS
 * type-inference interaction, not a schema or runtime bug: the actual SQL
 * Drizzle generates at runtime is driven by the real column objects, not
 * these type-level helpers, so nothing here affects behavior - only
 * compile-time accuracy for callers constructing insert/update payloads.
 * Kept in sync manually with db/schema/*.ts; each field's optionality below
 * mirrors that column's nullability/default in the schema.
 */
import type { InferSelectModel } from 'drizzle-orm';
import {
  videoTemplates,
  favoriteTemplates,
} from '../db/schema/videoTemplates.js';
import { promptBlocks } from '../db/schema/promptBlocks.js';
import { videoCache } from '../db/schema/videoCache.js';
import { videoHistory } from '../db/schema/videoHistory.js';
import { productVideoAnalysis } from '../db/schema/productAnalysis.js';
import {
  brandProfiles,
  audienceProfiles,
  campaignProfiles,
  campaignGenerations,
} from '../db/schema/brand.js';
import {
  videoProviders,
  providerStatistics,
  providerHealth,
  providerJobs,
  providerCosts,
  providerSettings,
} from '../db/schema/providers.js';

// ---------- video templates ----------
export type VideoTemplate = InferSelectModel<typeof videoTemplates>;
export interface NewVideoTemplate {
  id?: string;
  category: string;
  subcategory?: string | null;
  name: string;
  description?: string | null;
  style?: string | null;
  platform?: string | null;
  difficulty?: string;
  popularity?: number;
  thumbnailUrl?: string | null;
  previewUrl?: string | null;
  basePromptTemplate: string;
  supportedModels?: string[];
  estimatedDuration?: number;
  estimatedCost?: string;
  metadata?: Record<string, unknown>;
  isActive?: boolean;
  createdAt?: Date;
  updatedAt?: Date;
}

export type FavoriteTemplate = InferSelectModel<typeof favoriteTemplates>;
export interface NewFavoriteTemplate {
  id?: string;
  userId: string;
  templateId: string;
  createdAt?: Date;
}

// ---------- prompt blocks ----------
export type PromptBlock = InferSelectModel<typeof promptBlocks>;
export interface NewPromptBlock {
  id?: string;
  name: string;
  category: string;
  description?: string | null;
  promptFragment: string;
  negativeFragment?: string | null;
  tags?: string[];
  popularity?: number;
  costMultiplier?: string;
  qualityImpact?: string;
  isActive?: boolean;
  createdAt?: Date;
  updatedAt?: Date;
}

// ---------- video cache ----------
export type VideoCacheRecord = InferSelectModel<typeof videoCache>;
export interface NewVideoCacheRecord {
  id?: string;
  cacheHash: string;
  prompt: string;
  settings?: Record<string, unknown>;
  videoUrl: string;
  thumbnailUrl?: string | null;
  provider: string;
  model: string;
  duration?: number | null;
  resolution?: string | null;
  cost?: string;
  usageCount?: number;
  lastUsedAt?: Date;
  expiresAt?: Date | null;
  createdAt?: Date;
}

// ---------- video history ----------
export type VideoHistoryRecord = InferSelectModel<typeof videoHistory>;
export interface NewVideoHistoryRecord {
  id?: string;
  jobId?: string | null;
  userId: string;
  workspaceId: string;
  productId?: string | null;
  templateId?: string | null;
  videoUrl: string;
  thumbnailUrl?: string | null;
  title?: string | null;
  description?: string | null;
  tags?: string[];
  platform?: string | null;
  provider?: string | null;
  estimatedCost?: string | null;
  isFavorite?: boolean;
  isPublished?: boolean;
  publishedAt?: Date | null;
  createdAt?: Date;
}

// ---------- product analysis ----------
export type ProductVideoAnalysisRecord = InferSelectModel<typeof productVideoAnalysis>;
export interface NewProductVideoAnalysisRecord {
  id?: string;
  productId: string;
  workspaceId: string;
  vibe?: string | null;
  targetAudience?: string | null;
  productType?: string | null;
  category?: string | null;
  recommendedStyles?: string[];
  keywords?: string[];
  videoReadyScore?: number;
  luxuryScore?: number;
  viralScore?: number;
  improvements?: string[];
  bestImageUrl?: string | null;
  dominantColors?: string[];
  lighting?: string | null;
  backgroundType?: string | null;
  needsBackgroundRemoval?: boolean;
  needsEnhancement?: boolean;
  processedImages?: string[];
  rawAnalysis?: Record<string, unknown>;
  analyzedAt?: Date;
}

// ---------- brand / audience / campaign ----------
export type BrandProfileRecord = InferSelectModel<typeof brandProfiles>;
export interface NewBrandProfileRecord {
  id?: string;
  workspaceId: string;
  name: string;
  logoUrl?: string | null;
  colors?: string[];
  fonts?: string[];
  tone?: string | null;
  voice?: string | null;
  personality?: string[];
  values?: string[];
  luxuryLevel?: number;
  visualIdentity?: string | null;
  writingStyle?: string | null;
  ctaStyle?: string | null;
  description?: string | null;
  website?: string | null;
  analysis?: Record<string, unknown>;
  createdAt?: Date;
  updatedAt?: Date;
}

export type AudienceProfileRecord = InferSelectModel<typeof audienceProfiles>;
export interface NewAudienceProfileRecord {
  id?: string;
  workspaceId: string;
  name: string;
  ageGroup: string;
  gender: string;
  interests?: string[];
  buyingIntent?: string;
  incomeLevel?: string;
  lifestyle?: string[];
  location?: string[];
  language?: string | null;
  analysis?: Record<string, unknown>;
  createdAt?: Date;
  updatedAt?: Date;
}

export type CampaignProfileRecord = InferSelectModel<typeof campaignProfiles>;
export interface NewCampaignProfileRecord {
  id?: string;
  workspaceId: string;
  name: string;
  productId?: string | null;
  brandId?: string | null;
  audienceId?: string | null;
  goal?: string;
  platforms?: string[];
  status?: string;
  startDate?: Date | null;
  endDate?: Date | null;
  createdAt?: Date;
  updatedAt?: Date;
}

export type CampaignGenerationRecord = InferSelectModel<typeof campaignGenerations>;
export interface NewCampaignGenerationRecord {
  id?: string;
  campaignId: string;
  workspaceId: string;
  platform: string;
  videoConcept: string;
  caption: string;
  hook: string;
  cta: string;
  hashtags?: string[];
  thumbnailIdea?: string | null;
  publishingStrategy?: Record<string, unknown>;
  prompt: string;
  negativePrompt?: string | null;
  templateId?: string | null;
  estimatedCost?: string | null;
  estimatedDuration?: number | null;
  createdAt?: Date;
}

// ---------- providers ----------
export type VideoProviderRecord = InferSelectModel<typeof videoProviders>;
export interface NewVideoProviderRecord {
  id?: string;
  name: string;
  displayName: string;
  tier?: string;
  baseUrl: string;
  apiKeyEnvVar: string;
  supportedModels?: string[];
  defaultModel: string;
  maxDuration?: number;
  supportedAspectRatios?: string[];
  supportedResolutions?: string[];
  pricing?: Record<string, unknown>;
  rateLimits?: Record<string, unknown>;
  features?: Record<string, unknown>;
  priority?: number;
  isActive?: boolean;
  createdAt?: Date;
  updatedAt?: Date;
}

export type ProviderStatisticsRecord = InferSelectModel<typeof providerStatistics>;
export interface NewProviderStatisticsRecord {
  id?: string;
  provider: string;
  workspaceId?: string | null;
  period?: string;
  totalJobs?: number;
  successfulJobs?: number;
  failedJobs?: number;
  cancelledJobs?: number;
  successRate?: string;
  averageGenerationTime?: number;
  averageCost?: string;
  totalCost?: string;
  totalDuration?: number;
  lastResponseTime?: number;
  lastJobAt?: Date | null;
  updatedAt?: Date;
}

export type ProviderHealthRecord = InferSelectModel<typeof providerHealth>;
export interface NewProviderHealthRecord {
  id?: string;
  provider: string;
  status?: string;
  availability?: string;
  averageResponseTime?: number;
  successRate?: string;
  failureRate?: string;
  currentQueueSize?: number;
  lastChecked?: Date;
  lastSuccess?: Date | null;
  lastFailure?: Date | null;
  consecutiveFailures?: number;
  uptime?: string;
}

export type ProviderJobRecord = InferSelectModel<typeof providerJobs>;
export interface NewProviderJobRecord {
  id?: string;
  provider: string;
  externalJobId?: string | null;
  workspaceId: string;
  userId: string;
  productId?: string | null;
  templateId?: string | null;
  prompt: string;
  negativePrompt?: string | null;
  model: string;
  settings?: Record<string, unknown>;
  status?: string;
  progress?: number;
  resultUrl?: string | null;
  thumbnailUrl?: string | null;
  duration?: number | null;
  resolution?: string | null;
  aspectRatio?: string | null;
  cacheHash?: string | null;
  errorMessage?: string | null;
  retryCount?: number;
  priority?: number;
  estimatedCost?: string | null;
  actualCost?: string | null;
  startedAt?: Date | null;
  completedAt?: Date | null;
  createdAt?: Date;
}

export type ProviderCostRecord = InferSelectModel<typeof providerCosts>;
export interface NewProviderCostRecord {
  id?: string;
  provider: string;
  model: string;
  workspaceId?: string | null;
  jobId?: string | null;
  estimatedCost: string;
  actualCost?: string | null;
  currency?: string;
  duration?: number | null;
  resolution?: string | null;
  quality?: string | null;
  createdAt?: Date;
}

export type ProviderSettingsRecord = InferSelectModel<typeof providerSettings>;
export interface NewProviderSettingsRecord {
  id?: string;
  workspaceId: string;
  autoRouting?: boolean;
  defaultProvider?: string;
  fallbackEnabled?: boolean;
  fallbackChain?: string[];
  maxCostPerVideo?: string;
  preferredQuality?: string;
  apiKeys?: Record<string, string>;
  customPriorities?: Record<string, number>;
  excludedProviders?: string[];
  createdAt?: Date;
  updatedAt?: Date;
}
