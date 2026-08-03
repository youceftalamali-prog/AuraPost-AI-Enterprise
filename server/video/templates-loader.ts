import fs from "fs";
import path from "path";
import { logger } from "../core/observability/logger.ts";

export interface VideoTemplate {
  id: string;
  title: string;
  description: string;
  industry: string;
  category: string;
  tags: string[];
  duration: number;
  aspectRatio: "9:16" | "16:9" | "1:1";
  recommendedProvider: "google_veo" | "runwayml" | "kling_ai" | "pika_labs";
  providers: ("google_veo" | "runwayml" | "kling_ai" | "pika_labs")[];
  thumbnail: string;
  cover: string;
  preview?: string;
  previewVideo?: string;
  quality: "standard" | "premium" | "ultra";
  scenes: Array<{
    title: string;
    visual: string;
    narration: string;
    durationSeconds: number;
  }>;
  storyboard: string;
  camera: {
    angles: string[];
    movement: string[];
    lighting: string;
    environment: string;
  };
  audio: {
    musicStyle: string;
    voiceStyle: string;
    tempo: "slow" | "moderate" | "fast";
  };
  transitions: string[];
  textOverlay: Array<{
    text: string;
    position: string;
    timing: string;
  }>;
  cta: string;
  negativePrompt: string;
  promptFragments: string[];
  providerSettings: Record<string, any>;
  renderingSettings: {
    seed?: number;
    fps: number;
    codec: string;
  };
  optimizationRules: string[];
  creditCost: number;
  createdAt: string;
  updatedAt: string;
}

class TemplatesLoader {
  private templates: Map<string, VideoTemplate> = new Map();
  private categories: Set<string> = new Set();
  private industries: Set<string> = new Set();
  private loaded = false;

  async loadTemplates(): Promise<void> {
    if (this.loaded) return;

    const templatesDir = path.join(process.cwd(), "server", "video", "templates");

    try {
      if (!fs.existsSync(templatesDir)) {
        logger.info({ path: templatesDir }, "Templates directory does not exist, creating...");
        fs.mkdirSync(templatesDir, { recursive: true });
        await this.createDefaultTemplates(templatesDir);
      }

      await this.scanAndLoadTemplates(templatesDir);
      this.loaded = true;
      logger.info(
        { count: this.templates.size, categories: this.categories.size, industries: this.industries.size },
        "Video templates loaded successfully"
      );
    } catch (err: any) {
      logger.error({ err }, "Failed to load video templates");
      throw err;
    }
  }

  private async scanAndLoadTemplates(dir: string): Promise<void> {
    const entries = await fs.promises.readdir(dir, { withFileTypes: true });

    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);

      if (entry.isDirectory()) {
        await this.scanAndLoadTemplates(fullPath);
      } else if (entry.isFile() && entry.name.endsWith(".json")) {
        try {
          const content = await fs.promises.readFile(fullPath, "utf-8");
          const template = JSON.parse(content) as VideoTemplate;

          // Validate template structure
          if (!this.validateTemplate(template)) {
            logger.warn({ path: fullPath }, "Invalid template structure, skipping");
            continue;
          }

          this.templates.set(template.id, template);
          this.categories.add(template.category);
          this.industries.add(template.industry);
        } catch (err: any) {
          logger.warn({ path: fullPath, err: err.message }, "Failed to parse template file");
        }
      }
    }
  }

  private validateTemplate(template: any): boolean {
    const required = ["id", "title", "description", "industry", "category", "duration", "aspectRatio", "tags"];
    return required.every((field) => template[field] !== undefined && template[field] !== null);
  }

  private async createDefaultTemplates(dir: string): Promise<void> {
    const templates = this.generateDefaultTemplateLibrary();

    // Create category subdirectories
    const categories = new Set(templates.map((t) => t.category));
    for (const category of categories) {
      const catDir = path.join(dir, category.toLowerCase().replace(/\s+/g, "_"));
      if (!fs.existsSync(catDir)) {
        fs.mkdirSync(catDir, { recursive: true });
      }
    }

    // Write each template
    for (const template of templates) {
      const categoryDir = path.join(dir, template.category.toLowerCase().replace(/\s+/g, "_"));
      const filename = path.join(categoryDir, `${template.id}.json`);

      await fs.promises.writeFile(filename, JSON.stringify(template, null, 2));
      this.templates.set(template.id, template);
      this.categories.add(template.category);
      this.industries.add(template.industry);
    }

    logger.info({ count: templates.length }, "Default template library created");
  }

  private generateDefaultTemplateLibrary(): VideoTemplate[] {
    const now = new Date().toISOString();
    const templates: VideoTemplate[] = [];

    // LUXURY JEWELRY
    templates.push(
      {
        id: "luxury_jewelry_diamond_rings_showcase",
        title: "Diamond Ring Showcase",
        description: "Cinematic 360° product rotation with luxury lighting and premium audio",
        industry: "Luxury Jewelry",
        category: "Product Showcase",
        tags: ["luxury", "jewelry", "cinematic", "4k", "high-end", "diamonds"],
        duration: 30,
        aspectRatio: "9:16",
        recommendedProvider: "google_veo",
        providers: ["google_veo", "runwayml", "kling_ai"],
        thumbnail: "https://via.placeholder.com/400x300?text=Diamond+Ring",
        cover: "https://via.placeholder.com/1200x800?text=Diamond+Ring+Showcase",
        quality: "ultra",
        scenes: [
          {
            title: "Opening",
            visual: "Close-up of diamond under soft golden lighting",
            narration: "Discover the perfect symbol of eternal love",
            durationSeconds: 5,
          },
          {
            title: "Rotation",
            visual: "Smooth 360° rotation of the ring",
            narration: "Flawlessly cut and certified",
            durationSeconds: 10,
          },
          {
            title: "Details",
            visual: "Extreme close-ups showing cut quality and sparkle",
            narration: "Each facet reflects pure brilliance",
            durationSeconds: 8,
          },
          {
            title: "CTA",
            visual: "Ring on elegant hand with pricing overlay",
            narration: "Own your legacy today",
            durationSeconds: 7,
          },
        ],
        storyboard: "luxury_jewelry_diamond_rings_showcase_board",
        camera: {
          angles: ["macro", "wide", "close-up", "full-rotation"],
          movement: ["smooth-pan", "rotation", "slow-zoom", "tracking"],
          lighting: "warm-golden-hour",
          environment: "luxury-studio-white-backdrop",
        },
        audio: {
          musicStyle: "classical-piano-soft",
          voiceStyle: "luxury-female-narrator",
          tempo: "slow",
        },
        transitions: ["fade", "cut", "elegant-wipe"],
        textOverlay: [
          {
            text: "CERTIFIED AUTHENTIC",
            position: "bottom-right",
            timing: "3s-8s",
          },
          {
            text: "LIFETIME GUARANTEE",
            position: "bottom-left",
            timing: "15s-25s",
          },
        ],
        cta: "Shop Exclusive Diamonds Today",
        negativePrompt:
          "no low-quality images, no poor lighting, no scratches or damage visible, no harsh shadows",
        promptFragments: [
          "luxurious diamond jewelry",
          "premium 4K quality",
          "soft golden lighting",
          "rotating product display",
          "elegant and sophisticated",
        ],
        providerSettings: {
          google_veo: { model: "veo-2.0", quality: "max" },
          runwayml: { model: "gen3a_turbo", quality: "premium" },
          kling_ai: { model: "kling-v1.5", quality: "ultra" },
        },
        renderingSettings: { fps: 60, codec: "h264" },
        optimizationRules: [
          "Use high-resolution product images",
          "Maintain consistent lighting throughout",
          "Smooth camera movements only",
          "Premium audio track essential",
        ],
        creditCost: 25,
        createdAt: now,
        updatedAt: now,
      },
      {
        id: "luxury_jewelry_gold_rings_luxury_brand_ad",
        title: "Gold Ring Luxury Brand Ad",
        description: "High-end fashion advertisement for gold rings with luxury positioning",
        industry: "Luxury Jewelry",
        category: "Luxury Brand Ad",
        tags: ["luxury", "gold", "brand", "fashion", "premium", "advertising"],
        duration: 15,
        aspectRatio: "9:16",
        recommendedProvider: "runwayml",
        providers: ["google_veo", "runwayml", "kling_ai"],
        thumbnail: "https://via.placeholder.com/400x300?text=Gold+Ring",
        cover: "https://via.placeholder.com/1200x800?text=Gold+Ring+Luxury",
        quality: "premium",
        scenes: [
          {
            title: "Hook",
            visual: "Gold ring catching sunlight with luxury background",
            narration: "Timeless elegance meets modern luxury",
            durationSeconds: 4,
          },
          {
            title: "Brand Story",
            visual: "Craftsmanship montage with artisan hands",
            narration: "Handcrafted by master jewelers",
            durationSeconds: 5,
          },
          {
            title: "Lifestyle",
            visual: "Ring on elegant woman in luxury setting",
            narration: "For those who appreciate the finer things",
            durationSeconds: 4,
          },
          {
            title: "Close",
            visual: "Ring with brand logo and call to action",
            narration: "Discover your gold standard",
            durationSeconds: 2,
          },
        ],
        storyboard: "luxury_jewelry_gold_rings_brand_ad",
        camera: {
          angles: ["macro", "lifestyle", "brand-shot"],
          movement: ["slow-pan", "subtle-zoom", "tracking"],
          lighting: "natural-luxury",
          environment: "upscale-retail-background",
        },
        audio: {
          musicStyle: "ambient-luxury-strings",
          voiceStyle: "prestige-male-narrator",
          tempo: "moderate",
        },
        transitions: ["fade", "dissolve"],
        textOverlay: [
          {
            text: "LUXURY GOLD COLLECTION",
            position: "center",
            timing: "0s-5s",
          },
        ],
        cta: "Explore Premium Gold Rings",
        negativePrompt: "no cheap materials, no visible flaws, no low-quality production",
        promptFragments: [
          "luxury gold jewelry",
          "high-end brand advertisement",
          "sophisticated lighting",
          "premium materials",
        ],
        providerSettings: { google_veo: { quality: "high" }, runwayml: { quality: "premium" } },
        renderingSettings: { fps: 30, codec: "h264" },
        optimizationRules: [
          "Professional color grading required",
          "Maintain brand aesthetic throughout",
          "Premium audio essential",
        ],
        creditCost: 20,
        createdAt: now,
        updatedAt: now,
      }
    );

    // FASHION - SHOES
    templates.push(
      {
        id: "fashion_shoes_sneakers_product_showcase",
        title: "Sneaker Product Showcase",
        description: "Dynamic sneaker showcase with multiple angles and lifestyle integration",
        industry: "Fashion",
        category: "Product Showcase",
        tags: ["fashion", "shoes", "sneakers", "lifestyle", "social-media"],
        duration: 20,
        aspectRatio: "9:16",
        recommendedProvider: "google_veo",
        providers: ["google_veo", "runwayml"],
        thumbnail: "https://via.placeholder.com/400x300?text=Sneakers",
        cover: "https://via.placeholder.com/1200x800?text=Sneaker+Showcase",
        quality: "premium",
        scenes: [
          {
            title: "Hero Shot",
            visual: "Sneaker against minimalist background",
            narration: "The ultimate sneaker for your lifestyle",
            durationSeconds: 5,
          },
          {
            title: "Details",
            visual: "Close-ups of design elements and materials",
            narration: "Crafted with premium materials",
            durationSeconds: 6,
          },
          {
            title: "Lifestyle",
            visual: "Sneaker on person in active setting",
            narration: "Built for comfort and style",
            durationSeconds: 6,
          },
          {
            title: "Call to Action",
            visual: "Product with pricing and CTA",
            narration: "Step up your game today",
            durationSeconds: 3,
          },
        ],
        storyboard: "fashion_shoes_sneakers_showcase",
        camera: {
          angles: ["overhead", "side", "close-up", "lifestyle"],
          movement: ["pan", "zoom", "reveal"],
          lighting: "bright-clean",
          environment: "minimalist-studio",
        },
        audio: {
          musicStyle: "urban-upbeat-hip-hop",
          voiceStyle: "young-energetic",
          tempo: "fast",
        },
        transitions: ["cut", "quick-fade"],
        textOverlay: [
          {
            text: "NEW COLLECTION",
            position: "top-center",
            timing: "0s-3s",
          },
        ],
        cta: "Shop Sneakers Now",
        negativePrompt: "no worn-out shoes, no dirt or damage, no unnatural colors",
        promptFragments: [
          "premium sneakers",
          "lifestyle product showcase",
          "urban aesthetic",
          "clean design",
        ],
        providerSettings: { google_veo: { quality: "high" } },
        renderingSettings: { fps: 30, codec: "h264" },
        optimizationRules: ["Keep colors vibrant", "Show shoe from multiple angles", "Include lifestyle element"],
        creditCost: 18,
        createdAt: now,
        updatedAt: now,
      }
    );

    // BEAUTY - SKINCARE
    templates.push(
      {
        id: "beauty_skincare_serum_ugc_testimonial",
        title: "Skincare Serum UGC Testimonial",
        description: "User-generated content style testimonial for beauty products",
        industry: "Beauty",
        category: "UGC Testimonial",
        tags: ["beauty", "skincare", "ugc", "testimonial", "authentic"],
        duration: 25,
        aspectRatio: "9:16",
        recommendedProvider: "runwayml",
        providers: ["runwayml", "google_veo"],
        thumbnail: "https://via.placeholder.com/400x300?text=Skincare+Serum",
        cover: "https://via.placeholder.com/1200x800?text=Skincare+UGC",
        quality: "premium",
        scenes: [
          {
            title: "Intro",
            visual: "Person with clear skin speaking to camera",
            narration: "I was skeptical at first, but this serum changed everything",
            durationSeconds: 5,
          },
          {
            title: "Product Demo",
            visual: "Close-up of serum application to skin",
            narration: "One drop goes so far, the texture is amazing",
            durationSeconds: 7,
          },
          {
            title: "Results",
            visual: "Before and after skin comparison",
            narration: "After just two weeks, my skin has never looked better",
            durationSeconds: 8,
          },
          {
            title: "Recommendation",
            visual: "Person with glowing skin smiling",
            narration: "Highly recommend to anyone with sensitive skin",
            durationSeconds: 5,
          },
        ],
        storyboard: "beauty_skincare_ugc_testimonial",
        camera: {
          angles: ["selfie", "close-up", "full-face", "detail-shot"],
          movement: ["minimal", "natural"],
          lighting: "natural-window-light",
          environment: "home-bathroom",
        },
        audio: {
          musicStyle: "soft-ambient-calm",
          voiceStyle: "authentic-real-person",
          tempo: "moderate",
        },
        transitions: ["natural-cut", "fade"],
        textOverlay: [
          {
            text: "REAL RESULTS FROM REAL PEOPLE",
            position: "bottom-center",
            timing: "throughout",
          },
        ],
        cta: "Try Our Serum Today",
        negativePrompt: "no overly edited, no fake testimonials, no unnatural effects",
        promptFragments: ["authentic skincare testimonial", "real person speaking", "natural lighting"],
        providerSettings: { runwayml: { quality: "premium" } },
        renderingSettings: { fps: 24, codec: "h264" },
        optimizationRules: ["Keep authenticity high", "Natural lighting important", "Genuine emotions"],
        creditCost: 20,
        createdAt: now,
        updatedAt: now,
      }
    );

    // ELECTRONICS
    templates.push(
      {
        id: "electronics_phones_cinematic_teaser",
        title: "Phone Cinematic Teaser",
        description: "Cinematic teaser for new phone release with premium production",
        industry: "Electronics",
        category: "Cinematic Teaser",
        tags: ["electronics", "phones", "tech", "teaser", "cinematic", "4k"],
        duration: 30,
        aspectRatio: "16:9",
        recommendedProvider: "google_veo",
        providers: ["google_veo", "kling_ai"],
        thumbnail: "https://via.placeholder.com/400x300?text=Phone+Teaser",
        cover: "https://via.placeholder.com/1200x800?text=Phone+Cinematic",
        quality: "ultra",
        scenes: [
          {
            title: "Fade In",
            visual: "Dark ambient scene with subtle light",
            narration: "Something extraordinary is coming",
            durationSeconds: 5,
          },
          {
            title: "Reveal",
            visual: "Phone gradually appearing in frame",
            narration: "The future of mobile technology",
            durationSeconds: 8,
          },
          {
            title: "Features",
            visual: "Showcase of key features with transitions",
            narration: "Revolutionary camera system meets powerful performance",
            durationSeconds: 10,
          },
          {
            title: "Finale",
            visual: "Phone in premium lighting with logo",
            narration: "Coming soon to change everything",
            durationSeconds: 7,
          },
        ],
        storyboard: "electronics_phones_cinematic",
        camera: {
          angles: ["cinematic", "macro", "wide", "dramatic"],
          movement: ["slow-push", "subtle-rotation", "dramatic-reveal"],
          lighting: "dramatic-professional",
          environment: "dark-luxury-studio",
        },
        audio: {
          musicStyle: "dramatic-orchestral-epic",
          voiceStyle: "deep-narrator",
          tempo: "slow",
        },
        transitions: ["fade", "dissolve", "dramatic-wipe"],
        textOverlay: [
          {
            text: "COMING SOON",
            position: "center",
            timing: "end-sequence",
          },
        ],
        cta: "Learn More",
        negativePrompt: "no cheap lighting, no low resolution, no poor transitions",
        promptFragments: [
          "cinematic phone reveal",
          "professional lighting",
          "dramatic composition",
          "4K quality",
        ],
        providerSettings: { google_veo: { quality: "max" } },
        renderingSettings: { fps: 60, codec: "h264" },
        optimizationRules: [
          "Dramatic lighting essential",
          "Premium audio required",
          "Smooth transitions only",
          "4K quality minimum",
        ],
        creditCost: 30,
        createdAt: now,
        updatedAt: now,
      }
    );

    // FOOD & BEVERAGE
    templates.push(
      {
        id: "food_coffee_minimalist_story",
        title: "Premium Coffee Minimalist Story",
        description: "Clean, minimalist storytelling for premium coffee brand",
        industry: "Food & Beverage",
        category: "Minimalist Storytelling",
        tags: ["food", "coffee", "minimalist", "luxury", "lifestyle"],
        duration: 20,
        aspectRatio: "1:1",
        recommendedProvider: "runwayml",
        providers: ["runwayml", "google_veo"],
        thumbnail: "https://via.placeholder.com/400x300?text=Premium+Coffee",
        cover: "https://via.placeholder.com/1200x800?text=Coffee+Minimalist",
        quality: "premium",
        scenes: [
          {
            title: "Opening",
            visual: "Close-up of coffee beans on neutral background",
            narration: "Sourced from the finest farms worldwide",
            durationSeconds: 4,
          },
          {
            title: "Brewing",
            visual: "Slow-motion coffee pouring into cup",
            narration: "Crafted with precision and care",
            durationSeconds: 6,
          },
          {
            title: "Moment",
            visual: "Steaming cup in minimalist setting",
            narration: "Every sip tells a story",
            durationSeconds: 6,
          },
          {
            title: "Close",
            visual: "Cup with brand mark and subtle movement",
            narration: "Experience the difference",
            durationSeconds: 4,
          },
        ],
        storyboard: "food_coffee_minimalist",
        camera: {
          angles: ["macro", "overhead", "side-profile"],
          movement: ["slow-pan", "gentle-zoom", "subtle-rotation"],
          lighting: "soft-natural",
          environment: "clean-neutral-studio",
        },
        audio: {
          musicStyle: "ambient-peaceful-instrumental",
          voiceStyle: "calm-soothing",
          tempo: "slow",
        },
        transitions: ["fade", "dissolve"],
        textOverlay: [
          {
            text: "PREMIUM COFFEE",
            position: "center",
            timing: "end",
          },
        ],
        cta: "Discover Our Collection",
        negativePrompt: "no cluttered backgrounds, no harsh lighting, no cheap presentation",
        promptFragments: [
          "minimalist coffee advertisement",
          "premium lifestyle",
          "soft natural lighting",
          "clean aesthetic",
        ],
        providerSettings: { runwayml: { quality: "premium" } },
        renderingSettings: { fps: 24, codec: "h264" },
        optimizationRules: [
          "Maintain minimalist aesthetic",
          "Soft lighting throughout",
          "Slow pacing essential",
        ],
        creditCost: 18,
        createdAt: now,
        updatedAt: now,
      }
    );

    // FITNESS & SPORTS
    templates.push(
      {
        id: "fitness_sports_equipment_before_after",
        title: "Fitness Equipment Before/After",
        description: "Before and after transformation showcasing fitness equipment results",
        industry: "Fitness & Sports",
        category: "Before / After",
        tags: ["fitness", "sports", "transformation", "motivation", "before-after"],
        duration: 25,
        aspectRatio: "9:16",
        recommendedProvider: "kling_ai",
        providers: ["kling_ai", "runwayml"],
        thumbnail: "https://via.placeholder.com/400x300?text=Fitness+Equipment",
        cover: "https://via.placeholder.com/1200x800?text=Before+After+Fitness",
        quality: "premium",
        scenes: [
          {
            title: "Before",
            visual: "Person in before state, struggling with exercise",
            narration: "Struggling to get in shape",
            durationSeconds: 5,
          },
          {
            title: "Journey",
            visual: "Montage of consistent workouts with equipment",
            narration: "Dedicated training with our premium equipment",
            durationSeconds: 10,
          },
          {
            title: "After",
            visual: "Person showing transformation and confidence",
            narration: "Incredible results in just 12 weeks",
            durationSeconds: 7,
          },
          {
            title: "CTA",
            visual: "Product with person doing successful exercise",
            narration: "Start your transformation today",
            durationSeconds: 3,
          },
        ],
        storyboard: "fitness_equipment_before_after",
        camera: {
          angles: ["full-body", "mid-shot", "motivational"],
          movement: ["dynamic", "energetic"],
          lighting: "bright-gym-lighting",
          environment: "fitness-studio",
        },
        audio: {
          musicStyle: "upbeat-motivational-hip-hop",
          voiceStyle: "energetic-motivator",
          tempo: "fast",
        },
        transitions: ["dynamic-cut", "fast-fade"],
        textOverlay: [
          {
            text: "REAL RESULTS",
            position: "top-center",
            timing: "throughout",
          },
        ],
        cta: "Get Your Equipment Now",
        negativePrompt: "no fake results, no misleading information, no poor production quality",
        promptFragments: [
          "fitness transformation",
          "motivational journey",
          "real results",
          "high-energy",
        ],
        providerSettings: { kling_ai: { quality: "ultra" } },
        renderingSettings: { fps: 30, codec: "h264" },
        optimizationRules: [
          "Show genuine transformation",
          "High energy throughout",
          "Motivational messaging essential",
        ],
        creditCost: 22,
        createdAt: now,
        updatedAt: now,
      }
    );

    // SOCIAL MEDIA SPECIFIC - TIKTOK ADS
    templates.push(
      {
        id: "social_tiktok_ads_viral_hook",
        title: "TikTok Viral Hook Ad",
        description: "Fast-paced TikTok optimized ad with trending format and quick cuts",
        industry: "Social Media",
        category: "TikTok Ads",
        tags: ["tiktok", "viral", "trending", "fast-paced", "hook", "social-media"],
        duration: 15,
        aspectRatio: "9:16",
        recommendedProvider: "kling_ai",
        providers: ["kling_ai", "google_veo"],
        thumbnail: "https://via.placeholder.com/400x300?text=TikTok+Viral",
        cover: "https://via.placeholder.com/1200x800?text=TikTok+Hook",
        quality: "premium",
        scenes: [
          {
            title: "Hook (0-2s)",
            visual: "Shocking or intriguing opening frame",
            narration: "You won't believe this works...",
            durationSeconds: 2,
          },
          {
            title: "Setup (2-5s)",
            visual: "Quick product demonstration",
            narration: "Watch what happens next",
            durationSeconds: 3,
          },
          {
            title: "Payoff (5-12s)",
            visual: "Satisfying result or twist",
            narration: "Mind = blown",
            durationSeconds: 7,
          },
          {
            title: "CTA (12-15s)",
            visual: "Call to action with link",
            narration: "Link in bio",
            durationSeconds: 3,
          },
        ],
        storyboard: "social_tiktok_viral_hook",
        camera: {
          angles: ["close-up", "fast-cut", "reaction"],
          movement: ["quick-pan", "energetic", "dynamic"],
          lighting: "bright-trend-aware",
          environment: "varies-trendy-locations",
        },
        audio: {
          musicStyle: "trending-tiktok-sounds",
          voiceStyle: "young-authentic",
          tempo: "fast",
        },
        transitions: ["quick-cut", "zoom"],
        textOverlay: [
          {
            text: "SWIPE UP",
            position: "center",
            timing: "end",
          },
        ],
        cta: "Link in Bio",
        negativePrompt: "no slow pacing, no boring content, no low energy",
        promptFragments: [
          "viral TikTok content",
          "trending format",
          "quick-cut editing",
          "high-energy",
        ],
        providerSettings: { kling_ai: { quality: "premium" } },
        renderingSettings: { fps: 24, codec: "h264" },
        optimizationRules: ["Hook within first 2 seconds", "Fast pacing essential", "Trending sounds required"],
        creditCost: 15,
        createdAt: now,
        updatedAt: now,
      }
    );

    // INSTAGRAM REELS
    templates.push(
      {
        id: "social_instagram_reels_aesthetic",
        title: "Instagram Reels Aesthetic",
        description: "Beautiful aesthetic Instagram Reels optimized for feed engagement",
        industry: "Social Media",
        category: "Instagram Reels",
        tags: ["instagram", "reels", "aesthetic", "beautiful", "engagement"],
        duration: 20,
        aspectRatio: "9:16",
        recommendedProvider: "runwayml",
        providers: ["runwayml", "google_veo"],
        thumbnail: "https://via.placeholder.com/400x300?text=Instagram+Reels",
        cover: "https://via.placeholder.com/1200x800?text=Instagram+Aesthetic",
        quality: "premium",
        scenes: [
          {
            title: "Scene 1",
            visual: "Aesthetically pleasing opening shot",
            narration: "Inspiring content narration",
            durationSeconds: 4,
          },
          {
            title: "Scene 2",
            visual: "Product or lifestyle display",
            narration: "Engaging story continuation",
            durationSeconds: 6,
          },
          {
            title: "Scene 3",
            visual: "Beautiful transitions and overlays",
            narration: "Connection with audience",
            durationSeconds: 6,
          },
          {
            title: "Close",
            visual: "Call to save or share",
            narration: "Save this for later",
            durationSeconds: 4,
          },
        ],
        storyboard: "social_instagram_reels_aesthetic",
        camera: {
          angles: ["overhead", "lifestyle", "detail"],
          movement: ["smooth-pan", "gentle-zoom"],
          lighting: "warm-aesthetic",
          environment: "beautiful-styled-location",
        },
        audio: {
          musicStyle: "trending-instagram-audio",
          voiceStyle: "calm-inspirational",
          tempo: "moderate",
        },
        transitions: ["smooth-fade", "elegant-wipe"],
        textOverlay: [
          {
            text: "SAVE THIS",
            position: "top-right",
            timing: "end",
          },
        ],
        cta: "Follow for More",
        negativePrompt: "no jarring transitions, no low production value, no trending overload",
        promptFragments: ["Instagram aesthetic", "beautiful content", "smooth transitions", "high quality"],
        providerSettings: { runwayml: { quality: "premium" } },
        renderingSettings: { fps: 30, codec: "h264" },
        optimizationRules: [
          "Maintain aesthetic consistency",
          "Smooth transitions",
          "High production value",
        ],
        creditCost: 18,
        createdAt: now,
        updatedAt: now,
      }
    );

    // REAL ESTATE
    templates.push(
      {
        id: "real_estate_luxury_property_tour",
        title: "Luxury Property Virtual Tour",
        description: "Cinematic virtual tour of premium real estate property",
        industry: "Real Estate",
        category: "Product Showcase",
        tags: ["real-estate", "luxury", "property", "tour", "cinematic"],
        duration: 45,
        aspectRatio: "16:9",
        recommendedProvider: "google_veo",
        providers: ["google_veo", "runwayml"],
        thumbnail: "https://via.placeholder.com/400x300?text=Luxury+Property",
        cover: "https://via.placeholder.com/1200x800?text=Property+Tour",
        quality: "ultra",
        scenes: [
          {
            title: "Exterior",
            visual: "Sweeping shots of property exterior and grounds",
            narration: "Welcome to luxury living",
            durationSeconds: 8,
          },
          {
            title: "Entrance",
            visual: "Grand entrance and foyer",
            narration: "First impressions that last",
            durationSeconds: 7,
          },
          {
            title: "Main Spaces",
            visual: "Living areas, kitchen, dining",
            narration: "Designed for entertaining and family moments",
            durationSeconds: 15,
          },
          {
            title: "Bedrooms",
            visual: "Master suite and additional bedrooms",
            narration: "Sanctuary and comfort for the whole family",
            durationSeconds: 8,
          },
          {
            title: "Amenities",
            visual: "Pool, spa, and outdoor features",
            narration: "World-class amenities at your doorstep",
            durationSeconds: 7,
          },
        ],
        storyboard: "real_estate_luxury_tour",
        camera: {
          angles: ["wide", "sweeping", "detail", "lifestyle"],
          movement: ["smooth-tracking", "virtual-walkthrough"],
          lighting: "natural-optimal",
          environment: "luxury-real-estate",
        },
        audio: {
          musicStyle: "elegant-ambient-strings",
          voiceStyle: "luxury-real-estate-agent",
          tempo: "slow",
        },
        transitions: ["smooth-fade", "dissolve"],
        textOverlay: [
          {
            text: "LUXURY LIVING",
            position: "bottom-center",
            timing: "throughout",
          },
        ],
        cta: "Schedule Your Tour",
        negativePrompt:
          "no cluttered spaces, no poor lighting, no dated design, no low resolution photography",
        promptFragments: [
          "luxury property tour",
          "cinematic real estate",
          "premium property showcase",
          "4K quality",
        ],
        providerSettings: { google_veo: { quality: "max" } },
        renderingSettings: { fps: 30, codec: "h264" },
        optimizationRules: [
          "Smooth camera movement",
          "Optimal lighting conditions",
          "High resolution throughout",
          "Professional narration",
        ],
        creditCost: 40,
        createdAt: now,
        updatedAt: now,
      }
    );

    // SAAS / BUSINESS
    templates.push(
      {
        id: "saas_app_demo_problem_solution",
        title: "SaaS App Demo - Problem/Solution",
        description: "Problem and solution format for SaaS product demonstrations",
        industry: "SaaS",
        category: "Problem / Solution",
        tags: ["saas", "business", "app", "demo", "problem-solution"],
        duration: 30,
        aspectRatio: "16:9",
        recommendedProvider: "runwayml",
        providers: ["runwayml", "google_veo"],
        thumbnail: "https://via.placeholder.com/400x300?text=SaaS+Demo",
        cover: "https://via.placeholder.com/1200x800?text=Problem+Solution",
        quality: "premium",
        scenes: [
          {
            title: "Problem",
            visual: "Show the pain point visually",
            narration: "Struggling with manual processes and wasted time?",
            durationSeconds: 7,
          },
          {
            title: "Impact",
            visual: "Emphasize the impact of the problem",
            narration: "You're losing productivity and revenue",
            durationSeconds: 6,
          },
          {
            title: "Solution",
            visual: "Introduce the software solution",
            narration: "Our platform automates and streamlines everything",
            durationSeconds: 8,
          },
          {
            title: "Results",
            visual: "Show the positive outcomes",
            narration: "Customers see 40% efficiency gains in the first month",
            durationSeconds: 6,
          },
          {
            title: "CTA",
            visual: "Product screenshot with benefits",
            narration: "Ready to transform your business?",
            durationSeconds: 3,
          },
        ],
        storyboard: "saas_app_demo_problem_solution",
        camera: {
          angles: ["screen-capture", "talking-head", "b-roll"],
          movement: ["cursor-movement", "smooth-reveals"],
          lighting: "professional-office",
          environment: "professional-setting",
        },
        audio: {
          musicStyle: "professional-corporate-music",
          voiceStyle: "professional-narrator",
          tempo: "moderate",
        },
        transitions: ["fade", "cut"],
        textOverlay: [
          {
            text: "BOOST PRODUCTIVITY",
            position: "center",
            timing: "throughout",
          },
        ],
        cta: "Start Your Free Trial",
        negativePrompt: "no unpolished demo, no confusing UI, no poor audio quality",
        promptFragments: [
          "SaaS product demo",
          "problem and solution",
          "professional presentation",
          "clear benefits",
        ],
        providerSettings: { runwayml: { quality: "premium" } },
        renderingSettings: { fps: 30, codec: "h264" },
        optimizationRules: [
          "Clear problem statement",
          "Strong solution positioning",
          "Visible benefits and results",
          "Professional production",
        ],
        creditCost: 25,
        createdAt: now,
        updatedAt: now,
      }
    );

    return templates;
  }

  getTemplate(id: string): VideoTemplate | undefined {
    return this.templates.get(id);
  }

  getAllTemplates(): VideoTemplate[] {
    return Array.from(this.templates.values());
  }

  getTemplatesByCategory(category: string): VideoTemplate[] {
    return Array.from(this.templates.values()).filter((t) => t.category === category);
  }

  getTemplatesByIndustry(industry: string): VideoTemplate[] {
    return Array.from(this.templates.values()).filter((t) => t.industry === industry);
  }

  getCategories(): string[] {
    return Array.from(this.categories).sort();
  }

  getIndustries(): string[] {
    return Array.from(this.industries).sort();
  }

  getTemplateCount(): number {
    return this.templates.size;
  }

  getCategoryCount(): number {
    return this.categories.size;
  }
}

export const templatesLoader = new TemplatesLoader();
