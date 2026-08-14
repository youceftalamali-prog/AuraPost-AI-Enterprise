import { useEffect, useMemo, useState, type FormEvent } from 'react';
import { AlertCircle, BarChart3, Globe2, LoaderCircle, Search, ShieldCheck, Store, TrendingUp } from 'lucide-react';
import type { NormalizedProduct } from '../../types';

type Locale = 'ar' | 'fr' | 'en';
type MarketResult = { success: boolean; liveDataAvailable: boolean; message?: string; keyword?: string; search_volume?: number; cpc?: number; competition?: number; keyword_difficulty?: number | null; opportunity_score?: number; search_volume_trends?: Array<{ month: string; volume: number }>; source?: string };
type OpportunityResult = { success: boolean; liveDataAvailable: boolean; opportunityScore?: number; demandScore?: number; competitionScore?: number; commercialIntentScore?: number; trendScore?: number; opportunityLevel?: string; confidence?: string; note?: string; message?: string };
type Competitor = { name: string; platform: string; price: number | null; rating: number | null; reviewsCount: number | null; productLink: string };
type CompetitorResult = { liveDataAvailable: boolean; competitors: Competitor[]; averagePrice?: number | null; message?: string };
type TrendResult = { liveDataAvailable: boolean; trendingProducts: Array<{ name: string; type: string }>; countriesHighDemand: Array<{ country: string; value: number }>; message?: string };

interface Props { workspaceId: string; selectedProductIdFromCatalog?: string; onAddAuditLog: (action: string, details: string) => void }
const messages = {
  ar: { title: 'تحليل المنتج والسوق مع Aura', intro: 'يعرض Aura بيانات حية قابلة للتحقق فقط. لن يتم اختراع أرقام أو أرباح عند غياب المصدر.', product: 'المنتج', keyword: 'كلمة البحث', country: 'السوق المستهدف', run: 'حلّل السوق', loading: 'يجمع Aura الأدلة الحية…', noData: 'لا توجد بيانات حية كافية. أضف بيانات DataForSEO من الإعدادات أو جرّب عبارة أخرى.', volume: 'حجم البحث', cpc: 'تكلفة النقرة', competition: 'مخاطر المنافسة', opportunity: 'فرصة السوق', competitors: 'المنافسون الموثقون', trends: 'العبارات والأسواق الصاعدة', evidence: 'مصدر البيانات', configure: 'لا تُعرض تقديرات مصطنعة.' },
  fr: { title: 'Analyse produit et marché avec Aura', intro: 'Aura affiche uniquement des données vérifiables en direct. Aucun chiffre ni profit ne sera inventé.', product: 'Produit', keyword: 'Mot-clé', country: 'Marché cible', run: 'Analyser le marché', loading: 'Aura collecte les preuves en direct…', noData: 'Données en direct insuffisantes. Configurez DataForSEO ou essayez une autre requête.', volume: 'Volume de recherche', cpc: 'CPC', competition: 'Risque concurrentiel', opportunity: 'Opportunité', competitors: 'Concurrents vérifiés', trends: 'Requêtes et marchés en hausse', evidence: 'Source', configure: 'Aucune estimation synthétique.' },
  en: { title: 'Product and market analysis with Aura', intro: 'Aura shows verifiable live evidence only. It will not invent numbers or profitability when a source is unavailable.', product: 'Product', keyword: 'Search keyword', country: 'Target market', run: 'Analyze market', loading: 'Aura is collecting live evidence…', noData: 'Not enough live data. Configure DataForSEO or try another query.', volume: 'Search volume', cpc: 'CPC', competition: 'Competition risk', opportunity: 'Market opportunity', competitors: 'Verified competitors', trends: 'Rising queries and markets', evidence: 'Data source', configure: 'No synthetic estimates are displayed.' },
};
const countries = ['Algeria', 'France', 'United States', 'United Kingdom', 'Canada', 'United Arab Emirates', 'Saudi Arabia'];
function localeNow(): Locale { const value = document.documentElement.lang; return value === 'fr' || value === 'en' ? value : 'ar'; }
async function json<T>(response: Response): Promise<T> { const body: unknown = await response.json(); if (!response.ok) { const error = typeof body === 'object' && body && 'error' in body ? String((body as { error: unknown }).error) : 'Request failed'; throw new Error(error); } return body as T; }

export default function ProductMarketIntelligence({ workspaceId, selectedProductIdFromCatalog, onAddAuditLog }: Props) {
  const locale = localeNow(); const t = messages[locale]; const rtl = locale === 'ar';
  const [products, setProducts] = useState<NormalizedProduct[]>([]);
  const [productId, setProductId] = useState(selectedProductIdFromCatalog || '');
  const [keyword, setKeyword] = useState(''); const [country, setCountry] = useState('Algeria');
  const [loading, setLoading] = useState(false); const [error, setError] = useState<string | null>(null);
  const [market, setMarket] = useState<MarketResult | null>(null); const [opportunity, setOpportunity] = useState<OpportunityResult | null>(null);
  const [competitors, setCompetitors] = useState<CompetitorResult | null>(null); const [trends, setTrends] = useState<TrendResult | null>(null);
  const product = useMemo(() => products.find((item) => item.id === productId), [products, productId]);

  useEffect(() => { const controller = new AbortController(); fetch(`/api/products?workspaceId=${encodeURIComponent(workspaceId)}`, { signal: controller.signal }).then((response) => json<NormalizedProduct[]>(response)).then((items) => { setProducts(items); const next = selectedProductIdFromCatalog || items[0]?.id || ''; setProductId(next); }).catch((reason: unknown) => { if (!(reason instanceof DOMException && reason.name === 'AbortError')) setError(reason instanceof Error ? reason.message : String(reason)); }); return () => controller.abort(); }, [workspaceId, selectedProductIdFromCatalog]);
  useEffect(() => { if (product?.title) setKeyword(product.title); }, [product]);

  const analyze = async (event: FormEvent) => {
    event.preventDefault(); const term = keyword.trim(); if (!term) return;
    setLoading(true); setError(null); setMarket(null); setOpportunity(null); setCompetitors(null); setTrends(null);
    const language = locale === 'ar' ? 'Arabic' : locale === 'fr' ? 'French' : 'English';
    const post = (path: string, payload: object) => fetch(path, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
    try {
      const outcomes = await Promise.allSettled([
        post('/api/market-intelligence/analyze', { workspaceId, keyword: term, country, language }).then((response) => json<MarketResult>(response)),
        post('/api/market-intelligence/opportunity', { workspaceId, productName: term }).then((response) => json<OpportunityResult>(response)),
        post('/api/market-intelligence/competitors', { workspaceId, productName: term }).then((response) => json<CompetitorResult>(response)),
        fetch(`/api/market-intelligence/trends?workspaceId=${encodeURIComponent(workspaceId)}&productName=${encodeURIComponent(term)}`).then((response) => json<TrendResult>(response)),
      ]);
      if (outcomes[0].status === 'fulfilled') setMarket(outcomes[0].value);
      if (outcomes[1].status === 'fulfilled') setOpportunity(outcomes[1].value);
      if (outcomes[2].status === 'fulfilled') setCompetitors(outcomes[2].value);
      if (outcomes[3].status === 'fulfilled') setTrends(outcomes[3].value);
      if (outcomes.every((outcome) => outcome.status === 'rejected')) throw new Error(t.noData);
      onAddAuditLog('agent.market_intelligence', `Aura analyzed live market evidence for ${term} in ${country}.`);
    } catch (reason: unknown) { setError(reason instanceof Error ? reason.message : String(reason)); }
    finally { setLoading(false); }
  };

  const hasLive = market?.liveDataAvailable || opportunity?.liveDataAvailable || competitors?.liveDataAvailable || trends?.liveDataAvailable;
  return <div dir={rtl ? 'rtl' : 'ltr'} className="space-y-6 rounded-3xl border border-white/10 bg-[#11131d] p-5 sm:p-7">
    <div className="flex items-start gap-3"><span className="rounded-xl bg-indigo-500/15 p-3"><BarChart3 className="h-6 w-6 text-indigo-300" /></span><div><h2 className="text-xl font-bold text-white">{t.title}</h2><p className="mt-1 max-w-3xl text-sm leading-6 text-slate-400">{t.intro}</p></div></div>
    <form onSubmit={analyze} className="grid gap-3 rounded-2xl border border-white/10 bg-black/20 p-4 md:grid-cols-12">
      <label className="md:col-span-4"><span className="mb-1 block text-xs text-slate-400">{t.product}</span><select value={productId} onChange={(event) => setProductId(event.target.value)} className="w-full rounded-xl border border-white/10 bg-slate-950 px-3 py-2.5 text-sm text-white">{products.map((item) => <option key={item.id} value={item.id}>{item.title}</option>)}</select></label>
      <label className="md:col-span-4"><span className="mb-1 block text-xs text-slate-400">{t.keyword}</span><input value={keyword} onChange={(event) => setKeyword(event.target.value)} maxLength={200} className="w-full rounded-xl border border-white/10 bg-slate-950 px-3 py-2.5 text-sm text-white" /></label>
      <label className="md:col-span-2"><span className="mb-1 block text-xs text-slate-400">{t.country}</span><select value={country} onChange={(event) => setCountry(event.target.value)} className="w-full rounded-xl border border-white/10 bg-slate-950 px-3 py-2.5 text-sm text-white">{countries.map((item) => <option key={item}>{item}</option>)}</select></label>
      <button disabled={loading || !keyword.trim()} className="mt-5 inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-indigo-500 to-emerald-500 px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-50 md:col-span-2">{loading ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}{loading ? t.loading : t.run}</button>
    </form>
    {error && <div className="flex gap-2 rounded-xl border border-rose-400/20 bg-rose-400/10 p-3 text-sm text-rose-200"><AlertCircle className="h-4 w-4" />{error}</div>}
    {!loading && (market || opportunity || competitors || trends) && !hasLive && <div className="rounded-2xl border border-amber-400/20 bg-amber-400/10 p-6 text-center"><ShieldCheck className="mx-auto h-7 w-7 text-amber-300" /><p className="mt-2 text-sm text-amber-100">{market?.message || t.noData}</p><p className="mt-1 text-xs text-amber-200/70">{t.configure}</p></div>}
    {hasLive && <div className="space-y-5">
      {market?.liveDataAvailable && <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">{[[t.volume, market.search_volume?.toLocaleString()], [t.cpc, market.cpc === undefined ? undefined : `$${market.cpc.toFixed(2)}`], [t.competition, opportunity?.competitionScore === undefined ? undefined : `${opportunity.competitionScore}%`], [t.opportunity, market.opportunity_score === undefined ? undefined : `${market.opportunity_score}%`]].map(([label, value]) => <div key={label} className="rounded-2xl border border-white/10 bg-black/20 p-4"><p className="text-xs text-slate-500">{label}</p><p className="mt-2 text-2xl font-bold text-white">{value || '—'}</p></div>)}</section>}
      {opportunity?.liveDataAvailable && <section className="rounded-2xl border border-emerald-400/20 bg-emerald-400/5 p-5"><div className="flex items-center gap-2 text-emerald-300"><TrendingUp className="h-5 w-5" /><strong>{opportunity.opportunityLevel} · {opportunity.confidence}</strong></div><p className="mt-2 text-sm text-slate-300">{opportunity.note}</p></section>}
      {competitors?.liveDataAvailable && <section><h3 className="mb-3 flex items-center gap-2 font-semibold text-white"><Store className="h-5 w-5 text-blue-300" />{t.competitors}</h3><div className="grid gap-3 md:grid-cols-2">{competitors.competitors.slice(0, 8).map((item) => <a key={item.productLink} href={item.productLink} target="_blank" rel="noreferrer" className="rounded-xl border border-white/10 bg-black/20 p-4 transition hover:border-indigo-400/40"><p className="line-clamp-2 text-sm font-medium text-white">{item.name}</p><p className="mt-2 text-xs text-slate-400">{item.platform} · {item.price === null ? '—' : `$${item.price.toFixed(2)}`}</p></a>)}</div></section>}
      {trends?.liveDataAvailable && <section><h3 className="mb-3 flex items-center gap-2 font-semibold text-white"><Globe2 className="h-5 w-5 text-purple-300" />{t.trends}</h3><div className="flex flex-wrap gap-2">{trends.trendingProducts.map((item) => <span key={item.name} className="rounded-full border border-purple-400/20 bg-purple-400/10 px-3 py-1.5 text-xs text-purple-200">{item.name}</span>)}{trends.countriesHighDemand.map((item) => <span key={item.country} className="rounded-full border border-blue-400/20 bg-blue-400/10 px-3 py-1.5 text-xs text-blue-200">{item.country} · {item.value}</span>)}</div></section>}
      <p className="text-xs text-slate-500">{t.evidence}: {market?.source || 'DataForSEO Live APIs'}</p>
    </div>}
  </div>;
}
