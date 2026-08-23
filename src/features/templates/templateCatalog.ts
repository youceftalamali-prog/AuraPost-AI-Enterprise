// src/features/templates/templateCatalog.ts
import type { AgentLocale } from '../agent-shell/types';

export const TEMPLATE_CATALOG_SCHEMA = 'aurapost.template-catalog.v1';
export type TemplateAspectRatio = '9:16' | '1:1' | '16:9';
export type TemplateCategoryId = 'jewelry' | 'fashion' | 'beauty' | 'electronics' | 'home' | 'fitness' | 'food' | 'universal';

export interface LocalizedText { ar: string; fr: string; en: string }
export interface TemplateSubBranch { id: string; label: LocalizedText }
export interface TemplateCategory { id: TemplateCategoryId; label: LocalizedText; accent: string; subBranches: TemplateSubBranch[] }
export interface TemplateVisual { emoji: string; gradient: string; frames: LocalizedText[] }
export interface TemplateScenario { hook: LocalizedText; cta: LocalizedText; scenes: LocalizedText[] }
export interface ReadyTemplate {
  id: string;
  categoryId: TemplateCategoryId;
  subBranchId: string;
  title: LocalizedText;
  description: LocalizedText;
  aspectRatio: TemplateAspectRatio;
  accent: string;
  actorLocales: AgentLocale[];
  isTwoPerson: boolean;
  durationSeconds: number;
  previewVideoUrl: string;
  posterUrl: string;
  visual: TemplateVisual;
  scenario: TemplateScenario;
}

export function pickText(text: LocalizedText, locale: AgentLocale): string { return text[locale] || text.en || text.ar; }
const t = (ar: string, fr: string, en: string): LocalizedText => ({ ar, fr, en });
const visual = (emoji: string, gradient: string, frames: string[]): TemplateVisual => ({
  emoji,
  gradient,
  frames: frames.map((frame) => t(frame, frame, frame)),
});
const scenario = (hook: string, scenes: string[], cta: string): TemplateScenario => ({
  hook: t(hook, hook, hook),
  scenes: scenes.map((scene) => t(scene, scene, scene)),
  cta: t(cta, cta, cta),
});

export const TEMPLATE_CATEGORIES: TemplateCategory[] = [
  { id: 'jewelry', label: t('مجوهرات', 'Bijoux', 'Jewelry'), accent: 'from-amber-400/30 to-yellow-700/10', subBranches: [{ id: 'rings', label: t('خواتم', 'Bagues', 'Rings') }, { id: 'necklaces', label: t('قلائد', 'Colliers', 'Necklaces') }] },
  { id: 'fashion', label: t('أزياء', 'Mode', 'Fashion'), accent: 'from-fuchsia-500/25 to-purple-700/10', subBranches: [{ id: 'streetwear', label: t('ملابس عصرية', 'Streetwear', 'Streetwear') }, { id: 'formal', label: t('رسمي', 'Formel', 'Formal') }] },
  { id: 'beauty', label: t('جمال', 'Beauté', 'Beauty'), accent: 'from-rose-400/25 to-pink-700/10', subBranches: [{ id: 'skincare', label: t('العناية بالبشرة', 'Soin', 'Skincare') }, { id: 'makeup', label: t('مكياج', 'Maquillage', 'Makeup') }] },
  { id: 'electronics', label: t('إلكترونيات', 'Électronique', 'Electronics'), accent: 'from-cyan-400/25 to-blue-700/10', subBranches: [{ id: 'gadgets', label: t('أجهزة', 'Gadgets', 'Gadgets') }, { id: 'audio', label: t('صوتيات', 'Audio', 'Audio') }] },
  { id: 'home', label: t('المنزل', 'Maison', 'Home'), accent: 'from-emerald-400/25 to-teal-700/10', subBranches: [{ id: 'decor', label: t('ديكور', 'Déco', 'Decor') }, { id: 'kitchen', label: t('مطبخ', 'Cuisine', 'Kitchen') }] },
  { id: 'fitness', label: t('لياقة', 'Fitness', 'Fitness'), accent: 'from-orange-400/25 to-red-700/10', subBranches: [{ id: 'gear', label: t('معدات', 'Équipement', 'Gear') }, { id: 'supplements', label: t('مكملات', 'Compléments', 'Supplements') }] },
  { id: 'food', label: t('طعام', 'Alimentaire', 'Food'), accent: 'from-lime-400/25 to-green-700/10', subBranches: [{ id: 'restaurant', label: t('مطاعم', 'Restaurant', 'Restaurant') }, { id: 'packaged', label: t('معلبات', 'Emballé', 'Packaged') }] },
  { id: 'universal', label: t('عام', 'Universel', 'Universal'), accent: 'from-indigo-400/25 to-violet-700/10', subBranches: [{ id: 'ugc', label: t('محتوى المستخدم', 'UGC', 'UGC') }, { id: 'testimonial', label: t('شهادات', 'Témoignage', 'Testimonial') }] },
];

export const SEED_TEMPLATES: ReadyTemplate[] = [
  { id: 'jewelry-rings-luxury', categoryId: 'jewelry', subBranchId: 'rings', title: t('كشف فاخر', 'Révélation luxe', 'Luxury Reveal'), description: t('لقطات ماكرو أنيقة وإيقاع راقٍ للخواتم.', 'Macro élégant et rythme premium.', 'Elegant macro shots and premium pacing.'), aspectRatio: '9:16', accent: 'from-amber-400/30 to-yellow-700/10', actorLocales: ['ar', 'fr'], isTwoPerson: false, durationSeconds: 18, previewVideoUrl: '', posterUrl: '', visual: visual('💍', 'from-amber-200 via-yellow-300 to-stone-900', ['Hook', 'Macro', 'Offer']), scenario: scenario('Luxury close-up hook', ['Product reveal', 'Premium detail', 'Offer + CTA'], 'Shop now') },
  { id: 'jewelry-necklace-story', categoryId: 'jewelry', subBranchId: 'necklaces', title: t('حكاية قلادة', 'Histoire de collier', 'Necklace Story'), description: t('سرد عاطفي يُبرز التفاصيل.', 'Récit émotionnel qui met en valeur les détails.', 'An emotional narrative that highlights detail.'), aspectRatio: '9:16', accent: 'from-amber-400/30 to-yellow-700/10', actorLocales: ['ar', 'fr', 'en'], isTwoPerson: false, durationSeconds: 22, previewVideoUrl: '', posterUrl: '', visual: visual('✨', 'from-yellow-100 via-amber-300 to-neutral-950', ['Story', 'Detail', 'Gift']), scenario: scenario('Emotional gift moment', ['Lifestyle scene', 'Necklace detail', 'Gift CTA'], 'Make it memorable') },
  { id: 'fashion-streetwear-drop', categoryId: 'fashion', subBranchId: 'streetwear', title: t('إطلاق مجموعة', 'Nouvelle collection', 'New Collection Drop'), description: t('قطعات تحريرية سريعة لإطلاق منتج.', 'Montage éditorial rapide pour un drop.', 'Fast editorial cuts for a product drop.'), aspectRatio: '9:16', accent: 'from-fuchsia-500/25 to-purple-700/10', actorLocales: ['ar', 'fr', 'en'], isTwoPerson: false, durationSeconds: 20, previewVideoUrl: '', posterUrl: '', visual: visual('👕', 'from-fuchsia-300 via-violet-500 to-slate-950', ['Drop', 'Fit', 'CTA']), scenario: scenario('New drop energy', ['Model movement', 'Product fit', 'Limited drop CTA'], 'Get the look') },
  { id: 'fashion-formal-editorial', categoryId: 'fashion', subBranchId: 'formal', title: t('إطلالة رسمية', 'Ligne formelle', 'Formal Editorial'), description: t('تصوير أنيق بإضاءة ناعمة.', 'Prise de vue élégante à lumière douce.', 'Elegant capture with soft lighting.'), aspectRatio: '1:1', accent: 'from-fuchsia-500/25 to-purple-700/10', actorLocales: ['fr', 'en'], isTwoPerson: false, durationSeconds: 24, previewVideoUrl: '', posterUrl: '', visual: visual('🕴️', 'from-slate-200 via-zinc-500 to-black', ['Style', 'Texture', 'Brand']), scenario: scenario('Elegant wardrobe hook', ['Soft-light product', 'Detail shots', 'Brand CTA'], 'Upgrade your style') },
  { id: 'beauty-skincare-ritual', categoryId: 'beauty', subBranchId: 'skincare', title: t('طقوس العناية', 'Rituel de soin', 'Skincare Ritual'), description: t('ملمس ونتائج وتسلسل أسلوب حياة.', 'Texture, résultats et style de vie.', 'Texture, results, and a lifestyle sequence.'), aspectRatio: '9:16', accent: 'from-rose-400/25 to-pink-700/10', actorLocales: ['ar', 'fr'], isTwoPerson: false, durationSeconds: 21, previewVideoUrl: '', posterUrl: '', visual: visual('🌸', 'from-rose-100 via-pink-300 to-purple-900', ['Texture', 'Glow', 'Routine']), scenario: scenario('Show the glow', ['Texture close-up', 'Usage routine', 'Visible benefit'], 'Start your ritual') },
  { id: 'beauty-makeup-tutorial', categoryId: 'beauty', subBranchId: 'makeup', title: t('درس مكياج', 'Tuto maquillage', 'Makeup Tutorial'), description: t('خطوات واضحة مع لقطات قريبة.', 'Étapes claires avec gros plans.', 'Clear steps with close-up shots.'), aspectRatio: '9:16', accent: 'from-rose-400/25 to-pink-700/10', actorLocales: ['ar', 'fr', 'en'], isTwoPerson: false, durationSeconds: 28, previewVideoUrl: '', posterUrl: '', visual: visual('💄', 'from-pink-200 via-rose-400 to-red-950', ['Step 1', 'Apply', 'Result']), scenario: scenario('Easy beauty result', ['Before look', 'Application steps', 'Final result'], 'Try the look') },
  { id: 'electronics-gadget-demo', categoryId: 'electronics', subBranchId: 'gadgets', title: t('عرض الميزات', 'Démo produit', 'Feature Demo'), description: t('فوائد واضحة مع حركة عصرية.', 'Avantages clairs avec mouvement moderne.', 'Clear benefits with modern product motion.'), aspectRatio: '16:9', accent: 'from-cyan-400/25 to-blue-700/10', actorLocales: ['ar', 'en'], isTwoPerson: false, durationSeconds: 25, previewVideoUrl: '', posterUrl: '', visual: visual('📱', 'from-cyan-200 via-blue-500 to-slate-950', ['Problem', 'Feature', 'Proof']), scenario: scenario('Feature-first hook', ['Problem setup', 'Feature demo', 'Benefit proof'], 'Upgrade today') },
  { id: 'electronics-audio-unbox', categoryId: 'electronics', subBranchId: 'audio', title: t('فتح العلبة', 'Unboxing audio', 'Audio Unboxing'), description: t('تجربة فتح حسية للمنتج.', 'Expérience de déballage sensorielle.', 'A sensory unboxing experience.'), aspectRatio: '9:16', accent: 'from-cyan-400/25 to-blue-700/10', actorLocales: ['fr', 'en'], isTwoPerson: false, durationSeconds: 19, previewVideoUrl: '', posterUrl: '', visual: visual('🎧', 'from-sky-200 via-indigo-500 to-black', ['Unbox', 'Sound', 'Feel']), scenario: scenario('Unbox the sound', ['Box reveal', 'Product detail', 'Sound benefit'], 'Hear the difference') },
  { id: 'home-decor-transform', categoryId: 'home', subBranchId: 'decor', title: t('تحويل المساحة', 'Transformation déco', 'Space Upgrade'), description: t('قبل وبعد لتحويل المنزل.', 'Avant / après de transformation.', 'Before-and-after home transformation.'), aspectRatio: '9:16', accent: 'from-emerald-400/25 to-teal-700/10', actorLocales: ['ar', 'fr'], isTwoPerson: false, durationSeconds: 23, previewVideoUrl: '', posterUrl: '', visual: visual('🏠', 'from-emerald-100 via-teal-400 to-slate-900', ['Before', 'Place', 'After']), scenario: scenario('Instant home upgrade', ['Before room', 'Product placement', 'After reveal'], 'Transform your space') },
  { id: 'home-kitchen-hack', categoryId: 'home', subBranchId: 'kitchen', title: t('حيلة مطبخ', 'Astuce cuisine', 'Kitchen Hack'), description: t('حل سريع يومي للمطبخ.', 'Solution rapide du quotidien.', 'A quick everyday kitchen solution.'), aspectRatio: '9:16', accent: 'from-emerald-400/25 to-teal-700/10', actorLocales: ['ar', 'fr', 'en'], isTwoPerson: false, durationSeconds: 17, previewVideoUrl: '', posterUrl: '', visual: visual('🍳', 'from-lime-100 via-emerald-400 to-neutral-950', ['Problem', 'Hack', 'Save time']), scenario: scenario('Kitchen problem hook', ['Daily frustration', 'Product solution', 'Time saved'], 'Make cooking easier') },
  { id: 'fitness-gear-performance', categoryId: 'fitness', subBranchId: 'gear', title: t('طاقة الأداء', 'Énergie performance', 'Performance Energy'), description: t('حركة ديناميكية وسرد محفّز.', 'Action dynamique et récit motivant.', 'Dynamic action and benefit-led storytelling.'), aspectRatio: '9:16', accent: 'from-orange-400/25 to-red-700/10', actorLocales: ['ar', 'en'], isTwoPerson: false, durationSeconds: 20, previewVideoUrl: '', posterUrl: '', visual: visual('🏋️', 'from-orange-200 via-red-500 to-black', ['Move', 'Power', 'Result']), scenario: scenario('Performance challenge', ['Action shot', 'Product benefit', 'Result CTA'], 'Train stronger') },
  { id: 'fitness-supplement-energy', categoryId: 'fitness', subBranchId: 'supplements', title: t('دفعة طاقة', 'Boost énergie', 'Energy Boost'), description: t('فوائد المكمل بأسلوب واضح.', 'Avantages du complément clairement.', 'Supplement benefits, clearly framed.'), aspectRatio: '9:16', accent: 'from-orange-400/25 to-red-700/10', actorLocales: ['fr', 'en'], isTwoPerson: false, durationSeconds: 16, previewVideoUrl: '', posterUrl: '', visual: visual('⚡', 'from-yellow-200 via-orange-500 to-red-950', ['Need', 'Boost', 'Go']), scenario: scenario('Need more energy?', ['Daily need', 'Supplement moment', 'Active result'], 'Fuel your day') },
  { id: 'food-restaurant-sensory', categoryId: 'food', subBranchId: 'restaurant', title: t('لقطة حسية', 'Gros plan sensoriel', 'Sensory Close-up'), description: t('مرئيات تفتح الشهية وتفاصيل غنية.', 'Visuels appétissants et détails riches.', 'Appetite-led visuals and rich detail.'), aspectRatio: '9:16', accent: 'from-lime-400/25 to-green-700/10', actorLocales: ['ar', 'fr'], isTwoPerson: false, durationSeconds: 18, previewVideoUrl: '', posterUrl: '', visual: visual('🍔', 'from-lime-100 via-green-400 to-amber-950', ['Close-up', 'Taste', 'Order']), scenario: scenario('Craving hook', ['Food close-up', 'Texture detail', 'Order CTA'], 'Order now') },
  { id: 'food-packaged-review', categoryId: 'food', subBranchId: 'packaged', title: t('مراجعة حوارية', 'Revue à deux', 'Two-person Review'), description: t('حوار بين شخصين حول المنتج.', 'Dialogue à deux autour du produit.', 'A two-person dialogue about the product.'), aspectRatio: '9:16', accent: 'from-lime-400/25 to-green-700/10', actorLocales: ['ar', 'fr', 'en'], isTwoPerson: true, durationSeconds: 26, previewVideoUrl: '', posterUrl: '', visual: visual('🥤', 'from-green-100 via-lime-400 to-slate-950', ['Taste?', 'Review', 'Buy']), scenario: scenario('Friend recommendation', ['Question', 'Taste reaction', 'Recommendation'], 'Try it today') },
  { id: 'universal-ugc-problem-solution', categoryId: 'universal', subBranchId: 'ugc', title: t('مشكلة – حل (UGC)', 'Problème–solution (UGC)', 'UGC Problem–Solution'), description: t('بنية استجابة مباشرة مرنة.', 'Structure directe et flexible.', 'A flexible direct-response structure.'), aspectRatio: '9:16', accent: 'from-indigo-400/25 to-violet-700/10', actorLocales: ['ar', 'fr', 'en'], isTwoPerson: false, durationSeconds: 22, previewVideoUrl: '', posterUrl: '', visual: visual('🎬', 'from-indigo-200 via-violet-500 to-black', ['Problem', 'Solution', 'CTA']), scenario: scenario('Stop struggling with this', ['Problem pain', 'Product solution', 'Social proof'], 'Get yours now') },
  { id: 'universal-testimonial-dialogue', categoryId: 'universal', subBranchId: 'testimonial', title: t('شهادة حوارية', 'Témoignage dialogué', 'Dialogue Testimonial'), description: t('شهادة بين شخصين تبني الثقة.', 'Témoignage à deux qui inspire confiance.', 'A two-person testimonial that builds trust.'), aspectRatio: '9:16', accent: 'from-indigo-400/25 to-violet-700/10', actorLocales: ['ar', 'fr', 'en'], isTwoPerson: true, durationSeconds: 24, previewVideoUrl: '', posterUrl: '', visual: visual('👥', 'from-violet-200 via-indigo-500 to-slate-950', ['Ask', 'Answer', 'Trust']), scenario: scenario('Real conversation hook', ['Customer question', 'Product answer', 'Trust CTA'], 'Join happy customers') },
];

export function listCategories(categories: TemplateCategory[] = TEMPLATE_CATEGORIES): TemplateCategory[] { return categories; }
export function findCategory(categoryId: TemplateCategoryId, categories: TemplateCategory[] = TEMPLATE_CATEGORIES): TemplateCategory | undefined { return categories.find((category) => category.id === categoryId); }
export function listSubBranches(categoryId: TemplateCategoryId, categories: TemplateCategory[] = TEMPLATE_CATEGORIES): TemplateSubBranch[] { return findCategory(categoryId, categories)?.subBranches ?? []; }
export interface TemplateFilter { categoryId?: TemplateCategoryId | 'all'; subBranchId?: string | 'all'; query?: string; locale?: AgentLocale }
export function filterTemplates(templates: ReadyTemplate[] = SEED_TEMPLATES, filter: TemplateFilter = {}): ReadyTemplate[] {
  const categoryId = filter.categoryId ?? 'all';
  const subBranchId = filter.subBranchId ?? 'all';
  const locale = filter.locale ?? 'en';
  const query = (filter.query ?? '').trim().toLowerCase();
  return templates.filter((template) => {
    if (categoryId !== 'all' && template.categoryId !== categoryId) return false;
    if (subBranchId !== 'all' && template.subBranchId !== subBranchId) return false;
    if (!query) return true;
    const haystack = [template.id, pickText(template.title, locale), pickText(template.description, locale), template.title.ar, template.title.fr, template.title.en, template.scenario.scenes.map((scene) => pickText(scene, locale)).join(' ')].join(' ').toLowerCase();
    return haystack.includes(query);
  });
}
export function groupByCategory(templates: ReadyTemplate[] = SEED_TEMPLATES): Map<TemplateCategoryId, ReadyTemplate[]> {
  const grouped = new Map<TemplateCategoryId, ReadyTemplate[]>();
  for (const template of templates) { const bucket = grouped.get(template.categoryId) ?? []; bucket.push(template); grouped.set(template.categoryId, bucket); }
  return grouped;
}
export function countByCategory(templates: ReadyTemplate[] = SEED_TEMPLATES): Record<string, number> {
  const counts: Record<string, number> = {}; for (const template of templates) counts[template.categoryId] = (counts[template.categoryId] ?? 0) + 1; return counts;
}
