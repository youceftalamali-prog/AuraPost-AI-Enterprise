/**
 * Brand / audience / campaign domain types used by services and DTOs.
 * (Persisted row shapes live in entities.ts; these are the domain views.)
 */
import type { VideoPlatform } from './video.js';
import type { BrandAnalysis, AudienceAnalysis } from './intelligence.js';

export interface BrandKit {
  id: string;
  workspaceId: string;
  name: string;
  logoUrl?: string | null;
  colors: string[];
  fonts: string[];
  tone?: string | null;
  voice?: string | null;
  personality: string[];
  values: string[];
  luxuryLevel: number;
  visualIdentity?: string | null;
  writingStyle?: string | null;
  ctaStyle?: string | null;
  description?: string | null;
  website?: string | null;
  analysis?: BrandAnalysis | null;
}

export interface AudienceInsight {
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
  language?: string | null;
  analysis?: AudienceAnalysis | null;
}

export type CampaignGoal = 'Awareness' | 'Engagement' | 'Conversion' | 'Retention';
export type CampaignStatus = 'Draft' | 'Active' | 'Completed' | 'Paused';

export interface CampaignGenerationResult {
  platform: VideoPlatform;
  videoConcept: string;
  caption: string;
  hook: string;
  cta: string;
  hashtags: string[];
  thumbnailIdea: string;
  publishingStrategy: {
    bestTime: string;
    bestDay: string;
    frequency: string;
  };
  prompt: string;
  negativePrompt: string;
  templateId?: string | null;
  estimatedCost: number;
  estimatedDuration: number;
}

export interface CampaignIntelligenceResult {
  campaignId: string;
  generations: CampaignGenerationResult[];
  overallStrategy: {
    theme: string;
    messaging: string[];
    visualDirection: string;
    keyBenefits: string[];
  };
}