import { db } from '../db/index.js';
import { videoTemplates } from '../db/schema/videoTemplates.js';
import { createVideoLogger } from '../utils/videoLogger.js';
import type { NewVideoTemplate } from '../types/entities.js';

const logger = createVideoLogger('VideoTemplatesSeed');

/**
 * Curated template catalog — a few strong templates per category rather
 * than hundreds of mediocre ones. Each template carries a base prompt
 * blueprint, supported models, cost and popularity for ranking.
 */
const TEMPLATES = [
  // ---------- Jewelry ----------
  {
    category: 'Jewelry',
    subcategory: 'Rings',
    name: 'Diamond Ring Elegance',
    description: 'Luxury diamond ring showcase with macro shots and sparkling effects',
    style: 'Luxury',
    platform: 'Instagram',
    difficulty: 'Hard',
    popularity: 95,
    thumbnailUrl: 'https://images.unsplash.com/photo-1605100804763-247f67b3557e?w=400',
    previewUrl: '/previews/jewelry-ring.mp4',
    basePromptTemplate:
      'Cinematic luxury diamond ring advertisement, extreme macro shots, sparkling light effects, elegant rotation, black glossy background, premium lighting',
    supportedModels: ['genmo/mochi-1-preview', 'Wan-AI/Wan2.1-T2V-14B'],
    estimatedDuration: 15,
    estimatedCost: '0.12',
    metadata: { vibe: 'Luxury', targetAudience: 'Women', hooks: ['Timeless Elegance', 'Forever Shine'] },
  },
  {
    category: 'Jewelry',
    subcategory: 'Necklaces',
    name: 'Golden Necklace Showcase',
    description: 'Elegant golden necklace display with model and close-up details',
    style: 'Elegant',
    platform: 'Instagram',
    difficulty: 'Medium',
    popularity: 82,
    thumbnailUrl: 'https://images.unsplash.com/photo-1599643477877-530eb83abc8e?w=400',
    previewUrl: '/previews/jewelry-necklace.mp4',
    basePromptTemplate:
      'Elegant golden necklace video, model wearing the piece, close-up details, soft lighting, luxury jewelry showcase',
    supportedModels: ['stabilityai/stable-video-diffusion-img2vid', 'tencent/HunyuanVideo'],
    estimatedDuration: 15,
    estimatedCost: '0.08',
    metadata: { vibe: 'Luxury', targetAudience: 'Women', hooks: ['Golden Elegance', 'Shine Bright'] },
  },
  {
    category: 'Jewelry',
    subcategory: 'Watches',
    name: 'Luxury Watch Precision',
    description: 'Premium watch showcase with mechanical details and luxury setting',
    style: 'Premium',
    platform: 'YouTube',
    difficulty: 'Hard',
    popularity: 88,
    thumbnailUrl: 'https://images.unsplash.com/photo-1523170335258-f5ed11844a49?w=400',
    previewUrl: '/previews/jewelry-watch.mp4',
    basePromptTemplate:
      'Luxury watch video, mechanical details, premium materials, sophisticated setting, high-end watch advertisement',
    supportedModels: ['genmo/mochi-1-preview', 'Wan-AI/Wan2.1-T2V-14B'],
    estimatedDuration: 20,
    estimatedCost: '0.15',
    metadata: { vibe: 'Luxury', targetAudience: 'Men', hooks: ['Precision Engineering', 'Timeless Craft'] },
  },

  // ---------- Fashion ----------
  {
    category: 'Fashion',
    subcategory: 'Dresses',
    name: 'Elegant Dress Showcase',
    description: 'Cinematic showcase for elegant dresses with slow motion and fabric details',
    style: 'Cinematic',
    platform: 'Instagram',
    difficulty: 'Medium',
    popularity: 85,
    thumbnailUrl: 'https://images.unsplash.com/photo-1595777457583-95e059d581b8?w=400',
    previewUrl: '/previews/fashion-dress.mp4',
    basePromptTemplate:
      'Cinematic fashion video, elegant dress, slow camera movements, fabric details, model walking, professional lighting, high-end fashion editorial',
    supportedModels: ['stabilityai/stable-video-diffusion-img2vid', 'genmo/mochi-1-preview'],
    estimatedDuration: 15,
    estimatedCost: '0.08',
    metadata: { vibe: 'Luxury', targetAudience: 'Women', hooks: ['Elegance Redefined', 'Timeless Beauty'] },
  },
  {
    category: 'Fashion',
    subcategory: 'Streetwear',
    name: 'Urban Street Style',
    description: 'Dynamic streetwear showcase with urban backgrounds and fast cuts',
    style: 'Dynamic',
    platform: 'TikTok',
    difficulty: 'Easy',
    popularity: 92,
    thumbnailUrl: 'https://images.unsplash.com/photo-1523398002811-999ca8dec234?w=400',
    previewUrl: '/previews/fashion-street.mp4',
    basePromptTemplate:
      'Dynamic streetwear video, urban backgrounds, fast cuts, energetic movements, street style photography, youthful and trendy',
    supportedModels: ['ali-vilab/AnimateDiff', 'Lightricks/LTX-Video'],
    estimatedDuration: 10,
    estimatedCost: '0.05',
    metadata: { vibe: 'Bold', targetAudience: 'Teens', hooks: ['Street Style Goals', 'Urban Vibes'] },
  },
  {
    category: 'Fashion',
    subcategory: 'Accessories',
    name: 'Luxury Accessories Reveal',
    description: 'Premium accessories showcase with macro shots and luxury lighting',
    style: 'Luxury',
    platform: 'Instagram',
    difficulty: 'Hard',
    popularity: 78,
    thumbnailUrl: 'https://images.unsplash.com/photo-1611085583191-a3b181a88401?w=400',
    previewUrl: '/previews/fashion-accessories.mp4',
    basePromptTemplate:
      'Luxury accessories video, macro shots, premium lighting, elegant transitions, high-end product photography',
    supportedModels: ['genmo/mochi-1-preview', 'Wan-AI/Wan2.1-T2V-14B'],
    estimatedDuration: 15,
    estimatedCost: '0.12',
    metadata: { vibe: 'Luxury', targetAudience: 'Women', hooks: ['Luxury Details', 'Premium Quality'] },
  },

  // ---------- Beauty ----------
  {
    category: 'Beauty',
    subcategory: 'Skincare',
    name: 'Glow Up Skincare',
    description: 'Skincare routine showcase with before/after and product application',
    style: 'Clean',
    platform: 'TikTok',
    difficulty: 'Easy',
    popularity: 94,
    thumbnailUrl: 'https://images.unsplash.com/photo-1556228720-195a672e8a03?w=400',
    previewUrl: '/previews/beauty-skincare.mp4',
    basePromptTemplate:
      'Skincare routine video, product application, before/after results, clean aesthetic, beauty tutorial style',
    supportedModels: ['ali-vilab/AnimateDiff', 'Lightricks/LTX-Video'],
    estimatedDuration: 15,
    estimatedCost: '0.06',
    metadata: { vibe: 'Modern', targetAudience: 'Women', hooks: ['Glow Up', 'Radiant Skin'] },
  },
  {
    category: 'Beauty',
    subcategory: 'Makeup',
    name: 'Makeup Tutorial',
    description: 'Step-by-step makeup tutorial with close-up application shots',
    style: 'Tutorial',
    platform: 'YouTube',
    difficulty: 'Medium',
    popularity: 91,
    thumbnailUrl: 'https://images.unsplash.com/photo-1522335789203-aabd1fc54bc9?w=400',
    previewUrl: '/previews/beauty-makeup.mp4',
    basePromptTemplate:
      'Makeup tutorial video, step-by-step application, close-up shots, professional lighting, beauty influencer style',
    supportedModels: ['stabilityai/stable-video-diffusion-img2vid', 'tencent/HunyuanVideo'],
    estimatedDuration: 20,
    estimatedCost: '0.09',
    metadata: { vibe: 'Modern', targetAudience: 'Women', hooks: ['Perfect Look', 'Beauty Secrets'] },
  },
  {
    category: 'Beauty',
    subcategory: 'Perfume',
    name: 'Luxury Fragrance',
    description: 'Premium perfume showcase with elegant bottle shots and atmosphere',
    style: 'Luxury',
    platform: 'Instagram',
    difficulty: 'Hard',
    popularity: 83,
    thumbnailUrl: 'https://images.unsplash.com/photo-1541643600914-78b084683601?w=400',
    previewUrl: '/previews/beauty-perfume.mp4',
    basePromptTemplate:
      'Luxury perfume video, elegant bottle shots, atmospheric lighting, sophisticated transitions, premium fragrance advertisement',
    supportedModels: ['genmo/mochi-1-preview', 'Wan-AI/Wan2.1-T2V-14B'],
    estimatedDuration: 15,
    estimatedCost: '0.12',
    metadata: { vibe: 'Luxury', targetAudience: 'Women', hooks: ['Scent of Luxury', 'Elegant Essence'] },
  },

  // ---------- Electronics ----------
  {
    category: 'Electronics',
    subcategory: 'Phones',
    name: 'Smartphone Features',
    description: 'Smartphone feature showcase with UI demos and lifestyle shots',
    style: 'Tech',
    platform: 'YouTube',
    difficulty: 'Medium',
    popularity: 93,
    thumbnailUrl: 'https://images.unsplash.com/photo-1511707171634-5f897ff02aa9?w=400',
    previewUrl: '/previews/electronics-phone.mp4',
    basePromptTemplate:
      'Smartphone feature showcase, UI demonstrations, lifestyle shots, tech-focused transitions, modern tech review style',
    supportedModels: ['stabilityai/stable-video-diffusion-img2vid', 'tencent/HunyuanVideo'],
    estimatedDuration: 20,
    estimatedCost: '0.10',
    metadata: { vibe: 'Modern', targetAudience: 'General', hooks: ['Next-Gen Tech', 'Smart Life'] },
  },
  {
    category: 'Electronics',
    subcategory: 'Audio',
    name: 'Premium Audio Experience',
    description: 'Headphones/speakers showcase with sound visualization and lifestyle',
    style: 'Immersive',
    platform: 'Instagram',
    difficulty: 'Medium',
    popularity: 87,
    thumbnailUrl: 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=400',
    previewUrl: '/previews/electronics-audio.mp4',
    basePromptTemplate:
      'Premium audio product video, sound visualization effects, lifestyle shots, immersive transitions, audio equipment showcase',
    supportedModels: ['stabilityai/stable-video-diffusion-img2vid', 'tencent/HunyuanVideo'],
    estimatedDuration: 15,
    estimatedCost: '0.08',
    metadata: { vibe: 'Modern', targetAudience: 'General', hooks: ['Sound Perfection', 'Immerse Yourself'] },
  },
  {
    category: 'Electronics',
    subcategory: 'Gadgets',
    name: 'Smart Gadget Demo',
    description: 'Smart gadget demonstration with features and usage scenarios',
    style: 'Tech',
    platform: 'TikTok',
    difficulty: 'Easy',
    popularity: 90,
    thumbnailUrl: 'https://images.unsplash.com/photo-1519389950473-47ba0277781c?w=400',
    previewUrl: '/previews/electronics-gadget.mp4',
    basePromptTemplate:
      'Smart gadget demo video, feature highlights, usage scenarios, quick cuts, tech unboxing style',
    supportedModels: ['ali-vilab/AnimateDiff', 'Lightricks/LTX-Video'],
    estimatedDuration: 10,
    estimatedCost: '0.05',
    metadata: { vibe: 'Modern', targetAudience: 'General', hooks: ['Game Changer', 'Smart Living'] },
  },

  // ---------- Home ----------
  {
    category: 'Home',
    subcategory: 'Furniture',
    name: 'Modern Furniture Showcase',
    description: 'Modern furniture display in styled room settings',
    style: 'Lifestyle',
    platform: 'Pinterest',
    difficulty: 'Medium',
    popularity: 81,
    thumbnailUrl: 'https://images.unsplash.com/photo-1555041469-a586c61ea9bc?w=400',
    previewUrl: '/previews/home-furniture.mp4',
    basePromptTemplate:
      'Modern furniture showcase, styled room settings, product details, lifestyle transitions, interior design style',
    supportedModels: ['stabilityai/stable-video-diffusion-img2vid', 'tencent/HunyuanVideo'],
    estimatedDuration: 15,
    estimatedCost: '0.08',
    metadata: { vibe: 'Modern', targetAudience: 'General', hooks: ['Home Goals', 'Modern Living'] },
  },
  {
    category: 'Home',
    subcategory: 'Decor',
    name: 'Cozy Home Decor',
    description: 'Cozy home decor items showcase with warm lighting and ambiance',
    style: 'Cozy',
    platform: 'Instagram',
    difficulty: 'Easy',
    popularity: 84,
    thumbnailUrl: 'https://images.unsplash.com/photo-1513694203232-719a280e022f?w=400',
    previewUrl: '/previews/home-decor.mp4',
    basePromptTemplate:
      'Cozy home decor video, warm lighting, product details, inviting transitions, home styling style',
    supportedModels: ['ali-vilab/AnimateDiff', 'Lightricks/LTX-Video'],
    estimatedDuration: 10,
    estimatedCost: '0.05',
    metadata: { vibe: 'Casual', targetAudience: 'General', hooks: ['Cozy Vibes', 'Home Sweet Home'] },
  },

  // ---------- Kitchen ----------
  {
    category: 'Kitchen',
    subcategory: 'Cookware',
    name: 'Kitchen Essentials',
    description: 'Kitchen essentials showcase with cooking scenes and product usage',
    style: 'Lifestyle',
    platform: 'YouTube',
    difficulty: 'Medium',
    popularity: 85,
    thumbnailUrl: 'https://images.unsplash.com/photo-1556909114-f6e7ad7d3136?w=400',
    previewUrl: '/previews/kitchen-cookware.mp4',
    basePromptTemplate:
      'Kitchen essentials video, cooking scenes, product usage, lifestyle transitions, cooking show style',
    supportedModels: ['stabilityai/stable-video-diffusion-img2vid', 'tencent/HunyuanVideo'],
    estimatedDuration: 15,
    estimatedCost: '0.08',
    metadata: { vibe: 'Modern', targetAudience: 'General', hooks: ['Kitchen Goals', 'Cook Like a Pro'] },
  },

  // ---------- Sports ----------
  {
    category: 'Sports',
    subcategory: 'Fitness',
    name: 'Fitness Equipment Demo',
    description: 'Fitness equipment demonstration with workout scenes',
    style: 'Dynamic',
    platform: 'TikTok',
    difficulty: 'Easy',
    popularity: 88,
    thumbnailUrl: 'https://images.unsplash.com/photo-1534438327276-14e5300c3a48?w=400',
    previewUrl: '/previews/sports-fitness.mp4',
    basePromptTemplate:
      'Fitness equipment demo video, workout scenes, product usage, energetic transitions, fitness motivation style',
    supportedModels: ['ali-vilab/AnimateDiff', 'Lightricks/LTX-Video'],
    estimatedDuration: 10,
    estimatedCost: '0.05',
    metadata: { vibe: 'Bold', targetAudience: 'Athletes', hooks: ['Get Fit', 'Workout Goals'] },
  },
  {
    category: 'Sports',
    subcategory: 'Outdoor',
    name: 'Outdoor Adventure Gear',
    description: 'Outdoor adventure gear showcase with nature scenes',
    style: 'Adventure',
    platform: 'YouTube',
    difficulty: 'Medium',
    popularity: 82,
    thumbnailUrl: 'https://images.unsplash.com/photo-1551632811-561732d1e306?w=400',
    previewUrl: '/previews/sports-outdoor.mp4',
    basePromptTemplate:
      'Outdoor adventure gear video, nature scenes, product usage, adventure transitions, outdoor lifestyle style',
    supportedModels: ['stabilityai/stable-video-diffusion-img2vid', 'tencent/HunyuanVideo'],
    estimatedDuration: 15,
    estimatedCost: '0.08',
    metadata: { vibe: 'Bold', targetAudience: 'General', hooks: ['Adventure Awaits', 'Explore More'] },
  },

  // ---------- Kids ----------
  {
    category: 'Kids',
    subcategory: 'Toys',
    name: 'Fun Toy Showcase',
    description: 'Fun toy showcase with kids playing and colorful scenes',
    style: 'Playful',
    platform: 'TikTok',
    difficulty: 'Easy',
    popularity: 91,
    thumbnailUrl: 'https://images.unsplash.com/photo-1558060370-d644479cb6f7?w=400',
    previewUrl: '/previews/kids-toys.mp4',
    basePromptTemplate:
      'Fun toy showcase video, kids playing, colorful scenes, playful transitions, toy commercial style',
    supportedModels: ['ali-vilab/AnimateDiff', 'Lightricks/LTX-Video'],
    estimatedDuration: 10,
    estimatedCost: '0.05',
    metadata: { vibe: 'Casual', targetAudience: 'Kids', hooks: ['Play Time', 'Fun Guaranteed'] },
  },
  {
    category: 'Kids',
    subcategory: 'Clothing',
    name: 'Kids Fashion Cute',
    description: 'Kids fashion showcase with cute outfits and playful poses',
    style: 'Cute',
    platform: 'Instagram',
    difficulty: 'Easy',
    popularity: 86,
    thumbnailUrl: 'https://images.unsplash.com/photo-1519238263530-99bdd11df2ea?w=400',
    previewUrl: '/previews/kids-fashion.mp4',
    basePromptTemplate:
      'Kids fashion video, cute outfits, playful poses, cheerful transitions, kids clothing showcase',
    supportedModels: ['ali-vilab/AnimateDiff', 'Lightricks/LTX-Video'],
    estimatedDuration: 10,
    estimatedCost: '0.05',
    metadata: { vibe: 'Casual', targetAudience: 'Parents', hooks: ['Cute & Comfy', 'Little Fashionista'] },
  },

  // ---------- Luxury ----------
  {
    category: 'Luxury',
    subcategory: 'Premium',
    name: 'Premium Product Reveal',
    description: 'Premium product reveal with cinematic shots and luxury atmosphere',
    style: 'Cinematic',
    platform: 'YouTube',
    difficulty: 'Hard',
    popularity: 90,
    thumbnailUrl: 'https://images.unsplash.com/photo-1549298916-b41d501d3772?w=400',
    previewUrl: '/previews/luxury-premium.mp4',
    basePromptTemplate:
      'Premium product reveal video, cinematic shots, luxury atmosphere, sophisticated transitions, high-end commercial style',
    supportedModels: ['genmo/mochi-1-preview', 'Wan-AI/Wan2.1-T2V-14B'],
    estimatedDuration: 20,
    estimatedCost: '0.15',
    metadata: { vibe: 'Luxury', targetAudience: 'Luxury Buyers', hooks: ['Excellence Redefined', 'Premium Quality'] },
  },
  {
    category: 'Luxury',
    subcategory: 'Designer',
    name: 'Designer Showcase',
    description: 'Designer product showcase with fashion editorial style',
    style: 'Editorial',
    platform: 'Instagram',
    difficulty: 'Hard',
    popularity: 89,
    thumbnailUrl: 'https://images.unsplash.com/photo-1490481651871-ab68de25d43d?w=400',
    previewUrl: '/previews/luxury-designer.mp4',
    basePromptTemplate:
      'Designer product showcase, fashion editorial style, model poses, high-end transitions, designer brand commercial',
    supportedModels: ['genmo/mochi-1-preview', 'Wan-AI/Wan2.1-T2V-14B'],
    estimatedDuration: 15,
    estimatedCost: '0.12',
    metadata: { vibe: 'Luxury', targetAudience: 'Luxury Buyers', hooks: ['Designer Dreams', 'Haute Couture'] },
  },

  // ---------- Food ----------
  {
    category: 'Food',
    subcategory: 'Restaurant',
    name: 'Restaurant Menu Showcase',
    description: 'Restaurant menu items showcase with appetizing shots',
    style: 'Appetizing',
    platform: 'Instagram',
    difficulty: 'Medium',
    popularity: 88,
    thumbnailUrl: 'https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=400',
    previewUrl: '/previews/food-restaurant.mp4',
    basePromptTemplate:
      'Restaurant menu showcase, appetizing food shots, plating details, inviting transitions, food commercial style',
    supportedModels: ['stabilityai/stable-video-diffusion-img2vid', 'tencent/HunyuanVideo'],
    estimatedDuration: 15,
    estimatedCost: '0.08',
    metadata: { vibe: 'Casual', targetAudience: 'General', hooks: ['Taste the Difference', 'Delicious Moments'] },
  },
  {
    category: 'Food',
    subcategory: 'Beverages',
    name: 'Premium Beverage',
    description: 'Premium beverage showcase with refreshing shots',
    style: 'Fresh',
    platform: 'Instagram',
    difficulty: 'Medium',
    popularity: 82,
    thumbnailUrl: 'https://images.unsplash.com/photo-1544145945-f90425340c7e?w=400',
    previewUrl: '/previews/food-beverage.mp4',
    basePromptTemplate:
      'Premium beverage video, refreshing shots, condensation details, vibrant transitions, drink commercial style',
    supportedModels: ['stabilityai/stable-video-diffusion-img2vid', 'tencent/HunyuanVideo'],
    estimatedDuration: 10,
    estimatedCost: '0.06',
    metadata: { vibe: 'Modern', targetAudience: 'General', hooks: ['Refresh Yourself', 'Pure Taste'] },
  },

  // ---------- Health ----------
  {
    category: 'Health',
    subcategory: 'Supplements',
    name: 'Health Supplements',
    description: 'Health supplements showcase with wellness scenes',
    style: 'Clean',
    platform: 'Instagram',
    difficulty: 'Easy',
    popularity: 84,
    thumbnailUrl: 'https://images.unsplash.com/photo-1556911220-e15b29be8c8f?w=400',
    previewUrl: '/previews/health-supplements.mp4',
    basePromptTemplate:
      'Health supplements video, wellness scenes, product usage, clean aesthetic, health brand commercial',
    supportedModels: ['ali-vilab/AnimateDiff', 'Lightricks/LTX-Video'],
    estimatedDuration: 10,
    estimatedCost: '0.05',
    metadata: { vibe: 'Modern', targetAudience: 'General', hooks: ['Feel Your Best', 'Wellness Journey'] },
  },

  // ---------- Automotive ----------
  {
    category: 'Automotive',
    subcategory: 'Cars',
    name: 'Luxury Car Showcase',
    description: 'Luxury car showcase with cinematic driving shots',
    style: 'Cinematic',
    platform: 'YouTube',
    difficulty: 'Hard',
    popularity: 92,
    thumbnailUrl: 'https://images.unsplash.com/photo-1503376780353-7e6692767b70?w=400',
    previewUrl: '/previews/automotive-cars.mp4',
    basePromptTemplate:
      'Luxury car showcase, cinematic driving shots, detail close-ups, premium transitions, automotive commercial style',
    supportedModels: ['genmo/mochi-1-preview', 'Wan-AI/Wan2.1-T2V-14B'],
    estimatedDuration: 20,
    estimatedCost: '0.15',
    metadata: { vibe: 'Luxury', targetAudience: 'Men', hooks: ['Drive the Dream', 'Performance Redefined'] },
  },
  {
    category: 'Automotive',
    subcategory: 'Accessories',
    name: 'Car Accessories',
    description: 'Car accessories showcase with installation and usage',
    style: 'Practical',
    platform: 'TikTok',
    difficulty: 'Easy',
    popularity: 81,
    thumbnailUrl: 'https://images.unsplash.com/photo-1489824904134-891ab64532f1?w=400',
    previewUrl: '/previews/automotive-accessories.mp4',
    basePromptTemplate:
      'Car accessories video, installation scenes, product usage, practical transitions, automotive product showcase',
    supportedModels: ['ali-vilab/AnimateDiff', 'Lightricks/LTX-Video'],
    estimatedDuration: 10,
    estimatedCost: '0.05',
    metadata: { vibe: 'Modern', targetAudience: 'Men', hooks: ['Upgrade Your Ride', 'Essential Gear'] },
  },

  // ---------- Pet ----------
  {
    category: 'Pet',
    subcategory: 'Dogs',
    name: 'Dog Products Showcase',
    description: 'Dog products showcase with happy pets and owners',
    style: 'Playful',
    platform: 'TikTok',
    difficulty: 'Easy',
    popularity: 90,
    thumbnailUrl: 'https://images.unsplash.com/photo-1587300003388-59208cc962cb?w=400',
    previewUrl: '/previews/pet-dogs.mp4',
    basePromptTemplate:
      'Dog products video, happy pets, playful scenes, heartwarming transitions, pet product commercial style',
    supportedModels: ['ali-vilab/AnimateDiff', 'Lightricks/LTX-Video'],
    estimatedDuration: 10,
    estimatedCost: '0.05',
    metadata: { vibe: 'Casual', targetAudience: 'Pet Owners', hooks: ['Happy Paws', 'Love Your Dog'] },
  },
  {
    category: 'Pet',
    subcategory: 'Cats',
    name: 'Cat Products Showcase',
    description: 'Cat products showcase with cute cats and cozy scenes',
    style: 'Cute',
    platform: 'Instagram',
    difficulty: 'Easy',
    popularity: 88,
    thumbnailUrl: 'https://images.unsplash.com/photo-1514888286974-6c03e2ca1dba?w=400',
    previewUrl: '/previews/pet-cats.mp4',
    basePromptTemplate:
      'Cat products video, cute cats, cozy scenes, adorable transitions, cat product showcase',
    supportedModels: ['ali-vilab/AnimateDiff', 'Lightricks/LTX-Video'],
    estimatedDuration: 10,
    estimatedCost: '0.05',
    metadata: { vibe: 'Casual', targetAudience: 'Pet Owners', hooks: ['Purrfect Choice', 'Cat Love'] },
  },

  // ---------- Travel ----------
  {
    category: 'Travel',
    subcategory: 'Luggage',
    name: 'Travel Luggage Showcase',
    description: 'Travel luggage showcase with adventure destinations',
    style: 'Adventure',
    platform: 'Instagram',
    difficulty: 'Medium',
    popularity: 84,
    thumbnailUrl: 'https://images.unsplash.com/photo-1521222942936-6a4a8d8b4a77?w=400',
    previewUrl: '/previews/travel-luggage.mp4',
    basePromptTemplate:
      'Travel luggage video, adventure destinations, product features, wanderlust transitions, travel brand commercial',
    supportedModels: ['stabilityai/stable-video-diffusion-img2vid', 'tencent/HunyuanVideo'],
    estimatedDuration: 15,
    estimatedCost: '0.08',
    metadata: { vibe: 'Adventure', targetAudience: 'Travelers', hooks: ['Travel in Style', 'Adventure Awaits'] },
  },
  {
    category: 'Travel',
    subcategory: 'Hotels',
    name: 'Luxury Hotel Experience',
    description: 'Luxury hotel showcase with premium amenities and views',
    style: 'Luxury',
    platform: 'YouTube',
    difficulty: 'Hard',
    popularity: 87,
    thumbnailUrl: 'https://images.unsplash.com/photo-1566073771259-6a8506099945?w=400',
    previewUrl: '/previews/travel-hotel.mp4',
    basePromptTemplate:
      'Luxury hotel video, premium amenities, scenic views, sophisticated transitions, hospitality commercial style',
    supportedModels: ['genmo/mochi-1-preview', 'Wan-AI/Wan2.1-T2V-14B'],
    estimatedDuration: 20,
    estimatedCost: '0.12',
    metadata: { vibe: 'Luxury', targetAudience: 'Travelers', hooks: ['Escape to Luxury', 'Unforgettable Stays'] },
  },

  // ---------- Business ----------
  {
    category: 'Business',
    subcategory: 'Corporate',
    name: 'Corporate Brand Video',
    description: 'Corporate brand video with professional scenes',
    style: 'Professional',
    platform: 'YouTube',
    difficulty: 'Medium',
    popularity: 82,
    thumbnailUrl: 'https://images.unsplash.com/photo-1552664730-d307ca884978?w=400',
    previewUrl: '/previews/business-corporate.mp4',
    basePromptTemplate:
      'Corporate brand video, professional scenes, team collaboration, trustworthy transitions, corporate commercial style',
    supportedModels: ['stabilityai/stable-video-diffusion-img2vid', 'tencent/HunyuanVideo'],
    estimatedDuration: 20,
    estimatedCost: '0.10',
    metadata: { vibe: 'Corporate', targetAudience: 'Professionals', hooks: ['Excellence in Business', 'Trusted Partner'] },
  },
  {
    category: 'Business',
    subcategory: 'SaaS',
    name: 'SaaS Product Demo',
    description: 'SaaS product demo with UI walkthrough and features',
    style: 'Tech',
    platform: 'YouTube',
    difficulty: 'Medium',
    popularity: 85,
    thumbnailUrl: 'https://images.unsplash.com/photo-1460925895917-afdab827c52f?w=400',
    previewUrl: '/previews/business-saas.mp4',
    basePromptTemplate:
      'SaaS product demo video, UI walkthrough, feature highlights, modern transitions, software product commercial',
    supportedModels: ['stabilityai/stable-video-diffusion-img2vid', 'Lightricks/LTX-Video'],
    estimatedDuration: 20,
    estimatedCost: '0.10',
    metadata: { vibe: 'Modern', targetAudience: 'Business', hooks: ['Work Smarter', 'Transform Your Workflow'] },
  },
];

export async function seedVideoTemplates(): Promise<number> {
  logger.info('Seeding video templates...');
  let inserted = 0;

  for (const template of TEMPLATES) {
    try {
      await db
        .insert(videoTemplates)
        .values(template)
        .onConflictDoNothing();
      inserted++;
    } catch (error) {
      logger.error('Failed to seed template', error as Error, { name: template.name });
    }
  }

  logger.info('Video templates seeded', { count: inserted });
  return inserted;
}