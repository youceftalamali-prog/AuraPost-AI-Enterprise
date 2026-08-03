import { brandRepository } from '../../../repositories/BrandRepository.js';
import type { BrandProfileRecord } from '../../../types/entities.js';
import type { BrandAnalysis } from '../../../types/intelligence.js';

const COLOR_MOOD: Array<{ hex: string; mood: string }> = [
  { hex: '#000000', mood: 'Luxury' },
  { hex: '#FFD700', mood: 'Luxury' },
  { hex: '#FFFFFF', mood: 'Minimal' },
  { hex: '#C0C0C0', mood: 'Premium' },
  { hex: '#800020', mood: 'Luxury' },
  { hex: '#FF6B4A', mood: 'Bold' },
  { hex: '#43D9A3', mood: 'Modern' },
  { hex: '#56C8F5', mood: 'Modern' },
];

/**
 * Derives a brand's visual/verbal identity from its kit and produces
 * concrete recommendations (video styles, music, voice, CTA patterns).
 */
export class BrandIntelligenceService {
  async analyze(brandId: string): Promise<{ brand: BrandProfileRecord; analysis: BrandAnalysis }> {
    const brand = await brandRepository.findById(brandId);
    if (!brand) throw new Error('Brand not found');

    const analysis = this.compute(brand);
    await brandRepository.saveAnalysis(brandId, analysis as unknown as Record<string, unknown>);
    return { brand, analysis };
  }

  compute(brand: BrandProfileRecord): BrandAnalysis {
    const colors = brand.colors ?? [];
    const tone = brand.tone ?? 'Professional';

    const luxuryScore = this.scoreFromSignals(brand.luxuryLevel, colors, ['Luxury', 'Premium'], tone);
    const modernScore = this.scoreFromSignals(50, colors, ['Modern'], tone);
    const playfulScore = this.scoreFromSignals(30, colors, ['Bold'], tone);
    const professionalScore = this.scoreFromSignals(60, [], [], tone);

    const visualStyle = this.pickVisualStyle(luxuryScore, modernScore, playfulScore, professionalScore);

    return {
      visualStyle,
      voiceProfile: {
        tone,
        personality: brand.personality ?? [],
        values: brand.values ?? [],
        language: 'en',
      },
      luxuryScore,
      modernScore,
      playfulScore,
      professionalScore,
      ctaPatterns: this.ctaPatterns(visualStyle),
      recommendedVideoStyles: this.recommendedVideoStyles(visualStyle),
      recommendedMusic: this.recommendedMusic(visualStyle),
      recommendedVoice: this.recommendedVoice(visualStyle, tone),
      confidence: this.confidence(brand),
    };
  }

  private scoreFromSignals(
    base: number,
    colors: string[],
    moods: string[],
    tone: string
  ): number {
    let score = base;
    const upperColors = colors.map((c) => c.toUpperCase());
    for (const { hex, mood } of COLOR_MOOD) {
      if (upperColors.includes(hex) && moods.includes(mood)) score += 15;
    }
    const toneLower = tone.toLowerCase();
    if (moods.some((m) => toneLower.includes(m.toLowerCase()))) score += 20;
    return Math.max(0, Math.min(100, score));
  }

  private pickVisualStyle(luxury: number, modern: number, playful: number, professional: number): string {
    const entries: Array<[string, number]> = [
      ['Luxury', luxury],
      ['Modern', modern],
      ['Playful', playful],
      ['Corporate', professional],
    ];
    entries.sort((a, b) => b[1] - a[1]);
    return entries[0][0];
  }

  private ctaPatterns(visualStyle: string): string[] {
    const map: Record<string, string[]> = {
      Luxury: ['Discover', 'Experience', 'Indulge', 'Explore the Collection'],
      Modern: ['Shop Now', 'Get Yours', 'Try It Today'],
      Playful: ['Grab Yours', 'Join the Fun', 'Shop Now'],
      Corporate: ['Learn More', 'Get Started', 'Request a Demo'],
    };
    return map[visualStyle] ?? ['Shop Now', 'Learn More'];
  }

  private recommendedVideoStyles(visualStyle: string): string[] {
    const map: Record<string, string[]> = {
      Luxury: ['Cinematic', 'Elegant', 'Macro'],
      Modern: ['Minimal', 'Clean', 'Dynamic'],
      Playful: ['Dynamic', 'Colorful', 'Lifestyle'],
      Corporate: ['Professional', 'Clean', 'Explainer'],
    };
    return map[visualStyle] ?? ['Cinematic', 'Modern'];
  }

  private recommendedMusic(visualStyle: string): string[] {
    const map: Record<string, string[]> = {
      Luxury: ['Elegant Classical', 'Sophisticated Piano', 'Luxury Ambient'],
      Modern: ['Modern Electronic', 'Upbeat', 'Contemporary'],
      Playful: ['Upbeat Pop', 'Energetic', 'Happy'],
      Corporate: ['Corporate Ambient', 'Inspiring', 'Professional'],
    };
    return map[visualStyle] ?? ['Modern Electronic'];
  }

  private recommendedVoice(visualStyle: string, tone: string): string {
    if (visualStyle === 'Luxury') return 'Sophisticated Female';
    if (visualStyle === 'Corporate') return 'Professional Male';
    if (visualStyle === 'Playful') return 'Friendly Female';
    if (tone.toLowerCase().includes('bold')) return 'Energetic Male';
    return 'Neutral Male';
  }

  private confidence(brand: BrandProfileRecord): number {
    let c = 0.4;
    if ((brand.colors ?? []).length > 0) c += 0.2;
    if (brand.tone) c += 0.15;
    if ((brand.personality ?? []).length > 0) c += 0.1;
    if (brand.logoUrl) c += 0.1;
    if (brand.description) c += 0.05;
    return Math.min(1, c);
  }
}

export const brandIntelligenceService = new BrandIntelligenceService();