import { audienceRepository } from '../../../repositories/AudienceRepository.js';
import type { AudienceProfileRecord } from '../../../types/entities.js';
import type { AudienceAnalysis } from '../../../types/intelligence.js';

/**
 * Derives audience psychology (triggers, aspirations, preferred pace,
 * platforms, hooks) from an audience profile.
 */
export class AudienceIntelligenceService {
  async analyze(audienceId: string): Promise<{ audience: AudienceProfileRecord; analysis: AudienceAnalysis }> {
    const audience = await audienceRepository.findById(audienceId);
    if (!audience) throw new Error('Audience not found');

    const analysis = this.compute(audience);
    await audienceRepository.saveAnalysis(audienceId, analysis as unknown as Record<string, unknown>);
    return { audience, analysis };
  }

  compute(audience: AudienceProfileRecord): AudienceAnalysis {
    const age = audience.ageGroup;
    const income = audience.incomeLevel;
    const intent = audience.buyingIntent;

    return {
      emotionalTriggers: this.triggers(age, income, intent),
      painPoints: this.painPoints(age),
      aspirations: this.aspirations(age, income),
      preferredStyle: this.preferredStyle(age, income),
      preferredVideoPace: this.preferredPace(age),
      preferredCTA: this.preferredCTA(intent, income),
      preferredPlatforms: this.preferredPlatforms(age),
      preferredMusic: this.preferredMusic(age),
      preferredHooks: this.preferredHooks(age, intent),
      engagementPatterns: this.engagementPatterns(age),
      conversionDrivers: this.conversionDrivers(income, intent),
      objections: this.objections(income),
      confidence: this.confidence(audience),
    };
  }

  private triggers(age: string, income: string, intent: string): string[] {
    const t: string[] = [];
    if (age === 'Teens' || age === 'Kids') t.push('Social Proof', 'FOMO', 'Trending');
    if (age === 'Adults' || age === 'Professionals') t.push('Quality', 'Trust', 'Value');
    if (income === 'Luxury' || income === 'Upper-Middle') t.push('Exclusivity', 'Status');
    if (income === 'Budget') t.push('Savings', 'Deal');
    if (intent === 'Impulse') t.push('Urgency', 'Scarcity');
    return t.length > 0 ? t : ['Quality', 'Trust'];
  }

  private painPoints(age: string): string[] {
    const map: Record<string, string[]> = {
      Teens: ['Fitting in', 'Self-expression', 'Limited budget'],
      Kids: ['Boredom', 'Comfort'],
      'Young Adults': ['Career growth', 'Work-life balance', 'Affordability'],
      Adults: ['Time management', 'Quality concerns', 'Value for money'],
      Seniors: ['Ease of use', 'Reliability', 'Customer support'],
      Professionals: ['Efficiency', 'Productivity', 'ROI'],
    };
    return map[age] ?? ['Quality concerns', 'Value for money'];
  }

  private aspirations(age: string, income: string): string[] {
    const a: string[] = [];
    if (income === 'Luxury') a.push('Premium lifestyle', 'Status', 'Exclusivity');
    if (age === 'Teens') a.push('Trending style', 'Social acceptance');
    if (age === 'Adults') a.push('Better quality of life', 'Smart choices');
    if (age === 'Professionals') a.push('Career success', 'Efficiency');
    return a.length > 0 ? a : ['Better lifestyle'];
  }

  private preferredStyle(age: string, income: string): string[] {
    if (income === 'Luxury') return ['Cinematic', 'Elegant', 'Premium'];
    if (age === 'Teens' || age === 'Kids') return ['Dynamic', 'Colorful', 'Trendy'];
    if (age === 'Adults' || age === 'Professionals') return ['Clean', 'Professional', 'Modern'];
    return ['Modern', 'Lifestyle'];
  }

  private preferredPace(age: string): AudienceAnalysis['preferredVideoPace'] {
    if (age === 'Teens' || age === 'Kids') return 'Fast';
    if (age === 'Seniors') return 'Slow';
    if (age === 'Adults') return 'Medium';
    return 'Dynamic';
  }

  private preferredCTA(intent: string, income: string): string[] {
    if (intent === 'Impulse') return ['Shop Now', 'Buy Today', 'Limited Offer'];
    if (income === 'Luxury') return ['Discover', 'Experience', 'Explore'];
    if (intent === 'Low') return ['Learn More', 'See More'];
    return ['Shop Now', 'Get Yours'];
  }

  private preferredPlatforms(age: string): string[] {
    if (age === 'Teens' || age === 'Kids') return ['TikTok', 'Instagram', 'YouTube'];
    if (age === 'Adults') return ['Instagram', 'Facebook', 'YouTube'];
    if (age === 'Seniors') return ['Facebook', 'YouTube'];
    if (age === 'Professionals') return ['YouTube', 'Instagram'];
    return ['Instagram', 'TikTok'];
  }

  private preferredMusic(age: string): string[] {
    if (age === 'Teens' || age === 'Kids') return ['Trending Pop', 'Upbeat', 'Viral'];
    if (age === 'Adults') return ['Modern', 'Ambient', 'Inspiring'];
    if (age === 'Seniors') return ['Classic', 'Soft', 'Relaxing'];
    return ['Modern', 'Upbeat'];
  }

  private preferredHooks(age: string, intent: string): string[] {
    const h: string[] = [];
    if (age === 'Teens') h.push("You won't believe this", 'This is trending', 'Must-watch');
    if (age === 'Adults') h.push('Discover the difference', 'Upgrade your routine');
    if (intent === 'Impulse') h.push('Only today', 'Selling fast');
    return h.length > 0 ? h : ['Discover', 'Watch this'];
  }

  private engagementPatterns(age: string): AudienceAnalysis['engagementPatterns'] {
    if (age === 'Teens' || age === 'Kids') {
      return { bestTimeOfDay: 'After School', bestDaysOfWeek: ['Friday', 'Saturday', 'Sunday'], averageWatchTime: 12 };
    }
    if (age === 'Adults' || age === 'Professionals') {
      return { bestTimeOfDay: 'Evening', bestDaysOfWeek: ['Monday', 'Wednesday', 'Friday'], averageWatchTime: 25 };
    }
    if (age === 'Seniors') {
      return { bestTimeOfDay: 'Morning', bestDaysOfWeek: ['Tuesday', 'Thursday'], averageWatchTime: 40 };
    }
    return { bestTimeOfDay: 'Evening', bestDaysOfWeek: ['Wednesday', 'Saturday'], averageWatchTime: 18 };
  }

  private conversionDrivers(income: string, intent: string): string[] {
    const d: string[] = ['Social proof', 'Reviews'];
    if (income === 'Budget') d.push('Discount', 'Free shipping', 'Money-back guarantee');
    if (income === 'Luxury') d.push('Exclusivity', 'Premium quality', 'Limited edition');
    if (intent === 'Impulse') d.push('Flash sale', 'Countdown', 'Low stock');
    return d;
  }

  private objections(income: string): string[] {
    if (income === 'Budget') return ['Price too high', 'Not worth it', 'Can find cheaper'];
    if (income === 'Luxury') return ['Is it authentic?', 'Is it exclusive enough?'];
    return ['Not sure about quality', 'Shipping time'];
  }

  private confidence(audience: AudienceProfileRecord): number {
    let c = 0.5;
    if ((audience.interests ?? []).length > 0) c += 0.15;
    if ((audience.lifestyle ?? []).length > 0) c += 0.1;
    if ((audience.location ?? []).length > 0) c += 0.1;
    if (audience.ageGroup !== 'Mixed') c += 0.1;
    if (audience.gender !== 'Mixed') c += 0.05;
    return Math.min(1, c);
  }
}

export const audienceIntelligenceService = new AudienceIntelligenceService();