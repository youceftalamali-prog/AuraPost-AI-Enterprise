import type { UnifiedProduct } from '../../../types/video.js';
import type { ProductIntelligenceResult } from '../../../types/intelligence.js';
import { productAnalysisRepository } from '../../../repositories/ProductAnalysisRepository.js';
import { textIntelligenceService } from './TextIntelligenceService.js';
import { imageIntelligenceService, type PixelBuffer } from './ImageIntelligenceService.js';
import { videoReadyScoreService } from './VideoReadyScoreService.js';

/**
 * Orchestrates product analysis: text + image intelligence + video-ready
 * score, and persists the result for reuse by downstream services.
 */
export class ProductIntelligenceService {
  async analyze(
    productId: string,
    workspaceId: string,
    product: UnifiedProduct,
    pixelsByIndex: Map<number, PixelBuffer> = new Map()
  ): Promise<ProductIntelligenceResult> {
    const textIntelligence = textIntelligenceService.analyze(product);
    const imageIntelligence = imageIntelligenceService.analyze(product, pixelsByIndex);
    const videoReadyScore = videoReadyScoreService.compute(product, textIntelligence, imageIntelligence);

    await productAnalysisRepository.upsert(productId, workspaceId, {
      vibe: textIntelligence.vibe,
      targetAudience: textIntelligence.targetAudience[0] ?? 'General',
      productType: textIntelligence.productType,
      category: textIntelligence.category,
      recommendedStyles: textIntelligence.marketingAngle,
      keywords: textIntelligence.keywords,
      videoReadyScore: videoReadyScore.score,
      luxuryScore: textIntelligence.luxuryScore,
      viralScore: textIntelligence.viralScore,
      improvements: videoReadyScore.improvements,
      bestImageUrl: imageIntelligence.bestImageUrl || null,
      dominantColors: imageIntelligence.images[0]?.dominantColors ?? [],
      lighting: imageIntelligence.images[0]?.lighting ?? null,
      backgroundType: imageIntelligence.images[0]?.backgroundType ?? null,
      needsBackgroundRemoval: imageIntelligence.overallRecommendation.needsBackgroundRemoval,
      needsEnhancement: imageIntelligence.overallRecommendation.needsEnhancement,
      processedImages: [],
      rawAnalysis: {
        text: textIntelligence,
        image: {
          bestImageIndex: imageIntelligence.bestImageIndex,
          averageQualityScore: imageIntelligence.averageQualityScore,
          recommendation: imageIntelligence.overallRecommendation,
        },
      },
    });

    return { productId, product, textIntelligence, imageIntelligence, videoReadyScore };
  }
}

export const productIntelligenceService = new ProductIntelligenceService();