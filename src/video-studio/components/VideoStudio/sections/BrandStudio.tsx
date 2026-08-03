import React, { useCallback, useEffect, useState } from 'react';
import { SectionHead, Icon, Modal, Meter, Empty, useReveal } from '../shared';
import { useStudio } from '../StudioShell';
import { brandApi } from '../../../services/brandApi';
import type {
  BrandProfile,
  AudienceProfile,
  CampaignProfile,
  CreateBrandDTO,
  CreateAudienceDTO,
  CreateCampaignDTO,
  BrandAnalysisResult,
  AudienceAnalysisResult,
  VideoPlatform,
} from '../../../types/api';

type Tab = 'brands' | 'audiences' | 'campaigns';

export const BrandStudio: React.FC = () => {
  const { notify } = useStudio();
  const [tab, setTab] = useState<Tab>('brands');
  const [brands, setBrands] = useState<BrandProfile[]>([]);
  const [audiences, setAudiences] = useState<AudienceProfile[]>([]);
  const [campaigns, setCampaigns] = useState<CampaignProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [analysis, setAnalysis] = useState<BrandAnalysisResult | AudienceAnalysisResult | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState<Partial<CreateBrandDTO & CreateAudienceDTO & CreateCampaignDTO>>({});

  const listRef = useReveal<HTMLDivElement>();

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [b, a, c] = await Promise.all([
        brandApi.listBrands().catch(() => [] as BrandProfile[]),
        brandApi.listAudiences().catch(() => [] as AudienceProfile[]),
        brandApi.listCampaigns().catch(() => [] as CampaignProfile[]),
      ]);
      setBrands(b as BrandProfile[]);
      setAudiences(a as AudienceProfile[]);
      setCampaigns(c as CampaignProfile[]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const analyzeBrand = async (id: string) => {
    try {
      const res = await brandApi.analyzeBrand(id);
      setAnalysis(res as BrandAnalysisResult);
    } catch (e) {
      notify(e instanceof Error ? e.message : 'Analysis failed', true);
    }
  };

  const analyzeAudience = async (id: string) => {
    try {
      const res = await brandApi.analyzeAudience(id);
      setAnalysis(res as AudienceAnalysisResult);
    } catch (e) {
      notify(e instanceof Error ? e.message : 'Analysis failed', true);
    }
  };

  const create = async () => {
    try {
      if (tab === 'brands') {
        await brandApi.createBrand({
          name: form.name ?? 'Untitled brand',
          colors: form.colors ?? [],
          tone: form.tone,
          luxuryLevel: form.luxuryLevel ?? 50,
        });
      } else if (tab === 'audiences') {
        await brandApi.createAudience({
          name: form.name ?? 'Untitled audience',
          ageGroup: form.ageGroup ?? 'Adults',
          gender: form.gender ?? 'Mixed',
          buyingIntent: form.buyingIntent ?? 'Medium',
          incomeLevel: form.incomeLevel ?? 'Mixed',
        });
      } else {
        await brandApi.createCampaign({
          name: form.name ?? 'Untitled campaign',
          goal: form.goal ?? 'Conversion',
          platforms: form.platforms ?? ['Instagram'],
        });
      }
      setShowForm(false);
      setForm({});
      notify('Created');
      void load();
    } catch (e) {
      notify(e instanceof Error ? e.message : 'Create failed', true);
    }
  };

  const remove = async (id: string) => {
    if (!window.confirm('Delete this item?')) return;
    try {
      if (tab === 'brands') await brandApi.deleteBrand(id);
      else if (tab === 'audiences') await brandApi.deleteAudience(id);
      else await brandApi.deleteCampaign(id);
      notify('Deleted');
      void load();
    } catch (e) {
      notify(e instanceof Error ? e.message : 'Delete failed', true);
    }
  };

  const TAB_META: Record<Tab, { label: string; items: unknown[]; empty: string }> = {
    brands: { label: 'Brand Kit', items: brands, empty: 'No brand kits yet' },
    audiences: { label: 'Audiences', items: audiences, empty: 'No audiences yet' },
    campaigns: { label: 'Campaigns', items: campaigns, empty: 'No campaigns yet' },
  };

  const brandAnalysis = analysis && 'brand' in analysis ? (analysis as BrandAnalysisResult) : null;
  const audienceAnalysis = analysis && 'audience' in analysis ? (analysis as AudienceAnalysisResult) : null;

  return (
    <div>
      <SectionHead
        kicker="IDENTITY · 08"
        title="Brand Studio"
        desc="Brand kit, audience psychology and multi-platform campaigns — the layer that makes every render sound like you."
        action={
          <button
            className="btn btn-primary btn-sm"
            onClick={() => {
              setShowForm(true);
              setForm({});
            }}
          >
            <Icon name="palette" size={13} /> New {TAB_META[tab].label.replace(/s$/, '')}
          </button>
        }
      />

      {/* Tabs */}
      <div className="flex gap-2 mb-6">
        {(Object.keys(TAB_META) as Tab[]).map((t) => (
          <button
            key={t}
            className={`chip ${tab === t ? 'chip-on' : ''}`}
            style={{ padding: '7px 16px', cursor: 'pointer' }}
            onClick={() => setTab(t)}
          >
            {TAB_META[t].label.toUpperCase()}
            <span style={{ opacity: 0.6 }}>{TAB_META[t].items.length}</span>
          </button>
        ))}
      </div>

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {[0, 1, 2].map((i) => (
            <div key={i} className="skeleton h-[170px]" />
          ))}
        </div>
      ) : TAB_META[tab].items.length === 0 ? (
        <Empty
          icon="palette"
          title={TAB_META[tab].empty}
          hint="Create the first one — it feeds directly into prompt composition."
        />
      ) : (
        <div ref={listRef} className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {/* ---------- Brands ---------- */}
          {tab === 'brands' &&
            brands.map((b) => (
              <div key={b.id} className="panel panel-hover p-5">
                <div className="flex items-start justify-between mb-3">
                  <div className="t-display font-bold text-[16px]">{b.name}</div>
                  {b.tone && <span className="chip chip-cyan">{b.tone}</span>}
                </div>
                {b.colors.length > 0 && (
                  <div className="flex gap-1.5 mb-4">
                    {b.colors.slice(0, 6).map((c) => (
                      <div
                        key={c}
                        className="w-7 h-7 rounded-md border transition-transform hover:scale-110"
                        style={{ background: c, borderColor: 'var(--line-strong)' }}
                        title={c}
                      />
                    ))}
                  </div>
                )}
                {b.luxuryLevel !== undefined && b.luxuryLevel !== null && (
                  <div className="mb-4">
                    <div className="flex justify-between mb-1">
                      <span className="kicker">LUXURY</span>
                      <span className="t-mono text-[11px]" style={{ color: 'var(--amber)' }}>
                        {b.luxuryLevel}
                      </span>
                    </div>
                    <div className="bar">
                      <i style={{ width: `${b.luxuryLevel}%`, background: 'var(--amber)' }} />
                    </div>
                  </div>
                )}
                <div className="flex gap-2">
                  <button className="btn btn-ghost btn-sm flex-1 justify-center" onClick={() => void analyzeBrand(b.id)}>
                    <Icon name="scan" size={12} /> Analyze
                  </button>
                  <button className="btn btn-ghost btn-sm" onClick={() => void remove(b.id)}>
                    <Icon name="trash" size={12} />
                  </button>
                </div>
              </div>
            ))}

          {/* ---------- Audiences ---------- */}
          {tab === 'audiences' &&
            audiences.map((a) => (
              <div key={a.id} className="panel panel-hover p-5">
                <div className="t-display font-bold text-[16px] mb-3">{a.name}</div>
                <div className="flex flex-wrap gap-1.5 mb-4">
                  <span className="chip">{a.ageGroup}</span>
                  <span className="chip">{a.gender}</span>
                  <span className="chip chip-cyan">{a.buyingIntent} intent</span>
                  <span className="chip chip-amber">{a.incomeLevel}</span>
                </div>
                <div className="flex gap-2">
                  <button className="btn btn-ghost btn-sm flex-1 justify-center" onClick={() => void analyzeAudience(a.id)}>
                    <Icon name="target" size={12} /> Analyze
                  </button>
                  <button className="btn btn-ghost btn-sm" onClick={() => void remove(a.id)}>
                    <Icon name="trash" size={12} />
                  </button>
                </div>
              </div>
            ))}

          {/* ---------- Campaigns ---------- */}
          {tab === 'campaigns' &&
            campaigns.map((c) => (
              <div key={c.id} className="panel panel-hover p-5">
                <div className="flex items-start justify-between mb-3">
                  <div className="t-display font-bold text-[16px]">{c.name}</div>
                  <span className={`chip ${c.status === 'Active' ? 'chip-mint' : ''}`}>{c.status}</span>
                </div>
                <div className="flex flex-wrap gap-1.5 mb-4">
                  <span className="chip chip-on">{c.goal}</span>
                  {(c.platforms ?? []).map((p) => (
                    <span key={p} className="chip">
                      {p}
                    </span>
                  ))}
                </div>
                <div className="flex gap-2">
                  <button className="btn btn-primary btn-sm flex-1 justify-center" onClick={() => notify(`Generating campaign "${c.name}"…`)}>
                    <Icon name="zap" size={12} /> Generate
                  </button>
                  <button className="btn btn-ghost btn-sm" onClick={() => void remove(c.id)}>
                    <Icon name="trash" size={12} />
                  </button>
                </div>
              </div>
            ))}
        </div>
      )}

      {/* ---------- Create form ---------- */}
      <Modal open={showForm} onClose={() => setShowForm(false)} width={480}>
        <div className="p-6">
          <div className="kicker mb-2">NEW {TAB_META[tab].label.replace(/s$/, '').toUpperCase()}</div>
          <h2 className="t-display font-bold text-[19px] mb-5">
            {tab === 'brands' ? 'Define a brand kit' : tab === 'audiences' ? 'Define an audience' : 'Define a campaign'}
          </h2>

          <div className="space-y-4">
            <input
              className="field"
              placeholder="Name"
              value={form.name ?? ''}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
            />

            {tab === 'brands' && (
              <>
                <input
                  className="field field-mono"
                  placeholder="Colors — comma separated hex, e.g. #FF6B4A, #0C0F16"
                  value={(form.colors ?? []).join(', ')}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      colors: e.target.value
                        .split(',')
                        .map((s) => s.trim())
                        .filter(Boolean),
                    })
                  }
                />
                {(form.colors ?? []).length > 0 && (
                  <div className="flex gap-1.5">
                    {form.colors!.map((c) => (
                      <div
                        key={c}
                        className="w-7 h-7 rounded-md border"
                        style={{ background: c, borderColor: 'var(--line-strong)' }}
                      />
                    ))}
                  </div>
                )}
                <select className="field" value={form.tone ?? ''} onChange={(e) => setForm({ ...form, tone: e.target.value })}>
                  <option value="">Tone of voice…</option>
                  {['Professional', 'Playful', 'Luxury', 'Bold', 'Friendly', 'Minimal'].map((t) => (
                    <option key={t}>{t}</option>
                  ))}
                </select>
                <div>
                  <div className="flex justify-between mb-1.5">
                    <span className="kicker">LUXURY LEVEL</span>
                    <span className="t-mono text-[12px]" style={{ color: 'var(--amber)' }}>
                      {form.luxuryLevel ?? 50}
                    </span>
                  </div>
                  <input
                    type="range"
                    min={0}
                    max={100}
                    value={form.luxuryLevel ?? 50}
                    onChange={(e) => setForm({ ...form, luxuryLevel: Number(e.target.value) })}
                    className="w-full"
                    style={{ accentColor: 'var(--coral)' }}
                  />
                </div>
              </>
            )}

            {tab === 'audiences' && (
              <div className="grid grid-cols-2 gap-3">
                <select
                  className="field"
                  value={form.ageGroup ?? 'Adults'}
                  onChange={(e) => setForm({ ...form, ageGroup: e.target.value })}
                >
                  {['Kids', 'Teens', 'Young Adults', 'Adults', 'Seniors', 'Mixed'].map((v) => (
                    <option key={v}>{v}</option>
                  ))}
                </select>
                <select
                  className="field"
                  value={form.gender ?? 'Mixed'}
                  onChange={(e) => setForm({ ...form, gender: e.target.value })}
                >
                  {['Men', 'Women', 'Unisex', 'Mixed'].map((v) => (
                    <option key={v}>{v}</option>
                  ))}
                </select>
                <select
                  className="field"
                  value={form.buyingIntent ?? 'Medium'}
                  onChange={(e) => setForm({ ...form, buyingIntent: e.target.value })}
                >
                  {['Low', 'Medium', 'High', 'Impulse'].map((v) => (
                    <option key={v}>{v} intent</option>
                  ))}
                </select>
                <select
                  className="field"
                  value={form.incomeLevel ?? 'Mixed'}
                  onChange={(e) => setForm({ ...form, incomeLevel: e.target.value })}
                >
                  {['Budget', 'Middle', 'Upper-Middle', 'Luxury', 'Mixed'].map((v) => (
                    <option key={v}>{v}</option>
                  ))}
                </select>
              </div>
            )}

            {tab === 'campaigns' && (
              <>
                <select className="field" value={form.goal ?? 'Conversion'} onChange={(e) => setForm({ ...form, goal: e.target.value })}>
                  {['Awareness', 'Engagement', 'Conversion', 'Retention'].map((v) => (
                    <option key={v}>{v}</option>
                  ))}
                </select>
                <div className="flex flex-wrap gap-1.5">
                  {(['TikTok', 'Instagram', 'Facebook', 'YouTube', 'Pinterest'] as VideoPlatform[]).map((p) => {
                    const on = (form.platforms ?? []).includes(p);
                    return (
                      <button
                        key={p}
                        className={`chip ${on ? 'chip-on' : ''}`}
                        style={{ padding: '6px 13px', cursor: 'pointer' }}
                        onClick={() =>
                          setForm({
                            ...form,
                            platforms: on ? form.platforms!.filter((x) => x !== p) : [...(form.platforms ?? []), p],
                          })
                        }
                      >
                        {p}
                      </button>
                    );
                  })}
                </div>
              </>
            )}

            <button className="btn btn-primary w-full justify-center" onClick={create} disabled={!form.name}>
              <Icon name="check" size={14} /> Create
            </button>
          </div>
        </div>
      </Modal>

      {/* ---------- Analysis modal ---------- */}
      <Modal open={!!analysis} onClose={() => setAnalysis(null)} width={560}>
        {analysis && (
          <div className="p-6">
            <div className="kicker mb-2">
              {brandAnalysis ? 'BRAND INTELLIGENCE' : 'AUDIENCE INTELLIGENCE'}
            </div>
            <h2 className="t-display font-bold text-[19px] mb-5">
              {brandAnalysis?.brand?.name ?? audienceAnalysis?.audience?.name ?? 'Analysis'}
            </h2>

            {brandAnalysis && (
              <div className="space-y-5">
                <div className="flex flex-wrap gap-2">
                  <span className="chip chip-on">{(brandAnalysis.analysis.visualStyle as string) ?? '—'}</span>
                  <span className="chip chip-cyan">{(brandAnalysis.analysis.voiceProfile?.tone as string) ?? '—'}</span>
                  <span className="chip chip-amber">
                    LUXURY {brandAnalysis.analysis.luxuryScore as number}
                  </span>
                </div>
                <div>
                  <div className="kicker mb-2">RECOMMENDED VIDEO STYLES</div>
                  <div className="flex flex-wrap gap-1.5">
                    {(brandAnalysis.analysis.recommendedVideoStyles as string[] ?? []).map((s) => (
                      <span key={s} className="chip chip-mint">
                        {s}
                      </span>
                    ))}
                  </div>
                </div>
                <div>
                  <div className="kicker mb-2">CTA PATTERNS</div>
                  <div className="space-y-1.5">
                    {(brandAnalysis.analysis.ctaPatterns as string[] ?? []).map((c) => (
                      <div key={c} className="text-[13px] flex gap-2" style={{ color: 'var(--muted)' }}>
                        <span style={{ color: 'var(--coral)' }}>›</span> {c}
                      </div>
                    ))}
                  </div>
                </div>
                <div>
                  <div className="kicker mb-2">RECOMMENDED MUSIC</div>
                  <div className="flex flex-wrap gap-1.5">
                    {(brandAnalysis.analysis.recommendedMusic as string[] ?? []).map((m) => (
                      <span key={m} className="chip">
                        {m}
                      </span>
                    ))}
                  </div>
                </div>
                <div>
                  <div className="kicker mb-2">SCORES</div>
                  <div className="space-y-3">
                    <Meter label="Modern" value={brandAnalysis.analysis.modernScore as number} tone="var(--cyan)" />
                    <Meter label="Playful" value={brandAnalysis.analysis.playfulScore as number} tone="var(--coral)" />
                    <Meter label="Professional" value={brandAnalysis.analysis.professionalScore as number} tone="var(--mint)" />
                  </div>
                </div>
              </div>
            )}

            {audienceAnalysis && (
              <div className="space-y-5">
                <div>
                  <div className="kicker mb-2">EMOTIONAL TRIGGERS</div>
                  <div className="flex flex-wrap gap-1.5">
                    {(audienceAnalysis.analysis.emotionalTriggers as string[] ?? []).map((t) => (
                      <span key={t} className="chip chip-on">
                        {t}
                      </span>
                    ))}
                  </div>
                </div>
                <div>
                  <div className="kicker mb-2">PREFERRED PLATFORMS</div>
                  <div className="flex flex-wrap gap-1.5">
                    {(audienceAnalysis.analysis.preferredPlatforms as string[] ?? []).map((p) => (
                      <span key={p} className="chip chip-cyan">
                        {p}
                      </span>
                    ))}
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="p-3 rounded-lg border" style={{ borderColor: 'var(--line)' }}>
                    <div className="t-mono text-[14px] font-semibold" style={{ color: 'var(--cyan)' }}>
                      {audienceAnalysis.analysis.preferredVideoPace as string}
                    </div>
                    <div className="kicker mt-1">VIDEO PACE</div>
                  </div>
                  <div className="p-3 rounded-lg border" style={{ borderColor: 'var(--line)' }}>
                    <div className="t-mono text-[14px] font-semibold" style={{ color: 'var(--mint)' }}>
                      {(audienceAnalysis.analysis.engagementPatterns?.bestTimeOfDay as string) ?? '—'}
                    </div>
                    <div className="kicker mt-1">BEST TIME</div>
                  </div>
                </div>
                <div>
                  <div className="kicker mb-2">CONVERSION DRIVERS</div>
                  <div className="space-y-1.5">
                    {(audienceAnalysis.analysis.conversionDrivers as string[] ?? []).slice(0, 4).map((d) => (
                      <div key={d} className="text-[13px] flex gap-2" style={{ color: 'var(--muted)' }}>
                        <span style={{ color: 'var(--mint)' }}>›</span> {d}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </Modal>
    </div>
  );
};