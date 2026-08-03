import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { SectionHead, Icon, Modal, Empty, useReveal } from '../shared';
import { useStudio } from '../StudioShell';
import { useDebounce } from '../../../hooks/useDebounce';
import { templateApi } from '../../../services/templateApi';
import { formatMoney } from '../../../lib/formatters';
import type { VideoTemplate, TemplateSearchParams, CategoryListResponse } from '../../../types/api';

const SORT_OPTIONS: Array<{ id: TemplateSearchParams['sortBy']; label: string }> = [
  { id: 'popularity', label: 'Most popular' },
  { id: 'estimatedCost', label: 'Cost ↑' },
  { id: 'estimatedDuration', label: 'Duration' },
  { id: 'name', label: 'A → Z' },
];

export const Marketplace: React.FC = () => {
  const { setSection, setDraft, notify } = useStudio();
  const [templates, setTemplates] = useState<VideoTemplate[]>([]);
  const [categories, setCategories] = useState<Array<{ category: string; count: number }>>([]);
  const [favorites, setFavorites] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);

  const [search, setSearch] = useState('');
  const debounced = useDebounce(search, 300);
  const [category, setCategory] = useState<string | null>(null);
  const [platform, setPlatform] = useState<string | null>(null);
  const [sort, setSort] = useState<TemplateSearchParams['sortBy']>('popularity');
  const [favOnly, setFavOnly] = useState(false);
  const [preview, setPreview] = useState<VideoTemplate | null>(null);

  const gridRef = useReveal<HTMLDivElement>();

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [tplRes, catRes, favRes] = await Promise.all([
        debounced || category || platform
          ? templateApi.search({ search: debounced || undefined, category: category || undefined, platform: platform || undefined, sortBy: sort, limit: 120 })
          : templateApi.search({ sortBy: sort, limit: 120 }),
        templateApi.getCategories(),
        templateApi.getFavorites().catch(() => [] as VideoTemplate[]),
      ]);

      const raw: VideoTemplate[] = (tplRes as { items: VideoTemplate[] }).items ?? (tplRes as unknown as VideoTemplate[]);
      setTemplates(raw);
      setCategories((catRes as CategoryListResponse[]) ?? []);
      const favs: VideoTemplate[] = (favRes as VideoTemplate[]) ?? [];
      setFavorites(new Set(favs.map((f) => f.id)));
    } catch {
      notify('Could not load templates', true);
    } finally {
      setLoading(false);
    }
  }, [debounced, category, platform, sort, notify]);

  useEffect(() => {
    void load();
  }, [load]);

  const rows = useMemo(() => {
    if (debounced || category || platform || favOnly) return null;
    const map = new Map<string, VideoTemplate[]>();
    for (const t of templates) {
      const key = t.category || 'General';
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(t);
    }
    return Array.from(map.entries()).slice(0, 10);
  }, [templates, debounced, category, platform, favOnly]);

  const flat = useMemo(() => {
    let list = templates;
    if (favOnly) list = list.filter((t) => favorites.has(t.id));
    return list;
  }, [templates, favOnly, favorites]);

  const toggleFav = async (t: VideoTemplate) => {
    const isFav = favorites.has(t.id);
    try {
      await templateApi.toggleFavorite(t.id);
      setFavorites((prev) => {
        const next = new Set(prev);
        if (isFav) next.delete(t.id);
        else next.add(t.id);
        return next;
      });
    } catch {
      notify('Favorite action failed', true);
    }
  };

  const useTemplate = (t: VideoTemplate) => {
    setDraft({ templateId: t.id, platform: t.platform ?? undefined });
    setSection('generate');
    notify(`Template "${t.name}" loaded into Generation Studio`);
  };

  const Card: React.FC<{ t: VideoTemplate }> = ({ t }) => {
    const isFav = favorites.has(t.id);
    return (
      <div className="frame aspect-[9/13] group panel-hover flex-none w-[168px] md:w-[186px]">
        {t.thumbnailUrl ? (
          <img src={t.thumbnailUrl} alt={t.name} loading="lazy" />
        ) : (
          <div className="w-full h-full flex items-center justify-center" style={{ background: 'linear-gradient(150deg, var(--ink-3), var(--ink-1))' }}>
            <Icon name="layers" size={26} className="opacity-30" />
          </div>
        )}
        <div className="veil" />

        <button
          onClick={(e) => {
            e.stopPropagation();
            void toggleFav(t);
          }}
          className="absolute top-2 right-2 p-1.5 rounded-md transition-all"
          style={{ background: 'rgba(12,15,22,0.7)', color: isFav ? 'var(--coral)' : 'var(--muted)' }}
          title={isFav ? 'Unfavorite' : 'Favorite'}
        >
          <Icon name="heart" size={13} />
        </button>

        <span className="absolute top-2 left-2 chip" style={{ background: 'rgba(12,15,22,0.75)' }}>
          {t.estimatedDuration}s
        </span>

        <div className="absolute bottom-0 inset-x-0 p-3">
          <div className="text-[12.5px] font-semibold leading-tight line-clamp-1">{t.name}</div>
          <div className="flex items-center gap-1.5 mt-1">
            {t.style && (
              <span className="chip" style={{ fontSize: 9.5, padding: '1px 6px' }}>
                {t.style}
              </span>
            )}
            <span className="t-mono text-[10px]" style={{ color: 'var(--amber)' }}>
              {formatMoney(parseFloat(t.estimatedCost))}
            </span>
          </div>
        </div>

        <div
          className="absolute inset-0 flex items-center justify-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity"
          style={{ background: 'rgba(12,15,22,0.45)' }}
        >
          <button className="btn btn-ghost btn-sm" onClick={() => setPreview(t)}>
            <Icon name="eye" size={12} /> Preview
          </button>
          <button className="btn btn-primary btn-sm" onClick={() => useTemplate(t)}>
            <Icon name="zap" size={12} /> Use
          </button>
        </div>
      </div>
    );
  };

  return (
    <div>
      <SectionHead
        kicker="LIBRARY · 03"
        title="Template Marketplace"
        desc="Curated, category-first template library. Strong templates per style — not hundreds of mediocre ones."
      />

      {/* ---------- Filter rail ---------- */}
      <div className="panel p-4 mb-7 flex flex-col lg:flex-row gap-3.5 lg:items-center">
        <div className="relative flex-1 min-w-[220px]">
          <input
            className="field field-mono"
            placeholder="search templates…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <div className="scroll-x no-scrollbar flex gap-1.5 flex-none">
          <button
            className={`chip ${!category ? 'chip-on' : ''}`}
            style={{ padding: '5px 12px', cursor: 'pointer' }}
            onClick={() => setCategory(null)}
          >
            ALL
          </button>
          {categories.slice(0, 12).map((c) => (
            <button
              key={c.category}
              className={`chip ${category === c.category ? 'chip-on' : ''}`}
              style={{ padding: '5px 12px', cursor: 'pointer' }}
              onClick={() => setCategory(category === c.category ? null : c.category)}
            >
              {c.category.toUpperCase()} <span style={{ opacity: 0.6 }}>{c.count}</span>
            </button>
          ))}
        </div>
        <div className="flex gap-2.5 flex-none items-center">
          <select
            className="field field-mono"
            style={{ width: 150, padding: '6px 30px 6px 10px' }}
            value={sort ?? 'popularity'}
            onChange={(e) => setSort(e.target.value as TemplateSearchParams['sortBy'])}
          >
            {SORT_OPTIONS.map((s) => (
              <option key={s.id} value={s.id}>
                {s.label}
              </option>
            ))}
          </select>
          <button
            className={`chip ${favOnly ? 'chip-coral' : ''}`}
            style={{ padding: '6px 12px', cursor: 'pointer' }}
            onClick={() => setFavOnly(!favOnly)}
          >
            <Icon name="heart" size={11} /> FAVORITES
          </button>
        </div>
      </div>

      {loading ? (
        <div className="grid grid-cols-3 md:grid-cols-6 gap-4">
          {Array.from({ length: 12 }).map((_, i) => (
            <div key={i} className="skeleton aspect-[9/13]" />
          ))}
        </div>
      ) : flat.length === 0 ? (
        <Empty icon="layers" title="No templates match" hint="Clear the search or pick another category." />
      ) : rows ? (
        <div className="space-y-8">
          {rows.map(([cat, list]) => (
            <section key={cat}>
              <div className="flex items-center justify-between mb-3">
                <h2 className="t-display font-semibold text-[17px] flex items-center gap-2.5">
                  <span className="inline-block w-1.5 h-4 rounded-sm" style={{ background: 'var(--coral)' }} />
                  {cat}
                </h2>
                <button className="btn btn-ghost btn-sm" onClick={() => setCategory(cat)}>
                  View all {list.length} <Icon name="chevron" size={12} />
                </button>
              </div>
              <div className="scroll-x no-scrollbar flex gap-3.5 pb-1">
                {list.map((t) => (
                  <Card key={t.id} t={t} />
                ))}
              </div>
            </section>
          ))}
        </div>
      ) : (
        <div ref={gridRef} className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-6 gap-3.5">
          {flat.map((t) => (
            <div key={t.id} className="w-full">
              <Card t={t} />
            </div>
          ))}
        </div>
      )}

      {/* ---------- Preview modal ---------- */}
      <Modal open={!!preview} onClose={() => setPreview(null)} width={720}>
        {preview && (
          <div>
            <div className="frame aspect-video scan rounded-b-none border-0">
              {preview.thumbnailUrl ? (
                <img src={preview.thumbnailUrl} alt={preview.name} />
              ) : (
                <div className="w-full h-full flex items-center justify-center" style={{ background: 'var(--ink-3)' }}>
                  <Icon name="play" size={34} className="opacity-40" />
                </div>
              )}
              <div className="veil" />
              <div className="absolute bottom-3 left-4">
                <div className="t-display font-bold text-[20px]">{preview.name}</div>
                <div className="flex gap-2 mt-1.5">
                  <span className="chip">{preview.category}</span>
                  {preview.style && <span className="chip chip-cyan">{preview.style}</span>}
                  {preview.platform && <span className="chip chip-on">{preview.platform}</span>}
                </div>
              </div>
              <button className="absolute top-3 right-3 btn btn-ghost btn-icon" onClick={() => setPreview(null)}>
                <Icon name="x" size={14} />
              </button>
            </div>

            <div className="p-5 space-y-4">
              {preview.description && (
                <p className="text-[13px]" style={{ color: 'var(--muted)' }}>
                  {preview.description}
                </p>
              )}

              <div className="grid grid-cols-3 gap-3">
                <div className="p-3 rounded-lg border text-center" style={{ borderColor: 'var(--line)' }}>
                  <div className="t-mono text-[17px] font-semibold" style={{ color: 'var(--cyan)' }}>
                    {preview.estimatedDuration}s
                  </div>
                  <div className="kicker mt-1">DURATION</div>
                </div>
                <div className="p-3 rounded-lg border text-center" style={{ borderColor: 'var(--line)' }}>
                  <div className="t-mono text-[17px] font-semibold" style={{ color: 'var(--amber)' }}>
                    {formatMoney(parseFloat(preview.estimatedCost))}
                  </div>
                  <div className="kicker mt-1">EST. COST</div>
                </div>
                <div className="p-3 rounded-lg border text-center" style={{ borderColor: 'var(--line)' }}>
                  <div className="t-mono text-[17px] font-semibold" style={{ color: 'var(--mint)' }}>
                    {preview.popularity}
                  </div>
                  <div className="kicker mt-1">POPULARITY</div>
                </div>
              </div>

              {preview.basePromptTemplate && (
                <div>
                  <div className="kicker mb-2">PROMPT BLUEPRINT</div>
                  <div
                    className="t-mono text-[11.5px] leading-relaxed p-3.5 rounded-lg border max-h-[120px] overflow-y-auto"
                    style={{ borderColor: 'var(--line)', background: 'var(--ink-1)', color: 'var(--muted)' }}
                  >
                    {preview.basePromptTemplate}
                  </div>
                </div>
              )}

              {preview.supportedModels && preview.supportedModels.length > 0 && (
                <div>
                  <div className="kicker mb-2">COMPATIBLE MODELS</div>
                  <div className="flex flex-wrap gap-1.5">
                    {preview.supportedModels.map((m) => (
                      <span key={m} className="chip">
                        {m.split('/').pop()}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              <div className="flex gap-3 pt-1">
                <button className="btn btn-primary flex-1 justify-center" onClick={() => useTemplate(preview)}>
                  <Icon name="zap" size={14} /> Use this template
                </button>
                <button
                  className={`btn ${favorites.has(preview.id) ? 'btn-mint' : 'btn-ghost'}`}
                  onClick={() => void toggleFav(preview)}
                >
                  <Icon name="heart" size={14} />
                </button>
              </div>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
};