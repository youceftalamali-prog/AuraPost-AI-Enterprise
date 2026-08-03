import React, { useState } from 'react';
import { SectionHead, Gauge, Meter, Icon, Empty, useReveal } from '../shared';
import { useStudio } from '../StudioShell';
import { productApi } from '../../../services/productApi';
import type { ProductIntelligenceResult } from '../../../types/api';

export const ProductAnalyzer: React.FC = () => {
  const { setSection, setDraft, notify } = useStudio();
  const [productId, setProductId] = useState('');
  const [rawProduct, setRawProduct] = useState('');
  const [source, setSource] = useState<string>('Manual');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<ProductIntelligenceResult | null>(null);
  const [error, setError] = useState('');

  const r1 = useReveal<HTMLDivElement>();
  const r2 = useReveal<HTMLDivElement>();

  const analyze = async () => {
    setError('');
    if (!productId.trim()) {
      setError('Enter a product ID.');
      return;
    }
    let parsed: Record<string, unknown>;
    try {
      parsed = rawProduct.trim() ? JSON.parse(rawProduct) : { title: 'Product', images: [] };
    } catch {
      setError('Invalid JSON in product payload.');
      return;
    }

    setLoading(true);
    setResult(null);
    try {
      const res = await productApi.analyze(productId.trim(), {
        product: parsed,
        source: source as 'Shopify' | 'Amazon' | 'WooCommerce' | 'AliExpress' | 'Manual' | 'CSV' | 'API',
      });
      setResult(res);
      notify('Product analyzed — intelligence report ready');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Analysis failed');
      notify('Analysis failed', true);
    } finally {
      setLoading(false);
    }
  };

  const score = (result?.videoReadyScore as { score?: number })?.score ?? 0;
  const improvements = ((result?.videoReadyScore as { improvements?: string[] })?.improvements ?? []) as string[];
  const text = (result?.textIntelligence ?? {}) as Record<string, unknown>;
  const image = (result?.imageIntelligence ?? {}) as Record<string, unknown>;

  const textVibe = (text.vibe as string) ?? '—';
  const textCategory = (text.category as string) ?? 'General';
  const textAudience = (text.targetAudience as string[]) ?? [];
  const textKeywords = (text.keywords as string[]) ?? [];
  const luxuryScore = (text.luxuryScore as number) ?? 0;
  const viralScore = (text.viralScore as number) ?? 0;
  const confidence = ((text.confidence as number) ?? 0) * 100;

  const bestImageUrl = (image.bestImageUrl as string) ?? '';
  const dominantColors = ((image.images as Array<{ dominantColors?: string[] }>)?.[0]?.dominantColors ?? []) as string[];
  const overallRec = (image.overallRecommendation as { needsBackgroundRemoval?: boolean; needsEnhancement?: boolean; needsAdditionalImages?: boolean }) ?? {};

  return (
    <div>
      <SectionHead
        kicker="INTELLIGENCE · 02"
        title="Product Analyzer"
        desc="Feed the engine a product from your catalog. It reads the copy, inspects the images and scores how video-ready it is."
      />

      {/* ---------- Intake ---------- */}
      <div className="panel p-5 mb-6">
        <div className="kicker mb-3">PRODUCT INTAKE</div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-3">
          <input
            className="field field-mono"
            placeholder="Product ID (UUID)"
            value={productId}
            onChange={(e) => setProductId(e.target.value)}
            spellCheck={false}
          />
          <select className="field" value={source} onChange={(e) => setSource(e.target.value)}>
            {['Manual', 'Shopify', 'Amazon', 'WooCommerce', 'AliExpress', 'CSV', 'API'].map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
          <button className="btn btn-primary" onClick={analyze} disabled={loading}>
            {loading ? (
              <>
                <span className="dot dot-live" /> Analyzing…
              </>
            ) : (
              <>
                <Icon name="scan" size={14} /> Run Analysis
              </>
            )}
          </button>
        </div>
        <textarea
          className="field field-mono"
          rows={4}
          placeholder='Raw product JSON (optional) — e.g. {"title":"Diamond Ring","images":["https://..."],"price":299}'
          value={rawProduct}
          onChange={(e) => setRawProduct(e.target.value)}
          spellCheck={false}
        />
        {error && (
          <div className="t-mono text-[12px] mt-3" style={{ color: 'var(--coral)' }}>
            ERR · {error}
          </div>
        )}
      </div>

      {loading && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {[0, 1, 2].map((i) => (
            <div key={i} className="skeleton h-[260px]" />
          ))}
        </div>
      )}

      {!loading && !result && (
        <Empty
          icon="scan"
          title="Nothing analyzed yet"
          hint="Enter a product ID and run analysis — the engine will produce a Video-Ready Score, text intelligence and image inspection."
        />
      )}

      {!loading && result && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* ---------- Score ---------- */}
          <div ref={r1} className="panel p-6 flex flex-col items-center ticks">
            <div className="kicker self-start mb-4">VIDEO-READY SCORE</div>
            <Gauge value={score} size={168} label="/ 100" />
            <div
              className="chip mt-5"
              style={{
                color: score >= 80 ? 'var(--mint)' : score >= 60 ? 'var(--cyan)' : 'var(--amber)',
                borderColor: 'currentColor',
              }}
            >
              {score >= 80 ? 'EXCELLENT — READY TO RENDER' : score >= 60 ? 'GOOD — MINOR FIXES' : 'NEEDS WORK'}
            </div>

            {improvements.length > 0 && (
              <div className="w-full mt-6">
                <div className="kicker mb-3">SUGGESTED FIXES</div>
                <ol className="space-y-2.5">
                  {improvements.slice(0, 5).map((imp, i) => (
                    <li key={i} className="flex gap-3 text-[12.5px]" style={{ color: 'var(--muted)' }}>
                      <span className="t-mono flex-none" style={{ color: 'var(--coral)' }}>
                        {String(i + 1).padStart(2, '0')}
                      </span>
                      {imp}
                    </li>
                  ))}
                </ol>
              </div>
            )}

            <button
              className="btn btn-primary w-full justify-center mt-6"
              onClick={() => {
                setDraft({ productId: result.productId });
                setSection('generate');
              }}
            >
              <Icon name="wand" size={14} /> Take to Generation
            </button>
          </div>

          {/* ---------- Text intelligence ---------- */}
          <div ref={r2} className="panel p-6">
            <div className="kicker mb-4">TEXT INTELLIGENCE</div>
            <div className="space-y-5">
              <div className="flex flex-wrap gap-2">
                <span className="chip chip-on">{textCategory}</span>
                <span className="chip chip-cyan">{textVibe}</span>
                {textAudience.slice(0, 2).map((a) => (
                  <span key={a} className="chip">
                    {a}
                  </span>
                ))}
              </div>

              <Meter label="Luxury signal" value={luxuryScore} tone="var(--amber)" />
              <Meter label="Viral potential" value={viralScore} tone="var(--coral)" />
              <Meter label="Confidence" value={confidence} tone="var(--mint)" />

              {textKeywords.length > 0 && (
                <div>
                  <div className="kicker mb-2">KEYWORDS</div>
                  <div className="flex flex-wrap gap-1.5">
                    {textKeywords.slice(0, 8).map((k) => (
                      <span key={k} className="chip">
                        {k}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* ---------- Image intelligence ---------- */}
          <div className="panel p-6">
            <div className="kicker mb-4">IMAGE INTELLIGENCE</div>
            <div className="space-y-5">
              <div className="frame aspect-video scan">
                {bestImageUrl ? (
                  <img src={bestImageUrl} alt="best product" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center" style={{ background: 'var(--ink-3)' }}>
                    <Icon name="film" size={24} className="opacity-40" />
                  </div>
                )}
                <div className="veil" />
                <div className="absolute bottom-2 left-2.5 chip chip-mint">BEST IMAGE</div>
              </div>

              {dominantColors.length > 0 && (
                <div>
                  <div className="kicker mb-2">DOMINANT COLORS</div>
                  <div className="flex gap-2">
                    {dominantColors.slice(0, 5).map((c) => (
                      <div key={c} className="text-center">
                        <div className="w-9 h-9 rounded-md border transition-transform hover:scale-110" style={{ background: c, borderColor: 'var(--line-strong)' }} title={c} />
                        <div className="t-mono text-[8.5px] mt-1" style={{ color: 'var(--faint)' }}>
                          {c}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="flex flex-wrap gap-2">
                {overallRec.needsBackgroundRemoval && <span className="chip chip-amber">REMOVE BG</span>}
                {overallRec.needsEnhancement && <span className="chip chip-amber">ENHANCE</span>}
                {overallRec.needsAdditionalImages && <span className="chip chip-coral">ADD MORE IMAGES</span>}
                {!overallRec.needsBackgroundRemoval && !overallRec.needsEnhancement && <span className="chip chip-mint">CLEAN ASSETS</span>}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};