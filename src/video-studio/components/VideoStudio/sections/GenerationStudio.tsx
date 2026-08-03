import React, { useEffect, useMemo, useState } from 'react';
import { SectionHead, Icon, StatusChip, useReveal } from '../shared';
import { useStudio } from '../StudioShell';
import { videoApi } from '../../../services/videoApi';
import { templateApi } from '../../../services/templateApi';
import { promptApi } from '../../../services/promptApi';
import { providerApi } from '../../../services/providerApi';
import { formatMoney } from '../../../lib/formatters';
import {
  PLATFORMS,
  PROVIDERS,
  RESOLUTIONS,
  ASPECT_RATIOS,
  QUALITIES,
  DURATIONS,
  FPS_OPTIONS,
  CAMERA_MOTIONS,
  LIGHTING_OPTIONS,
} from '../../../lib/constants';
import type {
  VideoTemplate,
  VideoPlatform,
  VideoProviderName,
  VideoGenerationSettings,
  ComposedPrompt,
  PromptPreviewResult,
  CostComparisonResult,
  RoutingDecision,
} from '../../../types/api';

const STEPS = [
  { id: 0, label: 'Product', icon: 'scan' },
  { id: 1, label: 'Template', icon: 'layers' },
  { id: 2, label: 'Platform', icon: 'target' },
  { id: 3, label: 'Provider', icon: 'server' },
  { id: 4, label: 'Review & Render', icon: 'zap' },
];

const DEFAULT_SETTINGS: VideoGenerationSettings = {
  resolution: '1080',
  aspectRatio: '9:16',
  duration: 10,
  fps: 30,
  quality: 'High',
};

export const GenerationStudio: React.FC = () => {
  const { draft, setDraft, setSection, notify } = useStudio();

  const [step, setStep] = useState(draft.productId ? 1 : 0);
  const [productId, setProductId] = useState(draft.productId ?? '');
  const [templates, setTemplates] = useState<VideoTemplate[]>([]);
  const [recommended, setRecommended] = useState<Array<{ template: VideoTemplate; score: number }>>([]);
  const [templateId, setTemplateId] = useState(draft.templateId ?? '');
  const [platform, setPlatform] = useState<VideoPlatform>((draft.platform as VideoPlatform) ?? 'TikTok');
  const [providerMode, setProviderMode] = useState<'auto' | 'manual'>('auto');
  const [provider, setProvider] = useState<VideoProviderName>('HuggingFace');
  const [routing, setRouting] = useState<RoutingDecision | null>(null);
  const [comparison, setComparison] = useState<CostComparisonResult | null>(null);
  const [composed, setComposed] = useState<ComposedPrompt | null>(null);
  const [preview, setPreview] = useState<PromptPreviewResult | null>(null);
  const [busy, setBusy] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [settings, setSettings] = useState<VideoGenerationSettings>(DEFAULT_SETTINGS);

  const railRef = useReveal<HTMLDivElement>();

  const selectedTemplate = useMemo(
    () => templates.find((t) => t.id === templateId) ?? recommended.find((r) => r.template.id === templateId)?.template,
    [templates, recommended, templateId]
  );

  useEffect(() => {
    void templateApi.search({ limit: 100 }).then((res) => {
      const list = (res as { items: VideoTemplate[] }).items ?? (res as unknown as VideoTemplate[]);
      setTemplates(list);
    });
  }, []);

  useEffect(() => {
    if (!productId) return;
    void templateApi.getRecommended(productId, { platform, limit: 6 }).then((list) => {
      const items = list as Array<{ template: VideoTemplate; score: number }>;
      setRecommended(items);
    });
  }, [productId, platform]);

  useEffect(() => {
    if (step !== 3 || !productId) return;
    setBusy(true);
    const basePrompt = selectedTemplate?.basePromptTemplate ?? 'product commercial video';
    Promise.allSettled([
      providerApi.selectProvider({ prompt: basePrompt, settings, criteria: { prioritize: 'balanced' } }),
      providerApi.compareCost({ prompt: basePrompt, settings }),
    ]).then(([route, comp]) => {
      if (route.status === 'fulfilled') {
        const decision = route.value as RoutingDecision;
        setRouting(decision);
        if (decision?.selectedProvider) setProvider(decision.selectedProvider);
      }
      if (comp.status === 'fulfilled') setComparison(comp.value as CostComparisonResult);
      setBusy(false);
    });
  }, [step, productId, settings, selectedTemplate]);

  useEffect(() => {
    if (step !== 4 || !productId || !templateId) return;
    setBusy(true);
    promptApi
      .compose({
        productId,
        templateId,
        platform,
        videoSettings: settings,
      })
      .then(async (plan) => {
        const planData = plan as { composed: ComposedPrompt; preview: PromptPreviewResult };
        setComposed(planData.composed);
        try {
          const p = (await promptApi.preview({
            prompt: planData.composed.prompt,
            negativePrompt: planData.composed.negativePrompt,
            provider,
            settings,
          })) as PromptPreviewResult;
          setPreview(p);
        } catch {
          setPreview(null);
        }
        setBusy(false);
      })
      .catch(() => {
        setComposed(null);
        setPreview(null);
        setBusy(false);
      });
  }, [step, productId, templateId, platform, settings, provider]);

  const generate = async () => {
    if (!productId || !templateId) return;
    setGenerating(true);
    try {
      await videoApi.generate({ productId, templateId, platform, settings });
      notify('Render job submitted — track it in the Queue');
      setSection('queue');
    } catch (e) {
      notify(e instanceof Error ? e.message : 'Generation failed', true);
    } finally {
      setGenerating(false);
    }
  };

  const canNext =
    (step === 0 && productId.length > 0) ||
    (step === 1 && !!templateId) ||
    (step === 2 && !!platform) ||
    (step === 3 && !!provider);

  return (
    <div>
      <SectionHead
        kicker="RENDER LINE · 04"
        title="Generation Studio"
        desc="Five stations from raw product to queued render. The prompt engine composes everything — you approve, it renders."
      />

      <div className="grid grid-cols-1 lg:grid-cols-[210px_1fr] gap-6">
        {/* ---------- Step rail ---------- */}
        <div ref={railRef} className="panel p-3 h-fit lg:sticky lg:top-[76px]">
          {STEPS.map((s) => {
            const active = step === s.id;
            const done = step > s.id;
            return (
              <button
                key={s.id}
                onClick={() => s.id < step && setStep(s.id)}
                className="w-full flex items-center gap-3 px-3 py-3 rounded-lg text-left transition-all"
                style={{ background: active ? 'var(--coral-soft)' : 'transparent', cursor: s.id <= step ? 'pointer' : 'default' }}
              >
                <span
                  className="t-mono text-[11px] w-6 h-6 rounded-md flex items-center justify-center flex-none border transition-colors"
                  style={{
                    borderColor: active ? 'var(--coral)' : done ? 'var(--mint)' : 'var(--line-strong)',
                    color: active ? 'var(--coral)' : done ? 'var(--mint)' : 'var(--faint)',
                    background: done ? 'var(--mint-soft)' : 'transparent',
                  }}
                >
                  {done ? <Icon name="check" size={11} /> : `0${s.id + 1}`}
                </span>
                <span className="text-[13px] font-medium" style={{ color: active ? 'var(--text)' : 'var(--muted)' }}>
                  {s.label}
                </span>
              </button>
            );
          })}
        </div>

        {/* ---------- Step content ---------- */}
        <div className="min-w-0">
          {/* STEP 0 — Product */}
          {step === 0 && (
            <div className="panel p-6">
              <div className="kicker mb-3">STATION 01 · SOURCE PRODUCT</div>
              <h2 className="t-display font-semibold text-[19px] mb-2">Which product are we selling?</h2>
              <p className="text-[13px] mb-5" style={{ color: 'var(--muted)' }}>
                Paste the product ID (UUID) from your catalog — or analyze it first for a video-ready score.
              </p>
              <input
                className="field field-mono"
                placeholder="Product UUID…"
                value={productId}
                onChange={(e) => setProductId(e.target.value)}
                spellCheck={false}
              />
              <div className="flex gap-3 mt-5">
                <button className="btn btn-ghost btn-sm" onClick={() => setSection('analyzer')}>
                  <Icon name="scan" size={13} /> Analyze first
                </button>
              </div>
            </div>
          )}

          {/* STEP 1 — Template */}
          {step === 1 && (
            <div className="panel p-6">
              <div className="kicker mb-3">STATION 02 · PICK A TEMPLATE</div>
              {recommended.length > 0 && (
                <div className="mb-6">
                  <div className="flex items-center gap-2 mb-3">
                    <span className="chip chip-mint">RECOMMENDED FOR THIS PRODUCT</span>
                  </div>
                  <div className="scroll-x no-scrollbar flex gap-3">
                    {recommended.map((rec) => (
                      <button
                        key={rec.template.id}
                        onClick={() => setTemplateId(rec.template.id)}
                        className="frame aspect-[9/12] w-[132px] flex-none text-left"
                        style={{ outline: templateId === rec.template.id ? '2px solid var(--coral)' : 'none', outlineOffset: 2 }}
                      >
                        {rec.template.thumbnailUrl ? (
                          <img src={rec.template.thumbnailUrl} alt={rec.template.name} loading="lazy" />
                        ) : (
                          <div className="w-full h-full" style={{ background: 'var(--ink-3)' }} />
                        )}
                        <div className="veil" />
                        <div className="absolute bottom-0 inset-x-0 p-2">
                          <div className="text-[10.5px] font-semibold truncate">{rec.template.name}</div>
                          <div className="t-mono text-[9px]" style={{ color: 'var(--mint)' }}>
                            match {rec.score}
                          </div>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              <div className="kicker mb-3">ALL TEMPLATES</div>
              <div className="grid grid-cols-3 md:grid-cols-5 gap-3 max-h-[340px] overflow-y-auto pr-1">
                {templates.map((t) => (
                  <button
                    key={t.id}
                    onClick={() => setTemplateId(t.id)}
                    className="frame aspect-[9/12] text-left"
                    style={{ outline: templateId === t.id ? '2px solid var(--coral)' : 'none', outlineOffset: 2 }}
                  >
                    {t.thumbnailUrl ? (
                      <img src={t.thumbnailUrl} alt={t.name} loading="lazy" />
                    ) : (
                      <div className="w-full h-full" style={{ background: 'var(--ink-3)' }} />
                    )}
                    <div className="veil" />
                    <div className="absolute bottom-0 inset-x-0 p-2">
                      <div className="text-[10.5px] font-semibold truncate">{t.name}</div>
                      <div className="t-mono text-[9px]" style={{ color: 'var(--muted)' }}>
                        {t.category}
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* STEP 2 — Platform */}
          {step === 2 && (
            <div className="panel p-6">
              <div className="kicker mb-3">STATION 03 · TARGET PLATFORM</div>
              <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-7">
                {PLATFORMS.map((p) => (
                  <button
                    key={p}
                    onClick={() => setPlatform(p)}
                    className="p-4 rounded-lg border text-center transition-all"
                    style={{
                      borderColor: platform === p ? 'var(--coral)' : 'var(--line)',
                      background: platform === p ? 'var(--coral-soft)' : 'var(--ink-1)',
                    }}
                  >
                    <div className="t-display font-semibold text-[14px]">{p}</div>
                    <div className="t-mono text-[10px] mt-1" style={{ color: 'var(--muted)' }}>
                      {p === 'TikTok' || p === 'Instagram' ? '9:16' : p === 'YouTube' ? '16:9 / 9:16' : p === 'Facebook' ? '16:9' : '9:16'}
                    </div>
                  </button>
                ))}
              </div>

              <div className="kicker mb-3">RENDER SETTINGS</div>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <label className="block">
                  <span className="kicker block mb-1.5">RESOLUTION</span>
                  <select
                    className="field field-mono"
                    value={settings.resolution}
                    onChange={(e) => setSettings({ ...settings, resolution: e.target.value as typeof settings.resolution })}
                  >
                    {RESOLUTIONS.map((r) => (
                      <option key={r}>{r}</option>
                    ))}
                  </select>
                </label>
                <label className="block">
                  <span className="kicker block mb-1.5">ASPECT</span>
                  <select
                    className="field field-mono"
                    value={settings.aspectRatio}
                    onChange={(e) => setSettings({ ...settings, aspectRatio: e.target.value as typeof settings.aspectRatio })}
                  >
                    {ASPECT_RATIOS.map((r) => (
                      <option key={r}>{r}</option>
                    ))}
                  </select>
                </label>
                <label className="block">
                  <span className="kicker block mb-1.5">DURATION</span>
                  <select
                    className="field field-mono"
                    value={settings.duration}
                    onChange={(e) => setSettings({ ...settings, duration: Number(e.target.value) as typeof settings.duration })}
                  >
                    {DURATIONS.map((d) => (
                      <option key={d} value={d}>
                        {d}s
                      </option>
                    ))}
                  </select>
                </label>
                <label className="block">
                  <span className="kicker block mb-1.5">QUALITY</span>
                  <select
                    className="field field-mono"
                    value={settings.quality}
                    onChange={(e) => setSettings({ ...settings, quality: e.target.value as typeof settings.quality })}
                  >
                    {QUALITIES.map((q) => (
                      <option key={q}>{q}</option>
                    ))}
                  </select>
                </label>
                <label className="block">
                  <span className="kicker block mb-1.5">FPS</span>
                  <select
                    className="field field-mono"
                    value={settings.fps}
                    onChange={(e) => setSettings({ ...settings, fps: Number(e.target.value) as typeof settings.fps })}
                  >
                    {FPS_OPTIONS.map((f) => (
                      <option key={f} value={f}>
                        {f}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="block">
                  <span className="kicker block mb-1.5">CAMERA</span>
                  <select
                    className="field field-mono"
                    value={settings.cameraMotion ?? ''}
                    onChange={(e) =>
                      setSettings({
                        ...settings,
                        cameraMotion: (e.target.value || undefined) as typeof settings.cameraMotion,
                      })
                    }
                  >
                    <option value="">—</option>
                    {CAMERA_MOTIONS.map((m) => (
                      <option key={m}>{m}</option>
                    ))}
                  </select>
                </label>
                <label className="block">
                  <span className="kicker block mb-1.5">LIGHTING</span>
                  <select
                    className="field field-mono"
                    value={settings.lighting ?? ''}
                    onChange={(e) =>
                      setSettings({
                        ...settings,
                        lighting: (e.target.value || undefined) as typeof settings.lighting,
                      })
                    }
                  >
                    <option value="">—</option>
                    {LIGHTING_OPTIONS.map((l) => (
                      <option key={l}>{l}</option>
                    ))}
                  </select>
                </label>
              </div>
            </div>
          )}

          {/* STEP 3 — Provider */}
          {step === 3 && (
            <div className="panel p-6">
              <div className="kicker mb-3">STATION 04 · CHOOSE THE ENGINE</div>

              <div className="flex gap-2 mb-6">
                <button
                  className={`chip ${providerMode === 'auto' ? 'chip-mint' : ''}`}
                  style={{ padding: '6px 14px', cursor: 'pointer' }}
                  onClick={() => setProviderMode('auto')}
                >
                  <Icon name="zap" size={11} /> AUTO-ROUTING
                </button>
                <button
                  className={`chip ${providerMode === 'manual' ? 'chip-on' : ''}`}
                  style={{ padding: '6px 14px', cursor: 'pointer' }}
                  onClick={() => setProviderMode('manual')}
                >
                  MANUAL
                </button>
              </div>

              {busy ? (
                <div className="space-y-3">
                  {[0, 1, 2].map((i) => (
                    <div key={i} className="skeleton h-[64px]" />
                  ))}
                </div>
              ) : providerMode === 'auto' && routing ? (
                <div className="space-y-4">
                  <div className="p-4 rounded-lg border flex items-center justify-between" style={{ borderColor: 'rgba(67,217,163,0.4)', background: 'var(--mint-soft)' }}>
                    <div className="flex items-center gap-3">
                      <span className="dot dot-live" />
                      <div>
                        <div className="t-display font-semibold text-[15px]">{routing.selectedProvider}</div>
                        <div className="t-mono text-[10.5px] mt-0.5" style={{ color: 'var(--muted)' }}>
                          ROUTER SCORE {routing.scores?.[routing.selectedProvider] ?? '—'} · EST{' '}
                          {formatMoney(routing.estimatedCost)} · ~{routing.estimatedTime}s
                        </div>
                      </div>
                    </div>
                    <span className="chip chip-mint">ROUTER PICK</span>
                  </div>

                  {(routing.reasoning ?? []).slice(0, 4).map((r, i) => (
                    <div key={i} className="t-mono text-[11px] flex gap-2" style={{ color: 'var(--muted)' }}>
                      <span style={{ color: 'var(--cyan)' }}>›</span> {r}
                    </div>
                  ))}

                  <div>
                    <div className="kicker mb-2">FALLBACK CHAIN</div>
                    <div className="flex flex-wrap items-center gap-1.5">
                      {(routing.fallbackChain ?? []).slice(0, 5).map((p, i) => (
                        <React.Fragment key={p}>
                          {i > 0 && <span style={{ color: 'var(--faint)' }}>→</span>}
                          <span className="chip">{p}</span>
                        </React.Fragment>
                      ))}
                    </div>
                  </div>
                </div>
              ) : (
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                  {PROVIDERS.map((p) => {
                    const est = comparison?.estimates?.find((e) => e.provider === p);
                    return (
                      <button
                        key={p}
                        onClick={() => setProvider(p)}
                        className="p-4 rounded-lg border text-left transition-all"
                        style={{
                          borderColor: provider === p ? 'var(--coral)' : 'var(--line)',
                          background: provider === p ? 'var(--coral-soft)' : 'var(--ink-1)',
                        }}
                      >
                        <div className="t-display font-semibold text-[14px]">{p}</div>
                        <div className="t-mono text-[11px] mt-1.5" style={{ color: 'var(--amber)' }}>
                          {est ? formatMoney(est.estimatedCost) : '—'}
                        </div>
                        <div className="t-mono text-[10px]" style={{ color: 'var(--muted)' }}>
                          {est ? `~${est.estimatedTime}s` : 'no estimate'}
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}

              {comparison && (
                <div className="mt-6">
                  <div className="kicker mb-3">COST COMPARISON</div>
                  <div className="overflow-x-auto">
                    <table className="w-full text-[12.5px]">
                      <thead>
                        <tr className="kicker" style={{ textAlign: 'left' }}>
                          <th className="pb-2 pr-4 font-normal">PROVIDER</th>
                          <th className="pb-2 pr-4 font-normal">COST</th>
                          <th className="pb-2 pr-4 font-normal">TIME</th>
                          <th className="pb-2 font-normal">TAG</th>
                        </tr>
                      </thead>
                      <tbody>
                        {(comparison.estimates ?? []).slice(0, 7).map((e) => (
                          <tr key={e.provider} className="border-t" style={{ borderColor: 'var(--line)' }}>
                            <td className="py-2.5 pr-4 font-medium">{e.provider}</td>
                            <td className="py-2.5 pr-4 t-mono" style={{ color: 'var(--amber)' }}>
                              {formatMoney(e.estimatedCost)}
                            </td>
                            <td className="py-2.5 pr-4 t-mono" style={{ color: 'var(--muted)' }}>
                              ~{e.estimatedTime}s
                            </td>
                            <td className="py-2.5">
                              {comparison.cheapest?.provider === e.provider && <span className="chip chip-mint">CHEAPEST</span>}
                              {comparison.fastest?.provider === e.provider && <span className="chip chip-cyan">FASTEST</span>}
                              {comparison.recommended?.provider === e.provider && <span className="chip chip-on">RECOMMENDED</span>}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* STEP 4 — Review & render */}
          {step === 4 && (
            <div className="space-y-5">
              <div className="panel p-6 ticks">
                <div className="kicker mb-3">STATION 05 · PROMPT PREVIEW</div>
                {busy ? (
                  <div className="space-y-3">
                    <div className="skeleton h-[110px]" />
                    <div className="skeleton h-[40px]" />
                  </div>
                ) : composed ? (
                  <div className="space-y-4">
                    <div
                      className="t-mono text-[12px] leading-relaxed p-4 rounded-lg border max-h-[220px] overflow-y-auto"
                      style={{ borderColor: 'var(--line)', background: 'var(--ink-1)' }}
                    >
                      {composed.prompt}
                    </div>
                    {composed.negativePrompt && (
                      <div>
                        <div className="kicker mb-1.5">NEGATIVE</div>
                        <div
                          className="t-mono text-[11px] p-3 rounded-lg border"
                          style={{ borderColor: 'var(--line)', background: 'var(--ink-1)', color: 'var(--coral)' }}
                        >
                          {composed.negativePrompt.slice(0, 220)}…
                        </div>
                      </div>
                    )}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                      <div className="p-3 rounded-lg border text-center" style={{ borderColor: 'var(--line)' }}>
                        <div className="t-mono text-[16px] font-semibold" style={{ color: 'var(--cyan)' }}>
                          {composed.metadata?.tokenCount ?? 0}
                        </div>
                        <div className="kicker mt-1">TOKENS</div>
                      </div>
                      <div className="p-3 rounded-lg border text-center" style={{ borderColor: 'var(--line)' }}>
                        <div className="t-mono text-[16px] font-semibold" style={{ color: 'var(--amber)' }}>
                          {formatMoney(preview?.estimatedCost ?? composed.metadata?.estimatedCost ?? 0)}
                        </div>
                        <div className="kicker mt-1">EST. COST</div>
                      </div>
                      <div className="p-3 rounded-lg border text-center" style={{ borderColor: 'var(--line)' }}>
                        <div className="t-mono text-[16px] font-semibold" style={{ color: 'var(--text)' }}>
                          {preview?.estimatedDuration ?? settings.duration}s
                        </div>
                        <div className="kicker mt-1">DURATION</div>
                      </div>
                      <div className="p-3 rounded-lg border text-center" style={{ borderColor: 'var(--line)' }}>
                        <div className="t-mono text-[16px] font-semibold" style={{ color: 'var(--mint)' }}>
                          {preview?.qualityScore ?? composed.metadata?.qualityScore ?? 0}%
                        </div>
                        <div className="kicker mt-1">QUALITY</div>
                      </div>
                    </div>

                    {preview?.warnings && preview.warnings.length > 0 && (
                      <div className="space-y-1.5">
                        {preview.warnings.map((w, i) => (
                          <div key={i} className="t-mono text-[11px] flex gap-2" style={{ color: 'var(--amber)' }}>
                            <span>⚠</span> {w}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="t-mono text-[12px]" style={{ color: 'var(--faint)' }}>
                    COMPOSITION UNAVAILABLE — CHECK PRODUCT & TEMPLATE
                  </div>
                )}
              </div>

              <div className="panel p-5 flex items-center justify-between gap-4 flex-wrap">
                <div className="flex items-center gap-3">
                  <StatusChip status="Queued" />
                  <div className="t-mono text-[11.5px]" style={{ color: 'var(--muted)' }}>
                    {provider} · {settings.resolution}p · {settings.aspectRatio} · {settings.duration}s · {settings.quality}
                  </div>
                </div>
                <button className="btn btn-primary" onClick={generate} disabled={generating || !composed}>
                  {generating ? (
                    <>
                      <span className="dot dot-live" /> Submitting…
                    </>
                  ) : (
                    <>
                      <Icon name="zap" size={15} /> Generate Video
                    </>
                  )}
                </button>
              </div>
            </div>
          )}

          {/* ---------- Rail footer nav ---------- */}
          <div className="flex justify-between mt-5">
            <button className="btn btn-ghost" onClick={() => setStep(Math.max(0, step - 1))} disabled={step === 0}>
              Back
            </button>
            {step < 4 && (
              <button className="btn btn-primary" disabled={!canNext} onClick={() => setStep(step + 1)}>
                Continue <Icon name="chevron" size={13} />
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};