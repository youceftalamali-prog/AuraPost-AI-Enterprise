import type { UnifiedProduct } from '../../../types/video.js';
import type { TextIntelligenceResult, ProductVibe } from '../../../types/intelligence.js';

const CATEGORY_KEYWORDS: Record<string, string[]> = {
  Jewelry: ['ring', 'necklace', 'bracelet', 'earring', 'jewelry', 'jewellery', 'diamond', 'gold', 'silver', 'pendant', 'watch', 'gem', 'pearl'],
  Fashion: ['dress', 'shirt', 'blouse', 'jacket', 'coat', 'pants', 'jeans', 'skirt', 'fashion', 'clothing', 'apparel', 'hoodie', 'sweater'],
  Shoes: ['shoes', 'sneakers', 'boots', 'sandals', 'heels', 'footwear', 'loafers'],
  Beauty: ['makeup', 'cosmetic', 'lipstick', 'foundation', 'mascara', 'beauty', 'skincare', 'serum', 'cream', 'lotion'],
  Perfume: ['perfume', 'fragrance', 'cologne', 'scent', 'parfum', 'aroma'],
  Electronics: ['phone', 'laptop', 'tablet', 'headphone', 'speaker', 'camera', 'electronic', 'gadget', 'smart', 'monitor'],
  Food: ['food', 'chocolate', 'snack', 'candy', 'cookie', 'cake', 'beverage', 'drink', 'coffee', 'tea', 'spice'],
  Fitness: ['fitness', 'gym', 'workout', 'yoga', 'sport', 'exercise', 'protein', 'supplement'],
  Home: ['home', 'furniture', 'decor', 'pillow', 'blanket', 'curtain', 'rug', 'lamp', 'candle'],
  Kitchen: ['kitchen', 'cookware', 'pan', 'pot', 'utensil', 'appliance', 'blender', 'knife'],
  Kids: ['kids', 'children', 'baby', 'toy', 'stroller', 'diaper'],
  Pets: ['pet', 'dog', 'cat', 'collar', 'leash'],
  Automotive: ['car', 'automotive', 'vehicle', 'tire', 'motor'],
  Gaming: ['game', 'gaming', 'console', 'controller', 'keyboard'],
  Wedding: ['wedding', 'bridal', 'engagement'],
};

const VIBE_KEYWORDS: Record<ProductVibe, string[]> = {
  Luxury: ['luxury', 'premium', 'exclusive', 'designer', 'haute', 'gold', 'diamond', 'silk', 'leather', 'handcrafted', 'bespoke'],
  Casual: ['casual', 'everyday', 'comfortable', 'relaxed', 'lifestyle', 'simple'],
  Premium: ['premium', 'quality', 'high-end', 'superior', 'craftsmanship', 'refined'],
  Budget: ['affordable', 'cheap', 'budget', 'discount', 'sale', 'value', 'economical'],
  Modern: ['modern', 'contemporary', 'sleek', 'minimalist', 'trendy', 'innovative', 'tech'],
  Classic: ['classic', 'vintage', 'traditional', 'timeless', 'heritage', 'retro'],
  Minimal: ['minimal', 'minimalist', 'clean', 'essential', 'pure'],
  Bold: ['bold', 'vibrant', 'colorful', 'statement', 'eye-catching', 'striking', 'dynamic'],
};

const AUDIENCE_KEYWORDS: Record<string, string[]> = {
  Women: ['women', 'ladies', 'her', 'female', 'woman', 'feminine', 'mom', 'mother'],
  Men: ['men', 'mens', 'him', 'male', 'man', 'masculine', 'dad', 'father'],
  Kids: ['kids', 'children', 'baby', 'toddler', 'infant', 'boys', 'girls'],
  Teens: ['teen', 'teenager', 'adolescent', 'youth'],
  Professionals: ['professional', 'business', 'executive', 'corporate', 'office', 'career'],
  Athletes: ['athlete', 'sport', 'fitness', 'gym', 'runner', 'training'],
  Gamers: ['gamer', 'gaming', 'esports', 'streamer'],
};

const STOP_WORDS = new Set([
  'the', 'and', 'for', 'with', 'this', 'that', 'from', 'your', 'you', 'are', 'was', 'were',
  'been', 'have', 'has', 'had', 'but', 'not', 'all', 'can', 'will', 'its', 'our', 'their',
]);

export class TextIntelligenceService {
  analyze(product: UnifiedProduct): TextIntelligenceResult {
    const text = [
      product.title,
      product.description,
      (product.tags ?? []).join(' '),
      product.brand,
      product.category,
    ]
      .filter(Boolean)
      .join(' ');

    const lower = text.toLowerCase();
    const words = lower.replace(/[^\w\s]/g, ' ').split(/\s+/).filter((w) => w.length > 2);

    const category = this.detectCategory(lower, product.category);
    const vibe = this.detectVibe(lower, product.price);
    const targetAudience = this.detectAudience(lower);
    const luxuryScore = this.scoreLuxury(lower, product.price);
    const viralScore = this.scoreViral(lower, product.tags ?? []);

    return {
      category,
      subcategory: this.detectSubcategory(lower, category),
      productType: category,
      targetAudience: targetAudience.length > 0 ? targetAudience : ['General'],
      marketingAngle: this.detectMarketingAngle(lower),
      emotionalTriggers: this.detectEmotionalTriggers(lower),
      painPoints: this.extractPainPoints(lower),
      benefits: this.extractBenefits(lower),
      luxuryScore,
      viralScore,
      vibe,
      ctaSuggestions: this.buildCtas(category, vibe, targetAudience),
      keywords: this.extractKeywords(words),
      language: this.detectLanguage(text),
      confidence: this.computeConfidence(text, category, targetAudience),
      analysisMethod: 'rule-based',
    };
  }

  private detectCategory(lower: string, existing?: string): string {
    if (existing) {
      for (const cat of Object.keys(CATEGORY_KEYWORDS)) {
        if (existing.toLowerCase().includes(cat.toLowerCase())) return cat;
      }
    }
    const scores: Record<string, number> = {};
    for (const [cat, kws] of Object.entries(CATEGORY_KEYWORDS)) {
      let s = 0;
      for (const kw of kws) if (lower.includes(kw)) s += 1;
      if (s > 0) scores[cat] = s;
    }
    const sorted = Object.entries(scores).sort((a, b) => b[1] - a[1]);
    return sorted.length > 0 ? sorted[0][0] : 'General';
  }

  private detectSubcategory(lower: string, category: string): string {
    const map: Record<string, string[]> = {
      Jewelry: ['Rings', 'Necklaces', 'Bracelets', 'Earrings', 'Watches'],
      Fashion: ['Dresses', 'Tops', 'Bottoms', 'Outerwear', 'Accessories'],
      Shoes: ['Sneakers', 'Boots', 'Heels', 'Sandals'],
      Beauty: ['Skincare', 'Makeup', 'Haircare', 'Fragrance'],
      Electronics: ['Phones', 'Computers', 'Audio', 'Cameras'],
    };
    const subs = map[category] ?? [];
    return subs.find((s) => lower.includes(s.toLowerCase())) ?? 'General';
  }

  private detectVibe(lower: string, price?: number): ProductVibe {
    const scores: Record<string, number> = {};
    for (const [vibe, kws] of Object.entries(VIBE_KEYWORDS)) {
      let s = 0;
      for (const kw of kws) if (lower.includes(kw)) s += 1;
      scores[vibe] = s;
    }
    if (price !== undefined) {
      if (price > 500) scores.Luxury = (scores.Luxury ?? 0) + 3;
      else if (price > 200) scores.Premium = (scores.Premium ?? 0) + 2;
      else if (price < 20) scores.Budget = (scores.Budget ?? 0) + 2;
    }
    const sorted = Object.entries(scores).sort((a, b) => b[1] - a[1]);
    return (sorted[0]?.[0] as ProductVibe) ?? 'Modern';
  }

  private detectAudience(lower: string): string[] {
    const found: string[] = [];
    for (const [aud, kws] of Object.entries(AUDIENCE_KEYWORDS)) {
      if (kws.some((kw) => lower.includes(kw))) found.push(aud);
    }
    return found;
  }

  private detectMarketingAngle(lower: string): string[] {
    const angles: Array<[string, string[]]> = [
      ['Problem-Solution', ['solve', 'fix', 'help', 'struggle', 'problem', 'solution']],
      ['Lifestyle', ['lifestyle', 'everyday', 'routine', 'experience', 'journey']],
      ['Status', ['status', 'impress', 'stand out', 'elite', 'exclusive', 'prestige']],
      ['Value', ['save', 'value', 'worth', 'deal', 'affordable', 'investment']],
      ['Quality', ['quality', 'craftsmanship', 'durable', 'long-lasting', 'premium materials']],
      ['Innovation', ['innovative', 'new', 'latest', 'cutting-edge', 'revolutionary']],
    ];
    const found = angles.filter(([, kws]) => kws.some((kw) => lower.includes(kw))).map(([name]) => name);
    return found.length > 0 ? found : ['Lifestyle'];
  }

  private detectEmotionalTriggers(lower: string): string[] {
    const triggers: Array<[string, string[]]> = [
      ['Urgency', ['limited', 'now', 'today', 'hurry', 'last chance', 'flash sale']],
      ['Exclusivity', ['exclusive', 'limited edition', 'members only', 'vip', 'rare']],
      ['Social Proof', ['bestseller', 'popular', 'trending', 'top rated', 'loved by']],
      ['Trust', ['guarantee', 'warranty', 'certified', 'authentic', 'trusted']],
      ['Aspiration', ['dream', 'achieve', 'transform', 'elevate', 'upgrade']],
    ];
    return triggers.filter(([, kws]) => kws.some((kw) => lower.includes(kw))).map(([name]) => name);
  }

  private extractBenefits(lower: string): string[] {
    const patterns = [
      /(?:made|crafted|built) with ([^.]+)/i,
      /(?:features?|includes?) ([^.]+)/i,
      /(?:perfect for|ideal for|great for) ([^.]+)/i,
    ];
    const benefits: string[] = [];
    for (const re of patterns) {
      const m = lower.match(re);
      if (m) benefits.push(m[1].trim().slice(0, 100));
    }
    return benefits.slice(0, 5);
  }

  private extractPainPoints(lower: string): string[] {
    const patterns = [/(?:tired of|struggle with|problem with|hate) ([^.]+)/i, /(?:no more|never again) ([^.]+)/i];
    const points: string[] = [];
    for (const re of patterns) {
      const m = lower.match(re);
      if (m) points.push(m[1].trim().slice(0, 100));
    }
    return points.slice(0, 3);
  }

  private extractKeywords(words: string[]): string[] {
    const freq: Record<string, number> = {};
    for (const w of words) {
      if (STOP_WORDS.has(w) || w.length < 3) continue;
      freq[w] = (freq[w] ?? 0) + 1;
    }
    return Object.entries(freq)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 15)
      .map(([w]) => w);
  }

  private scoreLuxury(lower: string, price?: number): number {
    let score = 0;
    for (const kw of VIBE_KEYWORDS.Luxury) if (lower.includes(kw)) score += 5;
    if (price !== undefined) {
      if (price > 1000) score += 30;
      else if (price > 500) score += 20;
      else if (price > 200) score += 10;
    }
    return Math.min(100, score);
  }

  private scoreViral(lower: string, tags: string[]): number {
    let score = 0;
    const viral = ['trending', 'viral', 'tiktok', 'must-have', 'obsessed', 'game-changer', 'hack'];
    for (const kw of viral) if (lower.includes(kw)) score += 10;
    if (lower.length < 100 && lower.length > 0) score += 10;
    for (const tag of tags) if (viral.some((k) => tag.toLowerCase().includes(k))) score += 5;
    return Math.min(100, score);
  }

  private buildCtas(category: string, vibe: ProductVibe, audience: string[]): string[] {
    const ctas: string[] = [];
    const byCategory: Record<string, string[]> = {
      Jewelry: ['Shop the Collection', 'Discover Elegance'],
      Fashion: ['Shop the Look', 'Upgrade Your Wardrobe'],
      Electronics: ['Shop Now', 'Experience the Difference'],
      Beauty: ['Glow Up', 'Shop the Routine'],
      Food: ['Order Now', 'Taste the Difference'],
    };
    if (byCategory[category]) ctas.push(...byCategory[category]);
    if (vibe === 'Luxury') ctas.push('Indulge in Luxury');
    else if (vibe === 'Budget') ctas.push('Shop the Deal');
    if (audience.includes('Women')) ctas.push('Shop for Her');
    if (audience.includes('Men')) ctas.push('Shop for Him');
    if (ctas.length === 0) ctas.push('Shop Now', 'Learn More');
    return ctas.slice(0, 5);
  }

  private detectLanguage(text: string): string {
    if (/[\u0600-\u06FF]/.test(text)) return 'ar';
    if (/[\u4E00-\u9FFF]/.test(text)) return 'zh';
    if (/[\u3040-\u309F\u30A0-\u30FF]/.test(text)) return 'ja';
    return 'en';
  }

  private computeConfidence(text: string, category: string, audience: string[]): number {
    let c = 0.5;
    if (text.length > 200) c += 0.1;
    if (text.length > 500) c += 0.1;
    if (category !== 'General') c += 0.2;
    if (audience.length > 0) c += 0.1;
    return Math.min(1, c);
  }
}

export const textIntelligenceService = new TextIntelligenceService();