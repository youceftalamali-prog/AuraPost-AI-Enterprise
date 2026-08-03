/**
 * Prompt-orchestration types: composition, optimization, variations,
 * negative prompts and preview.
 */
import type { VideoGenerationSettings, VideoProviderName } from './video.js';

export type PromptBlockCategory =
  | 'Style'
  | 'Platform'
  | 'Format'
  | 'Technique'
  | 'Mood'
  | 'Camera'
  | 'Lighting'
  | 'Pacing';

export interface PromptCompositionInput {
  productId: string;
  workspaceId: string;
  templateId?: string;
  brandId?: string;
  audienceId?: string;
  campaignId?: string;
  platform?: string;
  blockIds?: string[];
  customInstructions?: string;
  videoSettings?: VideoGenerationSettings;
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
  createdAt: Date;
}

export interface OptimizationResult {
  originalPrompt: string;
  optimizedPrompt: string;
  originalTokenCount: number;
  optimizedTokenCount: number;
  tokenReduction: number;
  qualityPreserved: boolean;
  optimizations: string[];
  costSavings: number;
}

export interface NegativePromptResult {
  negativePrompt: string;
  safetyPrompt: string;
  qualityPrompt: string;
  cameraRestrictions: string;
  artifactPrevention: string;
  combined: string;
}

export type VariationType = 'Conservative' | 'Balanced' | 'Creative';

export interface PromptVariation {
  type: VariationType;
  prompt: string;
  negativePrompt: string;
  creativityLevel: number;
  estimatedCost: number;
  estimatedQuality: number;
  reasoning: string;
}

export interface MultiVariationResult {
  variations: PromptVariation[];
  recommended: VariationType;
  reasoning: string;
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