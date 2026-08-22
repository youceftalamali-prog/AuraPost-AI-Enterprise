import { useEffect, useMemo, useState, type FormEvent } from "react";
import { BarChart3, Bot, Clock3, Globe2, Search } from "lucide-react";
import type { NormalizedProduct } from "../../types";
import type { AgentLocale } from "../agent-shell/types";
import {
  formatActivityTime,
  marketAnalysisToEntry,
  sortActivityEntries,
  type ActivityLogEntry,
  type RawMarketAnalysis,
} from "../activity-log/activityLog";

interface Props {
  workspaceId: string;
  selectedProductIdFromCatalog?: string;
  onAddAuditLog: (action: string, details: string) => void;
  onJumpToAgent?: (entry: ActivityLogEntry) => void;
}

const messages = {
  ar: {
    title: "تحليل المنتج والسوق مع Aura",
    intro: "يجري Aura تحليل السوق داخل المحادثة ببيانات حيّة قابلة للتحقق. اطلق تحليلاً جديداً، وستجد هنا سجل طلباتك لمتابعتها مع الوكيل.",
    product: "المنتج (اختياري)",
    keyword: "السوق أو المنتج المراد تحليله",
    country: "السوق المستهدف",
    run: "حلّل عبر الوكيل",
    history: "سجل التحليلات",
    empty: "لا توجد تحليلات بعد. ابدأ أول تحليل عبر الوكيل.",
    resume: "تابع في الوكيل",
  },
  fr: {
    title: "Analyse produit et marché avec Aura",
    intro: "Aura réalise l’analyse de marché dans la conversation, avec des données vérifiables en direct. Lancez une nouvelle analyse ; retrouvez ici l’historique de vos demandes pour les reprendre avec l’agent.",
    product: "Produit (optionnel)",
    keyword: "Marché ou produit à analyser",
    country: "Marché cible",
    run: "Analyser via l’agent",
    history: "Historique des analyses",
    empty: "Aucune analyse pour le moment. Lancez la première via l’agent.",
    resume: "Continuer dans l’agent",
  },
  en: {
    title: "Product and market analysis with Aura",
    intro: "Aura runs market analysis inside the chat with verifiable live data. Launch a new analysis; your requests are logged here so you can resume them with the agent.",
    product: "Product (optional)",
    keyword: "Market or product to analyze",
    country: "Target market",
    run: "Analyze via the agent",
    history: "Analysis history",
    empty: "No analyses yet. Start your first one through the agent.",
    resume: "Continue in agent",
  },
} satisfies Record<AgentLocale, Record<string, string>>;

const countries = ["Algeria", "France", "United States", "United Kingdom", "Canada", "United Arab Emirates", "Saudi Arabia"];

function localeNow(): AgentLocale {
  const value = document.documentElement.lang;
  return value === "fr" || value === "en" ? value : "ar";
}

async function json<T>(response: Response): Promise<T> {
  const body: unknown = await response.json();
  if (!response.ok) {
    const error = typeof body === "object" && body && "error" in body ? String((body as { error: unknown }).error) : "Request failed";
    throw new Error(error);
  }
  return body as T;
}

function logKey(workspaceId: string): string {
  return `aura:analysis-log:${workspaceId}`;
}

function readLog(workspaceId: string): RawMarketAnalysis[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(logKey(workspaceId));
    if (!raw) return [];
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((item): item is RawMarketAnalysis =>
      typeof item === "object" && item !== null && typeof (item as { id?: unknown }).id === "string");
  } catch {
    return [];
  }
}

function writeLog(workspaceId: string, entries: RawMarketAnalysis[]): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(logKey(workspaceId), JSON.stringify(entries.slice(0, 50)));
  } catch {
    /* ignore quota/serialization errors */
  }
}

export default function ProductMarketIntelligence({ workspaceId, selectedProductIdFromCatalog, onAddAuditLog, onJumpToAgent }: Props) {
  const [locale, setLocale] = useState<AgentLocale>(localeNow);
  const t = messages[locale];
  const rtl = locale === "ar";
  const [products, setProducts] = useState<NormalizedProduct[]>([]);
  const [productId, setProductId] = useState(selectedProductIdFromCatalog || "");
  const [keyword, setKeyword] = useState("");
  const [country, setCountry] = useState("Algeria");
  const [log, setLog] = useState<RawMarketAnalysis[]>([]);
  const product = useMemo(() => products.find((item) => item.id === productId), [products, productId]);

  useEffect(() => {
    const observer = new MutationObserver(() => setLocale(localeNow()));
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ["lang"] });
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    setLog(readLog(workspaceId));
  }, [workspaceId]);

  useEffect(() => {
    const controller = new AbortController();
    fetch(`/api/products?workspaceId=${encodeURIComponent(workspaceId)}`, { signal: controller.signal })
      .then((response) => json<NormalizedProduct[]>(response))
      .then((items) => {
        setProducts(items);
        setProductId(selectedProductIdFromCatalog || items[0]?.id || "");
      })
      .catch(() => {
        /* product list is only used to prefill the query */
      });
    return () => controller.abort();
  }, [workspaceId, selectedProductIdFromCatalog]);

  useEffect(() => {
    if (product?.title) setKeyword(product.title);
  }, [product]);

  const entries = useMemo(() => sortActivityEntries(log.map(marketAnalysisToEntry)), [log]);

  const launch = (event: FormEvent) => {
    event.preventDefault();
    const term = keyword.trim();
    if (!term) return;
    const raw: RawMarketAnalysis = {
      id: (typeof crypto !== "undefined" && "randomUUID" in crypto) ? crypto.randomUUID() : `analysis-${Date.now()}`,
      query: term,
      region: country,
      status: "pending",
      productId: productId || undefined,
      createdAt: new Date().toISOString(),
    };
    const next = [raw, ...log].slice(0, 50);
    setLog(next);
    writeLog(workspaceId, next);
    onAddAuditLog("agent.market_intelligence_request", `Aura launched market analysis for ${term} in ${country}.`);
    onJumpToAgent?.(marketAnalysisToEntry(raw));
  };

  const resume = (entry: ActivityLogEntry) => {
    onAddAuditLog("agent.market_intelligence_resume", `Aura resumed market analysis: ${entry.title}.`);
    onJumpToAgent?.(entry);
  };

  return (
    <div dir={rtl ? "rtl" : "ltr"} className="space-y-6 rounded-3xl border border-white/10 bg-[#11131d] p-5 sm:p-7">
      <div className="flex items-start gap-3"><span className="rounded-xl bg-indigo-500/15 p-3"><BarChart3 className="h-6 w-6 text-indigo-300" /></span><div><h2 className="text-xl font-bold text-white">{t.title}</h2><p className="mt-1 max-w-3xl text-sm leading-6 text-slate-400">{t.intro}</p></div></div>

      <form onSubmit={launch} className="grid gap-3 rounded-2xl border border-white/10 bg-black/20 p-4 md:grid-cols-12">
        <label className="md:col-span-4"><span className="mb-1 block text-xs text-slate-400">{t.product}</span><select value={productId} onChange={(event) => setProductId(event.target.value)} className="w-full rounded-xl border border-white/10 bg-slate-950 px-3 py-2.5 text-sm text-white"><option value="">—</option>{products.map((item) => <option key={item.id} value={item.id}>{item.title}</option>)}</select></label>
        <label className="md:col-span-4"><span className="mb-1 block text-xs text-slate-400">{t.keyword}</span><input value={keyword} onChange={(event) => setKeyword(event.target.value)} maxLength={200} className="w-full rounded-xl border border-white/10 bg-slate-950 px-3 py-2.5 text-sm text-white" /></label>
        <label className="md:col-span-2"><span className="mb-1 block text-xs text-slate-400">{t.country}</span><select value={country} onChange={(event) => setCountry(event.target.value)} className="w-full rounded-xl border border-white/10 bg-slate-950 px-3 py-2.5 text-sm text-white">{countries.map((item) => <option key={item}>{item}</option>)}</select></label>
        <button type="submit" disabled={!keyword.trim()} className="mt-5 inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-indigo-500 to-emerald-500 px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-50 md:col-span-2"><Search className="h-4 w-4" />{t.run}</button>
      </form>

      <section className="space-y-3"><h3 className="flex items-center gap-2 text-sm font-semibold text-white"><Clock3 className="h-4 w-4 text-indigo-300" />{t.history}</h3><div className="max-h-[480px] space-y-3 overflow-y-auto pr-1">{entries.length === 0 ? <div className="rounded-2xl border border-white/10 bg-black/20 p-8 text-center text-sm text-slate-500">{t.empty}</div> : entries.map((entry) => <article key={entry.id} className="space-y-2 rounded-2xl border border-white/10 bg-black/20 p-4"><div className="flex items-center justify-between gap-3"><strong className="truncate text-sm text-white">{entry.title || "—"}</strong><span className="shrink-0 text-[10px] text-slate-500">{formatActivityTime(entry.createdAt, locale)}</span></div>{entry.detail && <p className="flex items-center gap-1 text-xs text-slate-400"><Globe2 className="h-3 w-3 text-purple-300" />{entry.detail}</p>}{onJumpToAgent && <button type="button" onClick={() => resume(entry)} className="flex w-full items-center justify-center gap-1 rounded-lg border border-indigo-400/20 bg-indigo-400/10 px-2 py-1.5 text-[11px] text-indigo-200 transition hover:bg-indigo-400/20"><Bot className="h-3 w-3" />{t.resume}</button>}</article>)}</div></section>
    </div>
  );
}
