/**
 * Product / brand / audience intelligence result types.
 */
import type { UnifiedProduct } from './video.js';

export type ProductVibe =
  | 'Luxury'
  | 'Casual'
  | 'Premium'
  | 'Budget'
  | 'Modern'
  | 'Classic'
  | 'Minimal'
  | 'Bold';

export interface TextIntelligenceResult {
  category: string;
  subcategory: string;
  productType: string;
  targetAudience: string[];
  marketingAngle: string[];
  emotionalTriggers: string[];
  painPoints: string[];
  benefits: string[];
  luxuryScore: number;
  viralScore: number;
  vibe: ProductVibe;
  ctaSuggestions: string[];
  keywords: string[];
  language: string;
  confidence: number;
  analysisMethod: 'ai' | 'rule-based';
}

export type BackgroundType =
  | 'White'
  | 'Transparent'
  | 'Solid'
  | 'Gradient'
  | 'Lifestyle'
  | 'Complex'
  | 'Unknown';

export type ImageLighting = 'Studio' | 'Natural' | 'Low' | 'Harsh' | 'Luxury' | 'Unknown';
export type ImageComposition = 'Centered' | 'RuleOfThirds' | 'OffCenter' | 'Unknown';

export interface ImageAnalysisResult {
  imageUrl: string;
  dominantColors: string[];
  backgroundType: BackgroundType;
  lighting: ImageLighting;
  qualityScore: number;
  blurScore: number;
  brightnessScore: number;
  contrastScore: number;
  productPosition: { x: number; y: number; width: number; height: number } | null;
  composition: ImageComposition;
  isWhiteBackground: boolean;
  isLifestyle: boolean;
  isLuxury: boolean;
  needsBackgroundRemoval: boolean;
  needsEnhancement: boolean;
  needsCrop: boolean;
  recommendedCrop: { x: number; y: number; width: number; height: number } | null;
  width: number;
  height: number;
  aspectRatio: number;
}

export interface ImageIntelligenceResult {
  images: ImageAnalysisResult[];
  bestImageIndex: number;
  bestImageUrl: string;
  averageQualityScore: number;
  overallRecommendation: {
    needsBackgroundRemoval: boolean;
    needsEnhancement: boolean;
    needsAdditionalImages: boolean;
  };
}

export type VideoReadyVerdict = 'Excellent' | 'Good' | 'Fair' | 'Poor';

export interface VideoReadyScoreResult {
  score: number;
  breakdown: {
    imagesScore: number;
    descriptionScore: number;
    qualityScore: number;
    imageCountScore: number;
    productClarityScore: number;
    backgroundScore: number;
    lightingScore: number;
    categoryScore: number;
  };
  improvements: string[];
  verdict: VideoReadyVerdict;
}

export interface BrandAnalysis {
  visualStyle: string;
  voiceProfile: {
    tone: string;
    personality: string[];
    values: string[];
    language: string;
  };
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

export interface AudienceAnalysis {
  emotionalTriggers: string[];
  painPoints: string[];
  aspirations: string[];
  preferredStyle: string[];
  preferredVideoPace: 'Slow' | 'Medium' | 'Fast' | 'Dynamic';
  preferredCTA: string[];
  preferredPlatforms: string[];
  preferredMusic: string[];
  preferredHooks: string[];
  engagementPatterns: {
    bestTimeOfDay: string;
    bestDaysOfWeek: string[];
    averageWatchTime: number;
  };
  conversionDrivers: string[];
  objections: string[];
  confidence: number;
}

export interface ProductIntelligenceResult {
  productId: string;
  product: UnifiedProduct;
  textIntelligence: TextIntelligenceResult;
  imageIntelligence: ImageIntelligenceResult;
  videoReadyScore: VideoReadyScoreResult;
}