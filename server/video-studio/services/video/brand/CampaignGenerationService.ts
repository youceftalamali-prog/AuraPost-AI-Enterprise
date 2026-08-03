import { campaignRepository } from '../../../repositories/CampaignRepository.js';
import { brandRepository } from '../../../repositories/BrandRepository.js';
import { audienceRepository } from '../../../repositories/AudienceRepository.js';
import type { CampaignProfileRecord } from '../../../types/entities.js';
import type {
  CampaignGenerationResult,
  CampaignIntelligenceResult,
} from '../../../types/brand.js';
import type { BrandAnalysis, AudienceAnalysis } from '../../../types/intelligence.js';
import type { VideoPlatform } from '../../../types/video.js';

const PLATFORM_META: Record<
  VideoPlatform,
  { aspect: string; duration: number; hashtagCount: number; bestTime: string; bestDay: string; emoji: string }
> = {
  TikTok: { aspect: '9:16', duration: 15, hashtagCount: 5, bestTime: '18:00', bestDay: 'Friday', emoji: '🔥' },
  Instagram: { aspect: '9:16', duration: 20, hashtagCount: 8, bestTime: '19:00', bestDay: 'Wednesday', emoji: '✨' },
  YouTube: { aspect: '16:9', duration: 30, hashtagCount: 6, bestTime: '17:00', bestDay: 'Saturday', emoji: '▶️' },
  Facebook: { aspect: '16:9', duration: 25, hashtagCount: 3, bestTime: '13:00', bestDay: 'Thursday', emoji: '👍' },
  Pinterest: { aspect: '9:16', duration: 15, hashtagCount: 5, bestTime: '20:00', bestDay: 'Sunday', emoji: '📌' },
};

/**
 * Generates a multi-platform campaign from a campaign profile plus the
 * brand/audience intelligence attached to it. Builds a tailored prompt,
 * caption, hook, CTA, hashtags and publishing strategy per platform.
 */
export class CampaignGenerationService {
  async generate(
    campaignId: string,
    workspaceId: string,
    productName: string,
    productCategory: string,
    platforms: VideoPlatform[]
  ): Promise<CampaignIntelligenceResult> {
    const campaign = await campaignRepository.findById(campaignId);
    if (!campaign) throw new Error('Campaign not found');

    const brandAnalysis = campaign.brandId ? await this.loadBrandAnalysis(campaign.brandId) : null;
    const audienceAnalysis = campaign.audienceId ? await this.loadAudienceAnalysis(campaign.audienceId) : null;

    const targetPlatforms = platforms.length > 0 ? platforms : (campaign.platforms as VideoPlatform[]);

    const generations: CampaignGenerationResult[] = [];
    for (const platform of targetPlatforms) {
      generations.push(
        this.buildForPlatform(platform, campaign, productName, productCategory, brandAnalysis, audienceAnalysis)
      );
    }

    // Persist generations
    for (const gen of generations) {
      await campaignRepository.createGeneration({
        campaignId,
        workspaceId,
        platform: gen.platform,
        videoConcept: gen.videoConcept,
        caption: gen.caption,
        hook: gen.hook,
        cta: gen.cta,
        hashtags: gen.hashtags,
        thumbnailIdea: gen.thumbnailIdea,
        publishingStrategy: gen.publishingStrategy as unknown as Record<string, unknown>,
        prompt: gen.prompt,
        negativePrompt: gen.negativePrompt,
        templateId: gen.templateId ?? null,
        estimatedCost: String(gen.estimatedCost),
        estimatedDuration: gen.estimatedDuration,
      });
    }

    return {
      campaignId,
      generations,
      overallStrategy: this.overallStrategy(campaign, productCategory, brandAnalysis, audienceAnalysis),
    };
  }

  private async loadBrandAnalysis(brandId: string): Promise<BrandAnalysis | null> {
    const brand = await brandRepository.findById(brandId);
    if (!brand || !brand.analysis || Object.keys(brand.analysis).length === 0) return null;
    return brand.analysis as unknown as BrandAnalysis;
  }

  private async loadAudienceAnalysis(audienceId: string): Promise<AudienceAnalysis | null> {
    const audience = await audienceRepository.findById(audienceId);
    if (!audience || !audience.analysis || Object.keys(audience.analysis).length === 0) return null;
    return audience.analysis as unknown as AudienceAnalysis;
  }

  private buildForPlatform(
    platform: VideoPlatform,
    campaign: CampaignProfileRecord,
    productName: string,
    productCategory: string,
    brand: BrandAnalysis | null,
    audience: AudienceAnalysis | null
  ): CampaignGenerationResult {
    const meta = PLATFORM_META[platform];
    const goal = campaign.goal;

    const hook = this.hook(platform, audience, productName);
    const cta = this.cta(goal, brand, audience);
    const style = brand?.visualStyle ?? 'Modern';
    const hashtags = this.hashtags(productCategory, platform, meta.hashtagCount);

    const videoConcept = `${style} ${productCategory} commercial for ${productName}, ${this.goalDescriptor(goal)}, formatted for ${platform} (${meta.aspect}).`;

    const caption = this.caption(platform, productName, hook, cta, meta.emoji);

    const prompt = this.buildPrompt(productName, productCategory, style, brand, audience, platform, meta);
    const negativePrompt = 'blurry, low quality, distorted, watermark, text overlay, deformed, ugly';

    return {
      platform,
      videoConcept,
      caption,
      hook,
      cta,
      hashtags,
      thumbnailIdea: `Close-up of ${productName} with ${style.toLowerCase()} styling and bold ${platform} thumbnail text.`,
      publishingStrategy: {
        bestTime: meta.bestTime,
        bestDay: meta.bestDay,
        frequency: platform === 'TikTok' || platform === 'Pinterest' ? 'Daily' : '3-4 times per week',
      },
      prompt,
      negativePrompt,
      templateId: null,
      estimatedCost: this.estimateCost(meta.duration, style),
      estimatedDuration: meta.duration,
    };
  }

  private hook(platform: VideoPlatform, audience: AudienceAnalysis | null, productName: string): string {
    if (audience?.preferredHooks && audience.preferredHooks.length > 0) {
      return audience.preferredHooks[0];
    }
    if (platform === 'TikTok') return `Stop scrolling — ${productName} changes everything`;
    if (platform === 'Instagram') return `Meet ${productName} ✨`;
    if (platform === 'YouTube') return `Is ${productName} worth it?`;
    return `Discover ${productName}`;
  }

  private cta(goal: string, brand: BrandAnalysis | null, audience: AudienceAnalysis | null): string {
    if (audience?.preferredCTA && audience.preferredCTA.length > 0) return audience.preferredCTA[0];
    if (brand?.ctaPatterns && brand.ctaPatterns.length > 0) return brand.ctaPatterns[0];
    if (goal === 'Conversion') return 'Shop Now';
    if (goal === 'Engagement') return 'Tag a friend';
    if (goal === 'Awareness') return 'Learn More';
    return 'Save for later';
  }

  private hashtags(category: string, platform: VideoPlatform, count: number): string[] {
    const base = [`#${category.replace(/\s+/g, '')}`, '#shop', '#new', '#trending'];
    const platformTag: Record<VideoPlatform, string> = {
      TikTok: '#fyp',
      Instagram: '#instagood',
      YouTube: '#shorts',
      Facebook: '#shopnow',
      Pinterest: '#pinterest',
    };
    const all = [platformTag[platform], ...base, '#viral', '#musthave', '#deal', '#gift'];
    return Array.from(new Set(all)).slice(0, count);
  }

  private caption(platform: VideoPlatform, productName: string, hook: string, cta: string, emoji: string): string {
    if (platform === 'TikTok') return `${hook} ${emoji}\n\n${cta} 👇`;
    if (platform === 'Instagram') return `${hook} ${emoji}\n\nTap the link in bio. ${cta}.`;
    if (platform === 'YouTube') return `${hook}\n\n${cta} — link in description.`;
    return `${hook} ${emoji} ${cta}`;
  }

  private buildPrompt(
    productName: string,
    productCategory: string,
    style: string,
    brand: BrandAnalysis | null,
    audience: AudienceAnalysis | null,
    platform: VideoPlatform,
    meta: { aspect: string; duration: number }
  ): string {
    const parts: string[] = [];
    parts.push(`${style} ${productCategory} advertisement for ${productName}`);
    if (brand) parts.push(`visual style: ${brand.visualStyle}, music: ${brand.recommendedMusic[0] ?? 'modern'}`);
    if (audience) parts.push(`pace: ${audience.preferredVideoPace}, targeting ${audience.preferredPlatforms.join('/')}`);
    parts.push(`aspect ratio ${meta.aspect}, ${meta.duration} seconds, optimized for ${platform}`);
    parts.push('high quality, professional lighting, smooth camera movement');
    return parts.join('. ') + '.';
  }

  private goalDescriptor(goal: string): string {
    const map: Record<string, string> = {
      Awareness: 'focused on brand awareness',
      Engagement: 'focused on engagement',
      Conversion: 'focused on driving sales',
      Retention: 'focused on customer retention',
    };
    return map[goal] ?? 'focused on engagement';
  }

  private estimateCost(duration: number, style: string): number {
    const base = 0.005 * duration;
    const styleMultiplier = style === 'Luxury' ? 1.5 : style === 'Corporate' ? 1.2 : 1.0;
    return Number((base * styleMultiplier + 0.02).toFixed(4));
  }

  private overallStrategy(
    campaign: CampaignProfileRecord,
    productCategory: string,
    brand: BrandAnalysis | null,
    audience: AudienceAnalysis | null
  ): CampaignIntelligenceResult['overallStrategy'] {
    return {
      theme: `${brand?.visualStyle ?? 'Modern'} ${productCategory} campaign — ${campaign.goal}`,
      messaging: audience?.aspirations ?? ['Quality', 'Value'],
      visualDirection: brand
        ? `${brand.visualStyle} style with ${brand.recommendedMusic[0] ?? 'modern'} music and ${brand.recommendedVoice} voiceover`
        : 'Modern, clean, product-focused',
      keyBenefits: audience?.conversionDrivers ?? ['Quality', 'Trust'],
    };
  }
}

export const campaignGenerationService = new CampaignGenerationService();