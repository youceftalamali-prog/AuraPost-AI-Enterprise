// src/features/templates/templateCatalog.ts
// Ready-Templates catalog for AuraPost (t168).
//
// Pure and dependency-free (only a type-only import), so it is fully
// unit-testable and safe in CI. Templates are classified by product type
// (category) and then a sub-branch, matching the "hundreds of templates"
// hierarchy the product vision describes. This seed set is intentionally small
// but structured to scale: the gallery and API treat it as a fallback and can
// later be replaced by a server-provided catalog with the same shape.
//
// NOTE: Promo ("البرو") is TEMPLATE-FREE generation and is deliberately NOT
// represented here as a template. The gallery surfaces a separate promo entry.

import type { AgentLocale } from '../agent-shell/types';

export const TEMPLATE_CATALOG_SCHEMA = 'aurapost.template-catalog.v1';

export type TemplateAspectRatio = '9:16' | '1:1' | '16:9';

export type TemplateCategoryId =
  | 'jewelry'
  | 'fashion'
  | 'beauty'
  | 'electronics'
  | 'home'
  | 'fitness'
  | 'food'
  | 'universal';

export interface LocalizedText {
  ar: string;
  fr: string;
  en: string;
}

export interface TemplateSubBranch {
  id: string;
  label: LocalizedText;
}

export interface TemplateCategory {
  id: TemplateCategoryId;
  label: LocalizedText;
  accent: string;
  subBranches: TemplateSubBranch[];
}

export interface ReadyTemplate {
  id: string;
  categoryId: TemplateCategoryId;
  subBranchId: string;
  title: LocalizedText;
  description: LocalizedText;
  aspectRatio: TemplateAspectRatio;
  accent: string;
  /** Locales for which a multilingual AI actor / voice is available. */
  actorLocales: AgentLocale[];
  /** Two-person (dialogue) scenario template. */
  isTwoPerson: boolean;
  durationSeconds: number;
  /** Empty until showcase media is populated (content task). */
  previewVideoUrl: string;
  posterUrl: string;
}

/** Resolve a localized string with graceful fallback. */
export function pickText(text: LocalizedText, locale: AgentLocale): string {
  return text[locale] || text.en || text.ar;
}

export const TEMPLATE_CATEGORIES: TemplateCategory[] = [
  {
    id: 'jewelry',
    label: { ar: 'مجوهرات', fr: 'Bijoux', en: 'Jewelry' },
    accent: 'from-amber-400/30 to-yellow-700/10',
    subBranches: [
      { id: 'rings', label: { ar: 'خواتم', fr: 'Bagues', en: 'Rings' } },
      { id: 'necklaces', label: { ar: 'قلائد', fr: 'Colliers', en: 'Necklaces' } },
    ],
  },
  {
    id: 'fashion',
    label: { ar: 'أزياء', fr: 'Mode', en: 'Fashion' },
    accent: 'from-fuchsia-500/25 to-purple-700/10',
    subBranches: [
      { id: 'streetwear', label: { ar: 'ملابس عصرية', fr: 'Streetwear', en: 'Streetwear' } },
      { id: 'formal', label: { ar: 'رسمي', fr: 'Formel', en: 'Formal' } },
    ],
  },
  {
    id: 'beauty',
    label: { ar: 'جمال', fr: 'Beauté', en: 'Beauty' },
    accent: 'from-rose-400/25 to-pink-700/10',
    subBranches: [
      { id: 'skincare', label: { ar: 'العناية بالبشرة', fr: 'Soin', en: 'Skincare' } },
      { id: 'makeup', label: { ar: 'مكياج', fr: 'Maquillage', en: 'Makeup' } },
    ],
  },
  {
    id: 'electronics',
    label: { ar: 'إلكترونيات', fr: 'Électronique', en: 'Electronics' },
    accent: 'from-cyan-400/25 to-blue-700/10',
    subBranches: [
      { id: 'gadgets', label: { ar: 'أجهزة', fr: 'Gadgets', en: 'Gadgets' } },
      { id: 'audio', label: { ar: 'صوتيات', fr: 'Audio', en: 'Audio' } },
    ],
  },
  {
    id: 'home',
    label: { ar: 'المنزل', fr: 'Maison', en: 'Home' },
    accent: 'from-emerald-400/25 to-teal-700/10',
    subBranches: [
      { id: 'decor', label: { ar: 'ديكور', fr: 'Déco', en: 'Decor' } },
      { id: 'kitchen', label: { ar: 'مطبخ', fr: 'Cuisine', en: 'Kitchen' } },
    ],
  },
  {
    id: 'fitness',
    label: { ar: 'لياقة', fr: 'Fitness', en: 'Fitness' },
    accent: 'from-orange-400/25 to-red-700/10',
    subBranches: [
      { id: 'gear', label: { ar: 'معدات', fr: 'Équipement', en: 'Gear' } },
      { id: 'supplements', label: { ar: 'مكملات', fr: 'Compléments', en: 'Supplements' } },
    ],
  },
  {
    id: 'food',
    label: { ar: 'طعام', fr: 'Alimentaire', en: 'Food' },
    accent: 'from-lime-400/25 to-green-700/10',
    subBranches: [
      { id: 'restaurant', label: { ar: 'مطاعم', fr: 'Restaurant', en: 'Restaurant' } },
      { id: 'packaged', label: { ar: 'معلبات', fr: 'Emballé', en: 'Packaged' } },
    ],
  },
  {
    id: 'universal',
    label: { ar: 'عام', fr: 'Universel', en: 'Universal' },
    accent: 'from-indigo-400/25 to-violet-700/10',
    subBranches: [
      { id: 'ugc', label: { ar: 'محتوى المستخدم', fr: 'UGC', en: 'UGC' } },
      { id: 'testimonial', label: { ar: 'شهادات', fr: 'Témoignage', en: 'Testimonial' } },
    ],
  },
];

export const SEED_TEMPLATES: ReadyTemplate[] = [
  {
    id: 'jewelry-rings-luxury',
    categoryId: 'jewelry',
    subBranchId: 'rings',
    title: { ar: 'كشف فاخر', fr: 'Révélation luxe', en: 'Luxury Reveal' },
    description: { ar: 'لقطات ماكرو أنيقة وإيقاع راقٍ للخواتم.', fr: 'Macro élégant et rythme premium.', en: 'Elegant macro shots and premium pacing.' },
    aspectRatio: '9:16',
    accent: 'from-amber-400/30 to-yellow-700/10',
    actorLocales: ['ar', 'fr'],
    isTwoPerson: false,
    durationSeconds: 18,
    previewVideoUrl: '',
    posterUrl: '',
  },
  {
    id: 'jewelry-necklace-story',
    categoryId: 'jewelry',
    subBranchId: 'necklaces',
    title: { ar: 'حكاية قلادة', fr: 'Histoire de collier', en: 'Necklace Story' },
    description: { ar: 'سرد عاطفي يُبرز التفاصيل.', fr: 'Récit émotionnel qui met en valeur les détails.', en: 'An emotional narrative that highlights detail.' },
    aspectRatio: '9:16',
    accent: 'from-amber-400/30 to-yellow-700/10',
    actorLocales: ['ar', 'fr', 'en'],
    isTwoPerson: false,
    durationSeconds: 22,
    previewVideoUrl: '',
    posterUrl: '',
  },
  {
    id: 'fashion-streetwear-drop',
    categoryId: 'fashion',
    subBranchId: 'streetwear',
    title: { ar: 'إطلاق مجموعة', fr: 'Nouvelle collection', en: 'New Collection Drop' },
    description: { ar: 'قطعات تحريرية سريعة لإطلاق منتج.', fr: 'Montage éditorial rapide pour un drop.', en: 'Fast editorial cuts for a product drop.' },
    aspectRatio: '9:16',
    accent: 'from-fuchsia-500/25 to-purple-700/10',
    actorLocales: ['ar', 'fr', 'en'],
    isTwoPerson: false,
    durationSeconds: 20,
    previewVideoUrl: '',
    posterUrl: '',
  },
  {
    id: 'fashion-formal-editorial',
    categoryId: 'fashion',
    subBranchId: 'formal',
    title: { ar: 'إطلالة رسمية', fr: 'Ligne formelle', en: 'Formal Editorial' },
    description: { ar: 'تصوير أنيق بإضاءة ناعمة.', fr: 'Prise de vue élégante à lumière douce.', en: 'Elegant capture with soft lighting.' },
    aspectRatio: '4:5' === '4:5' ? '1:1' : '1:1',
    accent: 'from-fuchsia-500/25 to-purple-700/10',
    actorLocales: ['fr', 'en'],
    isTwoPerson: false,
    durationSeconds: 24,
    previewVideoUrl: '',
    posterUrl: '',
  },
  {
    id: 'beauty-skincare-ritual',
    categoryId: 'beauty',
    subBranchId: 'skincare',
    title: { ar: 'طقوس العناية', fr: 'Rituel de soin', en: 'Skincare Ritual' },
    description: { ar: 'ملمس ونتائج وتسلسل أسلوب حياة.', fr: 'Texture, résultats et style de vie.', en: 'Texture, results, and a lifestyle sequence.' },
    aspectRatio: '9:16',
    accent: 'from-rose-400/25 to-pink-700/10',
    actorLocales: ['ar', 'fr'],
    isTwoPerson: false,
    durationSeconds: 21,
    previewVideoUrl: '',
    posterUrl: '',
  },
  {
    id: 'beauty-makeup-tutorial',
    categoryId: 'beauty',
    subBranchId: 'makeup',
    title: { ar: 'درس مكياج', fr: 'Tuto maquillage', en: 'Makeup Tutorial' },
    description: { ar: 'خطوات واضحة مع لقطات قريبة.', fr: 'Étapes claires avec gros plans.', en: 'Clear steps with close-up shots.' },
    aspectRatio: '9:16',
    accent: 'from-rose-400/25 to-pink-700/10',
    actorLocales: ['ar', 'fr', 'en'],
    isTwoPerson: false,
    durationSeconds: 28,
    previewVideoUrl: '',
    posterUrl: '',
  },
  {
    id: 'electronics-gadget-demo',
    categoryId: 'electronics',
    subBranchId: 'gadgets',
    title: { ar: 'عرض الميزات', fr: 'Démo produit', en: 'Feature Demo' },
    description: { ar: 'فوائد واضحة مع حركة عصرية.', fr: 'Avantages clairs avec mouvement moderne.', en: 'Clear benefits with modern product motion.' },
    aspectRatio: '16:9',
    accent: 'from-cyan-400/25 to-blue-700/10',
    actorLocales: ['ar', 'en'],
    isTwoPerson: false,
    durationSeconds: 25,
    previewVideoUrl: '',
    posterUrl: '',
  },
  {
    id: 'electronics-audio-unbox',
    categoryId: 'electronics',
    subBranchId: 'audio',
    title: { ar: 'فتح العلبة', fr: 'Unboxing audio', en: 'Audio Unboxing' },
    description: { ar: 'تجربة فتح حسية للمنتج.', fr: 'Expérience de déballage sensorielle.', en: 'A sensory unboxing experience.' },
    aspectRatio: '9:16',
    accent: 'from-cyan-400/25 to-blue-700/10',
    actorLocales: ['fr', 'en'],
    isTwoPerson: false,
    durationSeconds: 19,
    previewVideoUrl: '',
    posterUrl: '',
  },
  {
    id: 'home-decor-transform',
    categoryId: 'home',
    subBranchId: 'decor',
    title: { ar: 'تحويل المساحة', fr: 'Transformation déco', en: 'Space Upgrade' },
    description: { ar: 'قبل وبعد لتحويل المنزل.', fr: 'Avant / après de transformation.', en: 'Before-and-after home transformation.' },
    aspectRatio: '9:16',
    accent: 'from-emerald-400/25 to-teal-700/10',
    actorLocales: ['ar', 'fr'],
    isTwoPerson: false,
    durationSeconds: 23,
    previewVideoUrl: '',
    posterUrl: '',
  },
  {
    id: 'home-kitchen-hack',
    categoryId: 'home',
    subBranchId: 'kitchen',
    title: { ar: 'حيلة مطبخ', fr: 'Astuce cuisine', en: 'Kitchen Hack' },
    description: { ar: 'حل سريع يومي للمطبخ.', fr: 'Solution rapide du quotidien.', en: 'A quick everyday kitchen solution.' },
    aspectRatio: '9:16',
    accent: 'from-emerald-400/25 to-teal-700/10',
    actorLocales: ['ar', 'fr', 'en'],
    isTwoPerson: false,
    durationSeconds: 17,
    previewVideoUrl: '',
    posterUrl: '',
  },
  {
    id: 'fitness-gear-performance',
    categoryId: 'fitness',
    subBranchId: 'gear',
    title: { ar: 'طاقة الأداء', fr: 'Énergie performance', en: 'Performance Energy' },
    description: { ar: 'حركة ديناميكية وسرد محفّز.', fr: 'Action dynamique et récit motivant.', en: 'Dynamic action and benefit-led storytelling.' },
    aspectRatio: '9:16',
    accent: 'from-orange-400/25 to-red-700/10',
    actorLocales: ['ar', 'en'],
    isTwoPerson: false,
    durationSeconds: 20,
    previewVideoUrl: '',
    posterUrl: '',
  },
  {
    id: 'fitness-supplement-energy',
    categoryId: 'fitness',
    subBranchId: 'supplements',
    title: { ar: 'دفعة طاقة', fr: 'Boost énergie', en: 'Energy Boost' },
    description: { ar: 'فوائد المكمل بأسلوب واضح.', fr: 'Avantages du complément clairement.', en: 'Supplement benefits, clearly framed.' },
    aspectRatio: '9:16',
    accent: 'from-orange-400/25 to-red-700/10',
    actorLocales: ['fr', 'en'],
    isTwoPerson: false,
    durationSeconds: 16,
    previewVideoUrl: '',
    posterUrl: '',
  },
  {
    id: 'food-restaurant-sensory',
    categoryId: 'food',
    subBranchId: 'restaurant',
    title: { ar: 'لقطة حسية', fr: 'Gros plan sensoriel', en: 'Sensory Close-up' },
    description: { ar: 'مرئيات تفتح الشهية وتفاصيل غنية.', fr: 'Visuels appétissants et détails riches.', en: 'Appetite-led visuals and rich detail.' },
    aspectRatio: '9:16',
    accent: 'from-lime-400/25 to-green-700/10',
    actorLocales: ['ar', 'fr'],
    isTwoPerson: false,
    durationSeconds: 18,
    previewVideoUrl: '',
    posterUrl: '',
  },
  {
    id: 'food-packaged-review',
    categoryId: 'food',
    subBranchId: 'packaged',
    title: { ar: 'مراجعة حوارية', fr: 'Revue à deux', en: 'Two-person Review' },
    description: { ar: 'حوار بين شخصين حول المنتج.', fr: 'Dialogue à deux autour du produit.', en: 'A two-person dialogue about the product.' },
    aspectRatio: '9:16',
    accent: 'from-lime-400/25 to-green-700/10',
    actorLocales: ['ar', 'fr', 'en'],
    isTwoPerson: true,
    durationSeconds: 26,
    previewVideoUrl: '',
    posterUrl: '',
  },
  {
    id: 'universal-ugc-problem-solution',
    categoryId: 'universal',
    subBranchId: 'ugc',
    title: { ar: 'مشكلة – حل (UGC)', fr: 'Problème–solution (UGC)', en: 'UGC Problem–Solution' },
    description: { ar: 'بنية استجابة مباشرة مرنة.', fr: 'Structure directe et flexible.', en: 'A flexible direct-response structure.' },
    aspectRatio: '9:16',
    accent: 'from-indigo-400/25 to-violet-700/10',
    actorLocales: ['ar', 'fr', 'en'],
    isTwoPerson: false,
    durationSeconds: 22,
    previewVideoUrl: '',
    posterUrl: '',
  },
  {
    id: 'universal-testimonial-dialogue',
    categoryId: 'universal',
    subBranchId: 'testimonial',
    title: { ar: 'شهادة حوارية', fr: 'Témoignage dialogué', en: 'Dialogue Testimonial' },
    description: { ar: 'شهادة بين شخصين تبني الثقة.', fr: 'Témoignage à deux qui inspire confiance.', en: 'A two-person testimonial that builds trust.' },
    aspectRatio: '9:16',
    accent: 'from-indigo-400/25 to-violet-700/10',
    actorLocales: ['ar', 'fr', 'en'],
    isTwoPerson: true,
    durationSeconds: 24,
    previewVideoUrl: '',
    posterUrl: '',
  },
];

/** All categories, in display order. */
export function listCategories(categories: TemplateCategory[] = TEMPLATE_CATEGORIES): TemplateCategory[] {
  return categories;
}

export function findCategory(
  categoryId: TemplateCategoryId,
  categories: TemplateCategory[] = TEMPLATE_CATEGORIES,
): TemplateCategory | undefined {
  return categories.find((category) => category.id === categoryId);
}

/** Sub-branches for a category (empty when the category is unknown). */
export function listSubBranches(
  categoryId: TemplateCategoryId,
  categories: TemplateCategory[] = TEMPLATE_CATEGORIES,
): TemplateSubBranch[] {
  return findCategory(categoryId, categories)?.subBranches ?? [];
}

export interface TemplateFilter {
  categoryId?: TemplateCategoryId | 'all';
  subBranchId?: string | 'all';
  query?: string;
  locale?: AgentLocale;
}

/** Filter templates by category, sub-branch, and free-text query. */
export function filterTemplates(
  templates: ReadyTemplate[] = SEED_TEMPLATES,
  filter: TemplateFilter = {},
): ReadyTemplate[] {
  const categoryId = filter.categoryId ?? 'all';
  const subBranchId = filter.subBranchId ?? 'all';
  const locale = filter.locale ?? 'en';
  const query = (filter.query ?? '').trim().toLowerCase();
  return templates.filter((template) => {
    if (categoryId !== 'all' && template.categoryId !== categoryId) return false;
    if (subBranchId !== 'all' && template.subBranchId !== subBranchId) return false;
    if (!query) return true;
    const haystack = [
      template.id,
      pickText(template.title, locale),
      pickText(template.description, locale),
      template.title.ar,
      template.title.fr,
      template.title.en,
    ]
      .join(' ')
      .toLowerCase();
    return haystack.includes(query);
  });
}

/** Group templates by their category id. */
export function groupByCategory(
  templates: ReadyTemplate[] = SEED_TEMPLATES,
): Map<TemplateCategoryId, ReadyTemplate[]> {
  const grouped = new Map<TemplateCategoryId, ReadyTemplate[]>();
  for (const template of templates) {
    const bucket = grouped.get(template.categoryId) ?? [];
    bucket.push(template);
    grouped.set(template.categoryId, bucket);
  }
  return grouped;
}

/** Count templates per category id. */
export function countByCategory(
  templates: ReadyTemplate[] = SEED_TEMPLATES,
): Record<string, number> {
  const counts: Record<string, number> = {};
  for (const template of templates) {
    counts[template.categoryId] = (counts[template.categoryId] ?? 0) + 1;
  }
  return counts;
}
