import { useState, type ComponentType, type FormEvent } from 'react';
import {
  ArrowUpRight,
  Boxes,
  FileText,
  Gem,
  Image as ImageIcon,
  Link2,
  PackageSearch,
  Shirt,
  Sparkles,
  Upload,
  Video,
  WandSparkles,
} from 'lucide-react';
import type {
  AgentLocale,
  AgentSourceMode,
  AgentTemplate,
} from './types';

interface AgentHomeProps {
  locale: AgentLocale;
  selectedTemplate: AgentTemplate | null;
  onSelectTemplate: (template: AgentTemplate) => void;
  onStart: (mode: AgentSourceMode, prompt: string) => void;
}

const copy = {
  ar: {
    eyebrow: 'وكيل Aura الذكي',
    title: 'حوّل منتجك إلى حملة تسويقية كاملة',
    description: 'أرسل رابطاً أو صورة أو وصفاً. سيقودك الوكيل عبر الاستيراد والتحليل وصناعة الصور والفيديو، دون التنقل بين أقسام معقدة.',
    placeholder: 'مثال: أنشئ إعلان فيديو فاخر لهذا المنتج يستهدف السوق الفرنسي…',
    run: 'ابدأ مع Aura',
    sourceTitle: 'كيف تريد أن تبدأ؟',
    url: 'رابط المنتج',
    image: 'صورة المنتج',
    saved: 'منتج محفوظ',
    descriptionMode: 'وصف مكتوب',
    templates: 'قوالب جاهزة حسب مجال المنتج',
    templatesHint: 'اختر قالباً، ثم أرسل المصدر إلى الوكيل ليكمل العمل.',
    selected: 'القالب المختار',
  },
  fr: {
    eyebrow: 'Agent intelligent Aura',
    title: 'Transformez votre produit en campagne complète',
    description: "Envoyez un lien, une image ou une description. L’agent orchestre l’import, l’analyse et la création d’images et de vidéos.",
    placeholder: 'Exemple : crée une vidéo premium pour ce produit destinée au marché français…',
    run: 'Démarrer avec Aura',
    sourceTitle: 'Comment souhaitez-vous commencer ?',
    url: 'Lien produit',
    image: 'Image produit',
    saved: 'Produit enregistré',
    descriptionMode: 'Description',
    templates: 'Modèles par catégorie',
    templatesHint: 'Choisissez un modèle, puis fournissez la source à l’agent.',
    selected: 'Modèle sélectionné',
  },
  en: {
    eyebrow: 'Aura intelligent agent',
    title: 'Turn one product into a complete campaign',
    description: 'Send a link, image, or description. The agent orchestrates import, analysis, image creation, and video creation without complex module navigation.',
    placeholder: 'Example: create a premium product video for the French market…',
    run: 'Start with Aura',
    sourceTitle: 'How would you like to start?',
    url: 'Product URL',
    image: 'Product image',
    saved: 'Saved product',
    descriptionMode: 'Description',
    templates: 'Templates by product category',
    templatesHint: 'Choose a template, then give the product source to the agent.',
    selected: 'Selected template',
  },
} satisfies Record<AgentLocale, Record<string, string>>;

const templates: AgentTemplate[] = [
  { id: 'jewelry-luxury', category: 'Jewelry', title: 'Luxury Reveal', description: 'Elegant macro shots and premium pacing.', accent: 'from-amber-400/30 to-yellow-700/10' },
  { id: 'fashion-drop', category: 'Fashion', title: 'New Collection', description: 'Fast editorial cuts for a product drop.', accent: 'from-fuchsia-500/25 to-purple-700/10' },
  { id: 'beauty-routine', category: 'Beauty', title: 'Beauty Ritual', description: 'Texture, results, and lifestyle sequence.', accent: 'from-rose-400/25 to-pink-700/10' },
  { id: 'electronics-demo', category: 'Electronics', title: 'Feature Demo', description: 'Clear benefits with modern product motion.', accent: 'from-cyan-400/25 to-blue-700/10' },
  { id: 'home-transformation', category: 'Home', title: 'Space Upgrade', description: 'Before-and-after home transformation.', accent: 'from-emerald-400/25 to-teal-700/10' },
  { id: 'fitness-energy', category: 'Fitness', title: 'Performance Energy', description: 'Dynamic action and benefit-led storytelling.', accent: 'from-orange-400/25 to-red-700/10' },
  { id: 'food-sensory', category: 'Food', title: 'Sensory Close-up', description: 'Appetite-led visuals and rich detail.', accent: 'from-lime-400/25 to-green-700/10' },
  { id: 'universal-ugc', category: 'Universal', title: 'UGC Problem–Solution', description: 'A flexible direct-response structure.', accent: 'from-indigo-400/25 to-violet-700/10' },
];

const sourceOptions: Array<{
  mode: AgentSourceMode;
  icon: ComponentType<{ className?: string }>;
  labelKey: 'url' | 'image' | 'saved' | 'descriptionMode';
}> = [
  { mode: 'url', icon: Link2, labelKey: 'url' },
  { mode: 'image', icon: Upload, labelKey: 'image' },
  { mode: 'saved_product', icon: PackageSearch, labelKey: 'saved' },
  { mode: 'description', icon: FileText, labelKey: 'descriptionMode' },
];

const categoryIcons: Record<string, ComponentType<{ className?: string }>> = {
  Jewelry: Gem,
  Fashion: Shirt,
  Beauty: Sparkles,
  Electronics: Boxes,
  Home: WandSparkles,
  Fitness: Video,
  Food: ImageIcon,
  Universal: ArrowUpRight,
};

export function AgentHome({
  locale,
  selectedTemplate,
  onSelectTemplate,
  onStart,
}: AgentHomeProps) {
  const [prompt, setPrompt] = useState('');
  const text = copy[locale];
  const isRtl = locale === 'ar';

  const submitPrompt = (event: FormEvent) => {
    event.preventDefault();
    const trimmed = prompt.trim();
    if (!trimmed) return;
    onStart(selectedTemplate ? 'template' : 'description', trimmed);
  };

  return (
    <div dir={isRtl ? 'rtl' : 'ltr'} className="space-y-10">
      <section className="relative overflow-hidden rounded-[28px] border border-indigo-400/20 bg-[#11131d] px-5 py-8 shadow-2xl sm:px-8 lg:px-12 lg:py-12">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(99,102,241,0.2),transparent_35%),radial-gradient(circle_at_bottom_right,rgba(16,185,129,0.12),transparent_30%)]" />
        <div className="relative mx-auto max-w-4xl text-center">
          <span className="inline-flex items-center gap-2 rounded-full border border-indigo-400/20 bg-indigo-400/10 px-3 py-1 text-xs font-semibold text-indigo-200">
            <Sparkles className="h-3.5 w-3.5" />
            {text.eyebrow}
          </span>
          <h1 className="mt-5 text-3xl font-bold tracking-tight text-white sm:text-5xl">
            {text.title}
          </h1>
          <p className="mx-auto mt-4 max-w-2xl text-sm leading-7 text-slate-300 sm:text-base">
            {text.description}
          </p>

          {selectedTemplate && (
            <div className="mx-auto mt-5 inline-flex items-center gap-2 rounded-xl border border-emerald-400/20 bg-emerald-400/10 px-3 py-2 text-xs text-emerald-200">
              <span>{text.selected}:</span>
              <strong>{selectedTemplate.category} · {selectedTemplate.title}</strong>
            </div>
          )}

          <form onSubmit={submitPrompt} className="mx-auto mt-7 flex max-w-3xl flex-col gap-3 rounded-2xl border border-white/10 bg-black/20 p-3 shadow-xl sm:flex-row">
            <textarea
              value={prompt}
              onChange={(event) => setPrompt(event.target.value)}
              placeholder={text.placeholder}
              rows={2}
              className="min-h-16 flex-1 resize-none bg-transparent px-3 py-2 text-sm text-white outline-none placeholder:text-slate-500"
            />
            <button type="submit" className="inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-indigo-500 to-emerald-500 px-5 py-3 text-sm font-semibold text-white transition hover:brightness-110">
              <WandSparkles className="h-4 w-4" />
              {text.run}
            </button>
          </form>

          <div className="mt-7">
            <p className="mb-3 text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">{text.sourceTitle}</p>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              {sourceOptions.map(({ mode, icon: Icon, labelKey }) => (
                <button
                  key={mode}
                  type="button"
                  onClick={() => onStart(mode, prompt.trim())}
                  className="group flex items-center justify-center gap-2 rounded-xl border border-white/10 bg-white/[0.03] px-3 py-3 text-xs font-medium text-slate-300 transition hover:border-indigo-400/40 hover:bg-indigo-400/10 hover:text-white"
                >
                  <Icon className="h-4 w-4 text-indigo-300 transition group-hover:text-emerald-300" />
                  {text[labelKey]}
                </button>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section>
        <div className="mb-5 flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h2 className="text-xl font-semibold text-white">{text.templates}</h2>
            <p className="mt-1 text-sm text-slate-400">{text.templatesHint}</p>
          </div>
        </div>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {templates.map((template) => {
            const Icon = categoryIcons[template.category] || Sparkles;
            const active = selectedTemplate?.id === template.id;
            return (
              <button
                key={template.id}
                type="button"
                onClick={() => onSelectTemplate(template)}
                className={`overflow-hidden rounded-2xl border text-left transition ${active ? 'border-emerald-400/60 ring-2 ring-emerald-400/20' : 'border-white/10 hover:border-indigo-400/40'}`}
              >
                <div className={`h-24 bg-gradient-to-br ${template.accent} p-4`}>
                  <Icon className="h-6 w-6 text-white" />
                </div>
                <div className="bg-[#11131d] p-4">
                  <span className="text-[10px] font-semibold uppercase tracking-[0.18em] text-indigo-300">{template.category}</span>
                  <h3 className="mt-1 font-semibold text-white">{template.title}</h3>
                  <p className="mt-1 text-xs leading-5 text-slate-400">{template.description}</p>
                </div>
              </button>
            );
          })}
        </div>
      </section>
    </div>
  );
}
