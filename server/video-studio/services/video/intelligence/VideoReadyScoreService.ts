import type { UnifiedProduct } from '../../../types/video.js';
import type {
  TextIntelligenceResult,
  ImageIntelligenceResult,
  VideoReadyScoreResult,
  VideoReadyVerdict,
} from '../../../types/intelligence.js';

export class VideoReadyScoreService {
  compute(
    product: UnifiedProduct,
    text: TextIntelligenceResult,
    image: ImageIntelligenceResult
  ): VideoReadyScoreResult {
    const breakdown = {
      imagesScore: this.imagesScore(image),
      descriptionScore: this.descriptionScore(product),
      qualityScore: this.qualityScore(image),
      imageCountScore: this.imageCountScore(product),
      productClarityScore: this.clarityScore(image),
      backgroundScore: this.backgroundScore(image),
      lightingScore: this.lightingScore(image),
      categoryScore: this.categoryScore(text),
    };

    const score = Math.round(
      breakdown.imagesScore * 0.2 +
        breakdown.descriptionScore * 0.15 +
        breakdown.qualityScore * 0.2 +
        breakdown.imageCountScore * 0.1 +
        breakdown.productClarityScore * 0.15 +
        breakdown.backgroundScore * 0.1 +
        breakdown.lightingScore * 0.05 +
        breakdown.categoryScore * 0.05
    );

    return {
      score,
      breakdown,
      improvements: this.buildImprovements(breakdown, image, text),
      verdict: this.verdict(score),
    };
  }

  private imagesScore(image: ImageIntelligenceResult): number {
    return image.images.length === 0 ? 0 : image.averageQualityScore;
  }

  private descriptionScore(product: UnifiedProduct): number {
    const len = (product.description ?? '').length;
    if (len === 0) return 0;
    if (len < 50) return 30;
    if (len < 150) return 60;
    if (len < 300) return 80;
    return 100;
  }

  private qualityScore(image: ImageIntelligenceResult): number {
    return image.images.length === 0 ? 0 : image.averageQualityScore;
  }

  private imageCountScore(product: UnifiedProduct): number {
    const n = (product.images ?? []).length;
    if (n === 0) return 0;
    if (n === 1) return 40;
    if (n === 2) return 60;
    if (n === 3) return 80;
    if (n >= 5) return 100;
    return 90;
  }

  private clarityScore(image: ImageIntelligenceResult): number {
    if (image.images.length === 0) return 0;
    const avgBlur = image.images.reduce((s, i) => s + i.blurScore, 0) / image.images.length;
    return Math.round((1 - avgBlur) * 100);
  }

  private backgroundScore(image: ImageIntelligenceResult): number {
    if (image.images.length === 0) return 0;
    const clean = image.images.filter((i) => i.isWhiteBackground || i.backgroundType === 'Transparent').length;
    return Math.round((clean / image.images.length) * 100);
  }

  private lightingScore(image: ImageIntelligenceResult): number {
    if (image.images.length === 0) return 0;
    const good = image.images.filter((i) => ['Studio', 'Natural', 'Luxury'].includes(i.lighting)).length;
    return Math.round((good / image.images.length) * 100);
  }

  private categoryScore(text: TextIntelligenceResult): number {
    return text.category === 'General' ? 50 : 100;
  }

  private buildImprovements(
    b: VideoReadyScoreResult['breakdown'],
    image: ImageIntelligenceResult,
    text: TextIntelligenceResult
  ): string[] {
    const list: string[] = [];
    if (b.descriptionScore < 60) list.push('Add a more detailed product description (150+ characters).');
    if (b.imageCountScore < 60) list.push('Add more product images (3-5 high-quality images).');
    if (b.qualityScore < 60) list.push('Use higher-resolution images (1000x1000+).');
    if (b.productClarityScore < 60) list.push('Use sharper, non-blurry images.');
    if (b.backgroundScore < 60) list.push('Use white or transparent backgrounds.');
    if (b.lightingScore < 60) list.push('Improve lighting (studio or natural light).');
    if (image.overallRecommendation.needsBackgroundRemoval) list.push('Remove backgrounds from product images.');
    if (image.overallRecommendation.needsEnhancement) list.push('Enhance image brightness/contrast/sharpness.');
    if (text.category === 'General') list.push('Add product category tags for better templates.');
    return list.slice(0, 5);
  }

  private verdict(score: number): VideoReadyVerdict {
    if (score >= 80) return 'Excellent';
    if (score >= 60) return 'Good';
    if (score >= 40) return 'Fair';
    return 'Poor';
  }
}

export const videoReadyScoreService = new VideoReadyScoreService();