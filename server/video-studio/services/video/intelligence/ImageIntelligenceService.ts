import type { UnifiedProduct } from '../../../types/video.js';
import type {
  ImageAnalysisResult,
  ImageIntelligenceResult,
  BackgroundType,
  ImageLighting,
  ImageComposition,
} from '../../../types/intelligence.js';

/**
 * Image intelligence based on URL heuristics and (when available)
 * decoded pixel data passed in by the caller. Pixel decoding is kept
 * out of this service so it stays dependency-free and testable; the
 * caller may supply a PixelBuffer per image for deeper analysis.
 */
export interface PixelBuffer {
  width: number;
  height: number;
  data: Uint8ClampedArray;
}

export class ImageIntelligenceService {
  analyze(product: UnifiedProduct, pixelsByIndex: Map<number, PixelBuffer> = new Map()): ImageIntelligenceResult {
    const images = product.images ?? [];
    if (images.length === 0) {
      return {
        images: [],
        bestImageIndex: -1,
        bestImageUrl: '',
        averageQualityScore: 0,
        overallRecommendation: {
          needsBackgroundRemoval: false,
          needsEnhancement: false,
          needsAdditionalImages: true,
        },
      };
    }

    const analyses: ImageAnalysisResult[] = images.map((url, i) =>
      this.analyzeOne(url, pixelsByIndex.get(i))
    );

    let bestIndex = 0;
    let bestScore = -1;
    analyses.forEach((a, i) => {
      const score = a.qualityScore - a.blurScore * 20 + (a.isWhiteBackground ? 10 : 0);
      if (score > bestScore) {
        bestScore = score;
        bestIndex = i;
      }
    });

    const avgQuality = analyses.reduce((s, a) => s + a.qualityScore, 0) / analyses.length;

    return {
      images: analyses,
      bestImageIndex: bestIndex,
      bestImageUrl: images[bestIndex],
      averageQualityScore: avgQuality,
      overallRecommendation: {
        needsBackgroundRemoval: analyses.some((a) => a.needsBackgroundRemoval),
        needsEnhancement: analyses.some((a) => a.needsEnhancement),
        needsAdditionalImages: images.length < 3,
      },
    };
  }

  private analyzeOne(url: string, pixels?: PixelBuffer): ImageAnalysisResult {
    if (!pixels) {
      return this.fallbackAnalysis(url);
    }
    const { width, height, data } = pixels;

    const dominantColors = this.extractColors(data, width, height);
    const backgroundType = this.detectBackground(data, width, height);
    const brightness = this.brightness(data);
    const contrast = this.contrast(data);
    const blur = this.blurScore(data);
    const lighting = this.detectLighting(brightness);
    const quality = this.qualityScore(blur, brightness, contrast, width, height);
    const isWhite = backgroundType === 'White';
    const isLifestyle = backgroundType === 'Lifestyle';

    return {
      imageUrl: url,
      dominantColors,
      backgroundType,
      lighting,
      qualityScore: quality,
      blurScore: blur,
      brightnessScore: brightness,
      contrastScore: contrast,
      productPosition: isWhite || backgroundType === 'Solid' ? { x: 0.2, y: 0.2, width: 0.6, height: 0.6 } : null,
      composition: this.detectComposition(data, width, height),
      isWhiteBackground: isWhite,
      isLifestyle,
      isLuxury: this.detectLuxury(dominantColors, lighting),
      needsBackgroundRemoval: !isWhite && !isLifestyle && backgroundType !== 'Transparent',
      needsEnhancement: quality < 60 || blur > 0.3,
      needsCrop: false,
      recommendedCrop: null,
      width,
      height,
      aspectRatio: height > 0 ? width / height : 1,
    };
  }

  private fallbackAnalysis(url: string): ImageAnalysisResult {
    return {
      imageUrl: url,
      dominantColors: [],
      backgroundType: 'Unknown',
      lighting: 'Unknown',
      qualityScore: 50,
      blurScore: 0.5,
      brightnessScore: 0.5,
      contrastScore: 0.5,
      productPosition: null,
      composition: 'Unknown',
      isWhiteBackground: false,
      isLifestyle: false,
      isLuxury: false,
      needsBackgroundRemoval: false,
      needsEnhancement: false,
      needsCrop: false,
      recommendedCrop: null,
      width: 0,
      height: 0,
      aspectRatio: 1,
    };
  }

  private extractColors(data: Uint8ClampedArray, width: number, height: number): string[] {
    const step = Math.max(1, Math.floor((width * height) / 500));
    const buckets = new Map<string, number>();
    for (let i = 0; i < data.length; i += 4 * step) {
      const r = data[i] >> 5;
      const g = data[i + 1] >> 5;
      const b = data[i + 2] >> 5;
      const key = `${r}-${g}-${b}`;
      buckets.set(key, (buckets.get(key) ?? 0) + 1);
    }
    return Array.from(buckets.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([key]) => {
        const [r, g, b] = key.split('-').map((n) => (parseInt(n, 10) << 5) + 16);
        return `#${[r, g, b].map((n) => n.toString(16).padStart(2, '0')).join('').toUpperCase()}`;
      });
  }

  private detectBackground(data: Uint8ClampedArray, width: number, height: number): BackgroundType {
    const edge: Array<[number, number, number]> = [];
    const step = 4;
    for (let x = 0; x < width; x += step) {
      const top = x * 4;
      const bottom = ((height - 1) * width + x) * 4;
      edge.push([data[top], data[top + 1], data[top + 2]]);
      edge.push([data[bottom], data[bottom + 1], data[bottom + 2]]);
    }
    for (let y = 0; y < height; y += step) {
      const left = y * width * 4;
      const right = (y * width + width - 1) * 4;
      edge.push([data[left], data[left + 1], data[left + 2]]);
      edge.push([data[right], data[right + 1], data[right + 2]]);
    }
    if (edge.length === 0) return 'Unknown';

    const whiteCount = edge.filter(([r, g, b]) => r > 240 && g > 240 && b > 240).length;
    if (whiteCount / edge.length > 0.7) return 'White';

    const avg = edge.reduce((a, [r, g, b]) => [a[0] + r, a[1] + g, a[2] + b], [0, 0, 0]);
    const avgColor: [number, number, number] = [avg[0] / edge.length, avg[1] / edge.length, avg[2] / edge.length];
    const variance = edge.reduce((s, c) => s + this.colorDist(c, avgColor), 0) / edge.length;

    if (variance < 30) return 'Solid';
    if (variance > 80) return 'Lifestyle';
    return 'Complex';
  }

  private detectLighting(brightness: number): ImageLighting {
    if (brightness > 0.7) return 'Studio';
    if (brightness > 0.5) return 'Natural';
    if (brightness > 0.3) return 'Luxury';
    if (brightness > 0.15) return 'Low';
    return 'Harsh';
  }

  private detectComposition(data: Uint8ClampedArray, width: number, height: number): ImageComposition {
    const cx = Math.floor(width / 2);
    const cy = Math.floor(height / 2);
    const ci = (cy * width + cx) * 4;
    const centerGray = 0.299 * data[ci] + 0.587 * data[ci + 1] + 0.114 * data[ci + 2];
    const edgeGray = 0.299 * data[0] + 0.587 * data[1] + 0.114 * data[2];
    const diff = Math.abs(centerGray - edgeGray);
    if (diff > 100) return 'Centered';
    if (diff > 50) return 'RuleOfThirds';
    return 'OffCenter';
  }

  private detectLuxury(colors: string[], lighting: ImageLighting): boolean {
    const luxury = ['#000000', '#FFD700', '#C0C0C0', '#800020', '#FFFFFF'];
    const hasLuxury = colors.some((c) => luxury.some((l) => this.colorDist(this.hexToRgb(c), this.hexToRgb(l)) < 50));
    return hasLuxury && (lighting === 'Studio' || lighting === 'Luxury');
  }

  private brightness(data: Uint8ClampedArray): number {
    let sum = 0;
    let count = 0;
    for (let i = 0; i < data.length; i += 16) {
      sum += (data[i] + data[i + 1] + data[i + 2]) / (3 * 255);
      count++;
    }
    return count > 0 ? sum / count : 0.5;
  }

  private contrast(data: Uint8ClampedArray): number {
    let min = 255;
    let max = 0;
    for (let i = 0; i < data.length; i += 16) {
      const gray = 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2];
      if (gray < min) min = gray;
      if (gray > max) max = gray;
    }
    return (max - min) / 255;
  }

  private blurScore(data: Uint8ClampedArray): number {
    const grays: number[] = [];
    for (let i = 0; i < data.length; i += 16) {
      grays.push(0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2]);
    }
    if (grays.length === 0) return 0.5;
    const mean = grays.reduce((a, b) => a + b, 0) / grays.length;
    const variance = grays.reduce((s, v) => s + (v - mean) ** 2, 0) / grays.length;
    return Math.max(0, Math.min(1, 1 - variance / 5000));
  }

  private qualityScore(blur: number, brightness: number, contrast: number, width: number, height: number): number {
    let score = 100;
    score -= blur * 40;
    if (brightness < 0.2) score -= 20;
    else if (brightness > 0.9) score -= 10;
    if (contrast < 0.3) score -= 20;
    const px = width * height;
    if (px > 0 && px < 500000) score -= 20;
    else if (px > 4000000) score += 10;
    return Math.max(0, Math.min(100, Math.round(score)));
  }

  private colorDist(a: [number, number, number], b: [number, number, number]): number {
    return Math.sqrt((a[0] - b[0]) ** 2 + (a[1] - b[1]) ** 2 + (a[2] - b[2]) ** 2);
  }

  private hexToRgb(hex: string): [number, number, number] {
    const clean = hex.replace('#', '');
    return [
      parseInt(clean.slice(0, 2), 16) || 0,
      parseInt(clean.slice(2, 4), 16) || 0,
      parseInt(clean.slice(4, 6), 16) || 0,
    ];
  }
}

export const imageIntelligenceService = new ImageIntelligenceService();