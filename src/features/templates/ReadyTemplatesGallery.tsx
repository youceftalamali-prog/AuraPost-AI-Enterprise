import { useMemo, useState, useRef, type ComponentType } from 'react';
import {
  Boxes,
  Dumbbell,
  Film,
  Gem,
  Globe2,
  Home as HomeIcon,
  Megaphone,
  Play,
  Search,
  Shirt,
  Sparkles,
  Users,
  Utensils,
} from 'lucide-react';
import type { AgentLocale } from '../agent-shell/types';
import {
  TEMPLATE_CATEGORIES,
  SEED_TEMPLATES,
  filterTemplates,
  listSubBranches,
  countByCategory,
  pickText,
  type ReadyTemplate,
  type TemplateCategory,
  type TemplateCategoryId,
} from './templateCatalog';

interface Props {
  locale: AgentLocale;
  templates?: ReadyTemplate[];
  categories?: TemplateCategory[];
  selectedTemplateId?: string;
  onSelect?: (template: ReadyTemplate) => void;
  onStartPromo?: () => void;
}

const copy = {
  ar: {
    title: 'القوالب الجاهزة',
    subtitle: 'تصفّح القوالب حسب نوع المنتج ثم الفئة الفرعية، ومرّر فوق أي قالب لمعاينة الفيديو.',
    search: 'ابحث عن قالب…',
    all: 'الكل',
    use: 'استخدم هذا القالب',
    selected: 'مختار',
    actors: 'أفتار متعدد اللغات',
    two: 'حوار شخصين',
    noResults: 'لا توجد قوالب مطابقة.',
    preview: 'المعاينة قريبًا',
    promoTitle: 'وضع البرو (بدون قالب)',
    promoBody: 'يولّد Aura فيديوًا ترويجيًا حرًا دون قالب — صِف فكرتك وسيقود الوكيل الإنتاج.',
    promoCta: 'ابدأ برو حر',
  },
  fr: {
    title: 'Modèles prêts',
    subtitle: 'Parcourez par type de produit puis sous-catégorie, et survolez un modèle pour prévisualiser la vidéo.',
    search: 'Rechercher un modèle…',
    all: 'Tout',
    use: 'Utiliser ce modèle',
    selected: 'Sélectionné',
    actors: 'Avatars multilingues',
    two: 'Dialogue à deux',
    noResults: 'Aucun modèle correspondant.',
    preview: 'Aperçu bientôt',
    promoTitle: 'Mode Promo (sans modèle)',
    promoBody: 'Aura génère une vidéo promo libre sans modèle — décrivez votre idée et l’agent pilote la production.',
    promoCta: 'Démarrer une promo',
  },
  en: {
    title: 'Ready Templates',
    subtitle: 'Browse by product type then sub-branch, and hover any template to preview the video.',
    search: 'Search a template…',
    all: 'All',
    use: 'Use this template',
    selected: 'Selected',
    actors: 'Multilingual avatars',
    two: 'Two-person dialogue',
    noResults: 'No matching templates.',
    preview: 'Preview coming soon',
    promoTitle: 'Promo mode (template-free)',
    promoBody: 'Aura generates a free promo video without a template — describe your idea and the agent drives production.',
    promoCta: 'Start a free promo',
  },
} satisfies Record<AgentLocale, Record<string, string>>;

const categoryIcons: Record<TemplateCategoryId, ComponentType<{ className?: string }>> = {
  jewelry: Gem,
  fashion: Shirt,
  beauty: Sparkles,
  electronics: Boxes,
  home: HomeIcon,
  fitness: Dumbbell,
  food: Utensils,
  universal: Megaphone,
};

function TemplateCard({
  template,
  locale,
  active,
  labels,
  onSelect,
}: {
  template: ReadyTemplate;
  locale: AgentLocale;
  active: boolean;
  labels: (typeof copy)['en'];
  onSelect?: (template: ReadyTemplate) => void;
}) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const play = () => {
    const video = videoRef.current;
    if (video && template.previewVideoUrl) void video.play().catch(() => undefined);
  };
  const stop = () => {
    const video = videoRef.current;
    if (video) {
      video.pause();
      try {
        video.currentTime = 0;
      } catch {
        /* ignore reset errors */
      }
    }
  };
  return (
    <article
      onMouseEnter={play}
      onMouseLeave={stop}
      className={`group overflow-hidden rounded-3xl border bg-[#11131d] transition ${
        active ? 'border-emerald-400/60 ring-2 ring-emerald-400/20' : 'border-white/10 hover:border-indigo-400/40'
      }`}
    >
      <div className="flex justify-center bg-black/40 p-4">
        {/* iPhone-style mockup frame */}
        <div className="relative aspect-[9/16] w-full max-w-[190px] overflow-hidden rounded-[2rem] border-[6px] border-black bg-black shadow-2xl">
          <div className="absolute left-1/2 top-0 z-10 h-5 w-20 -translate-x-1/2 rounded-b-2xl bg-black" />
          {template.previewVideoUrl ? (
            <video
              ref={videoRef}
              src={template.previewVideoUrl}
              poster={template.posterUrl || undefined}
              muted
              loop
              playsInline
              preload="metadata"
              onFocus={play}
              onBlur={stop}
              className="absolute inset-0 h-full w-full object-cover"
            />
          ) : (
            <div className={`absolute inset-0 flex flex-col items-center justify-center gap-2 bg-gradient-to-br ${template.accent}`}>
              <span className="rounded-full border border-white/20 bg-black/30 p-3 transition group-hover:scale-110">
                <Play className="h-5 w-5 text-white" />
              </span>
              <span className="px-3 text-center text-[10px] text-white/70">{labels.preview}</span>
            </div>
          )}
          <span className="absolute bottom-2 left-1/2 -translate-x-1/2 rounded-full bg-black/50 px-2 py-0.5 text-[9px] text-white/80">
            {template.aspectRatio} · {template.durationSeconds}s
          </span>
        </div>
      </div>
      <div className="space-y-2 p-4">
        <h3 className="font-semibold text-white">{pickText(template.title, locale)}</h3>
        <p className="line-clamp-2 text-xs leading-5 text-slate-400">{pickText(template.description, locale)}</p>
        <div className="flex flex-wrap items-center gap-2 pt-1 text-[10px] text-slate-400">
          <span className="inline-flex items-center gap-1 rounded-full border border-white/10 px-2 py-0.5">
            <Globe2 className="h-3 w-3 text-indigo-300" />
            {template.actorLocales.map((code) => code.toUpperCase()).join(' · ')}
          </span>
          {template.isTwoPerson && (
            <span className="inline-flex items-center gap-1 rounded-full border border-violet-400/20 bg-violet-400/10 px-2 py-0.5 text-violet-200">
              <Users className="h-3 w-3" />
              {labels.two}
            </span>
          )}
        </div>
        <button
          type="button"
          onClick={() => onSelect?.(template)}
          className={`mt-2 w-full rounded-xl px-3 py-2 text-xs font-semibold transition ${
            active
              ? 'bg-emerald-500 text-white'
              : 'bg-gradient-to-r from-indigo-500 to-emerald-500 text-white hover:brightness-110'
          }`}
        >
          {active ? labels.selected : labels.use}
        </button>
      </div>
    </article>
  );
}

export default function ReadyTemplatesGallery({
  locale,
  templates = SEED_TEMPLATES,
  categories = TEMPLATE_CATEGORIES,
  selectedTemplateId,
  onSelect,
  onStartPromo,
}: Props) {
  const t = copy[locale];
  const rtl = locale === 'ar';
  const [activeCategory, setActiveCategory] = useState<TemplateCategoryId | 'all'>('all');
  const [activeSub, setActiveSub] = useState<string | 'all'>('all');
  const [query, setQuery] = useState('');

  const counts = useMemo(() => countByCategory(templates), [templates]);
  const subBranches = useMemo(
    () => (activeCategory === 'all' ? [] : listSubBranches(activeCategory, categories)),
    [activeCategory, categories],
  );
  const filtered = useMemo(
    () => filterTemplates(templates, { categoryId: activeCategory, subBranchId: activeSub, query, locale }),
    [templates, activeCategory, activeSub, query, locale],
  );

  const selectCategory = (categoryId: TemplateCategoryId | 'all') => {
    setActiveCategory(categoryId);
    setActiveSub('all');
  };

  return (
    <div dir={rtl ? 'rtl' : 'ltr'} className="space-y-6">
      <div className="flex flex-col gap-4 rounded-3xl border border-indigo-400/20 bg-gradient-to-br from-indigo-500/10 via-[#11131d] to-emerald-500/10 p-6 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex items-start gap-3">
          <span className="rounded-xl bg-indigo-500/15 p-3">
            <Film className="h-6 w-6 text-indigo-300" />
          </span>
          <div>
            <h2 className="text-2xl font-bold text-white">{t.title}</h2>
            <p className="mt-1 max-w-2xl text-sm text-slate-400">{t.subtitle}</p>
          </div>
        </div>
        <label className="relative w-full max-w-xs">
          <Search className="absolute top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500 ltr:left-3 rtl:right-3" />
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder={t.search}
            className="w-full rounded-xl border border-white/10 bg-slate-950 py-2.5 text-sm text-white outline-none ltr:pl-9 ltr:pr-3 rtl:pr-9 rtl:pl-3"
          />
        </label>
      </div>

      {onStartPromo && (
        <div className="flex flex-col gap-3 rounded-2xl border border-amber-400/20 bg-amber-400/5 p-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-start gap-3">
            <Sparkles className="mt-0.5 h-5 w-5 shrink-0 text-amber-300" />
            <div>
              <p className="text-sm font-semibold text-amber-100">{t.promoTitle}</p>
              <p className="mt-1 text-xs text-amber-200/80">{t.promoBody}</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onStartPromo}
            className="shrink-0 rounded-xl border border-amber-400/40 bg-amber-400/10 px-4 py-2 text-xs font-semibold text-amber-100 transition hover:bg-amber-400/20"
          >
            {t.promoCta}
          </button>
        </div>
      )}

      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => selectCategory('all')}
          className={`rounded-full border px-4 py-2 text-xs font-medium transition ${
            activeCategory === 'all'
              ? 'border-indigo-400/60 bg-indigo-400/10 text-white'
              : 'border-white/10 text-slate-300 hover:border-indigo-400/40'
          }`}
        >
          {t.all} · {templates.length}
        </button>
        {categories.map((category) => {
          const Icon = categoryIcons[category.id] ?? Sparkles;
          const active = activeCategory === category.id;
          return (
            <button
              key={category.id}
              type="button"
              onClick={() => selectCategory(category.id)}
              className={`inline-flex items-center gap-2 rounded-full border px-4 py-2 text-xs font-medium transition ${
                active
                  ? 'border-indigo-400/60 bg-indigo-400/10 text-white'
                  : 'border-white/10 text-slate-300 hover:border-indigo-400/40'
              }`}
            >
              <Icon className="h-3.5 w-3.5 text-indigo-300" />
              {pickText(category.label, locale)}
              <span className="text-slate-500">{counts[category.id] ?? 0}</span>
            </button>
          );
        })}
      </div>

      {subBranches.length > 0 && (
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => setActiveSub('all')}
            className={`rounded-lg border px-3 py-1.5 text-[11px] transition ${
              activeSub === 'all'
                ? 'border-emerald-400/50 bg-emerald-400/10 text-emerald-100'
                : 'border-white/10 text-slate-400 hover:border-emerald-400/30'
            }`}
          >
            {t.all}
          </button>
          {subBranches.map((sub) => {
            const active = activeSub === sub.id;
            return (
              <button
                key={sub.id}
                type="button"
                onClick={() => setActiveSub(sub.id)}
                className={`rounded-lg border px-3 py-1.5 text-[11px] transition ${
                  active
                    ? 'border-emerald-400/50 bg-emerald-400/10 text-emerald-100'
                    : 'border-white/10 text-slate-400 hover:border-emerald-400/30'
                }`}
              >
                {pickText(sub.label, locale)}
              </button>
            );
          })}
        </div>
      )}

      {filtered.length === 0 ? (
        <p className="rounded-2xl border border-dashed border-white/10 p-10 text-center text-sm text-slate-500">{t.noResults}</p>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {filtered.map((template) => (
            <TemplateCard
              key={template.id}
              template={template}
              locale={locale}
              active={selectedTemplateId === template.id}
              labels={t}
              onSelect={onSelect}
            />
          ))}
        </div>
      )}
    </div>
  );
}
