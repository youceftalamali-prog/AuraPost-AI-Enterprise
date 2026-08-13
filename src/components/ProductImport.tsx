import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  type FormEvent,
} from "react";
import {
  AlertCircle,
  CheckCircle2,
  Clock3,
  Download,
  ExternalLink,
  Link2,
  Loader2,
  ShieldCheck,
  XCircle,
} from "lucide-react";
import type { ImportOperation } from "../types.ts";
import type { AgentLocale } from "../features/agent-shell/types";
import { getAgentWorkflowHandoff } from "../features/agent-shell/handoff";

interface ProductImportProps {
  workspaceId: string;
  onAddAuditLog: (action: string, details: string) => void;
  onImportSuccess: (productId: string) => void;
}

type ImportPhase = "idle" | "queued" | "processing" | "success" | "failed";
type JsonRecord = Record<string, unknown>;

const POLL_INTERVAL_MS = 2_500;
const POLL_TIMEOUT_MS = 3 * 60 * 1_000;
const URL_PATTERN = /https?:\/\/[^\s]+/i;

const copy = {
  ar: {
    title: "استيراد المنتج مع Aura", subtitle: "ألصق رابط المنتج؛ سيتحقق Aura منه ثم يجلب بيانات حقيقية فقط.",
    newImport: "عملية استيراد جديدة", productUrl: "رابط المنتج", prompt: "تعليمات Aura الاختيارية",
    promptPlaceholder: "مثال: ركّز على اللون الأزرق والمقاسات المتاحة.", start: "تحقق وابدأ الاستيراد",
    working: "Aura يعالج المنتج…", provider: "المصدر المتوقع", secure: "الرابط يفحص على الخادم ضد الشبكات الخاصة قبل الجلب.",
    progress: "تقدم العملية", queued: "في قائمة الانتظار", processing: "استخراج البيانات الحقيقية", success: "اكتمل الاستيراد بنجاح.",
    history: "سجل الاستيراد", empty: "لا توجد عمليات سابقة.", charged: "الرصيد المخصوم", attempts: "المحاولات",
    invalidUrl: "أدخل رابط HTTP أو HTTPS صالحاً.", timeout: "توقفت المتابعة بعد ثلاث دقائق. تحقق من السجل قبل إعادة المحاولة.",
    missingOperation: "لم يعُد الخادم بمعرّف العملية.", genericError: "تعذر بدء الاستيراد.", unsupported: "غير معروف حتى يتم التحقق",
  },
  fr: {
    title: "Importer avec Aura", subtitle: "Collez le lien du produit. Aura le vérifie et n’importe que des données réelles.",
    newImport: "Nouvel import", productUrl: "Lien du produit", prompt: "Instructions Aura facultatives",
    promptPlaceholder: "Exemple : privilégier la variante bleue et les tailles disponibles.", start: "Vérifier et importer",
    working: "Aura traite le produit…", provider: "Source détectée", secure: "Le serveur bloque les réseaux privés avant toute récupération.",
    progress: "Progression", queued: "En file d’attente", processing: "Extraction des données réelles", success: "Import terminé avec succès.",
    history: "Historique", empty: "Aucune opération précédente.", charged: "Crédits débités", attempts: "Tentatives",
    invalidUrl: "Saisissez une URL HTTP ou HTTPS valide.", timeout: "Le suivi a expiré après trois minutes. Vérifiez l’historique avant de réessayer.",
    missingOperation: "Le serveur n’a pas renvoyé d’identifiant d’opération.", genericError: "Impossible de démarrer l’import.", unsupported: "Inconnue avant vérification",
  },
  en: {
    title: "Import product with Aura", subtitle: "Paste a product link. Aura verifies it and imports real product data only.",
    newImport: "New import", productUrl: "Product URL", prompt: "Optional Aura instructions",
    promptPlaceholder: "Example: focus on the blue variant and available sizes.", start: "Verify and start import",
    working: "Aura is processing the product…", provider: "Detected source", secure: "The server blocks private networks before fetching the link.",
    progress: "Operation progress", queued: "Queued", processing: "Extracting real product data", success: "Product imported successfully.",
    history: "Import history", empty: "No previous operations.", charged: "Credits charged", attempts: "Attempts",
    invalidUrl: "Enter a valid HTTP or HTTPS product URL.", timeout: "Tracking stopped after three minutes. Check history before retrying.",
    missingOperation: "The server did not return an operation identifier.", genericError: "The import could not be started.", unsupported: "Unknown until verified",
  },
} satisfies Record<AgentLocale, Record<string, string>>;

function isRecord(value: unknown): value is JsonRecord {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function stringValue(record: JsonRecord, key: string): string | undefined {
  return typeof record[key] === "string" ? record[key] : undefined;
}

async function readJson(response: Response): Promise<unknown> {
  try {
    return await response.json();
  } catch {
    return null;
  }
}

function getErrorMessage(payload: unknown, fallback: string): string {
  if (!isRecord(payload)) return fallback;
  return stringValue(payload, "error") || stringValue(payload, "message") || fallback;
}

function normalizeBrowserUrl(input: string): string | null {
  try {
    const parsed = new URL(input.trim());
    if (parsed.protocol !== "http:" && parsed.protocol !== "https:") return null;
    if (parsed.username || parsed.password) return null;
    if (parsed.port && parsed.port !== "80" && parsed.port !== "443") return null;
    const hostname = parsed.hostname.toLowerCase().replace(/^\[/, "").replace(/\]$/, "");
    if (hostname === "localhost" || hostname.endsWith(".local") || hostname.endsWith(".internal")) return null;
    parsed.hash = "";
    return parsed.toString();
  } catch {
    return null;
  }
}

function providerFor(url: string): string {
  const value = url.toLowerCase();
  if (value.includes("shopify") || value.includes("/products/")) return "Shopify";
  if (value.includes("amazon.") || value.includes("amzn.to")) return "Amazon";
  if (value.includes("aliexpress.")) return "AliExpress";
  if (value.includes("alibaba.")) return "Alibaba";
  if (value.includes("ebay.")) return "eBay";
  if (value.includes("woocommerce") || value.includes("/product/")) return "WooCommerce";
  return "";
}

function isImportOperation(value: unknown): value is ImportOperation {
  if (!isRecord(value)) return false;
  return typeof value.id === "string" && typeof value.sourceUrl === "string" &&
    (value.status === "pending" || value.status === "success" || value.status === "failed");
}

function initialHandoff(): { url: string; prompt: string } {
  const handoff = getAgentWorkflowHandoff();
  if (!handoff || handoff.mode !== "url") return { url: "", prompt: "" };
  const matchedUrl = handoff.prompt.match(URL_PATTERN)?.[0] || "";
  return {
    url: matchedUrl,
    prompt: matchedUrl ? handoff.prompt.replace(matchedUrl, "").trim() : handoff.prompt,
  };
}

function currentLocale(): AgentLocale {
  const lang = document.documentElement.lang.toLowerCase();
  if (lang.startsWith("fr")) return "fr";
  if (lang.startsWith("en")) return "en";
  return "ar";
}

export default function ProductImport({ workspaceId, onAddAuditLog, onImportSuccess }: ProductImportProps) {
  const seed = useMemo(initialHandoff, []);
  const [locale, setLocale] = useState<AgentLocale>(currentLocale);
  const [url, setUrl] = useState(seed.url);
  const [customPrompt, setCustomPrompt] = useState(seed.prompt);
  const [phase, setPhase] = useState<ImportPhase>("idle");
  const [activeOpId, setActiveOpId] = useState<string | null>(null);
  const [status, setStatus] = useState<JsonRecord | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [history, setHistory] = useState<ImportOperation[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(true);
  const text = copy[locale];
  const importing = phase === "queued" || phase === "processing";

  useEffect(() => {
    const observer = new MutationObserver(() => setLocale(currentLocale()));
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ["lang"] });
    return () => observer.disconnect();
  }, []);

  const fetchHistory = useCallback(async (signal?: AbortSignal) => {
    setLoadingHistory(true);
    const query = new URLSearchParams({ workspaceId });
    try {
      const response = await fetch(`/api/operations?${query.toString()}`, {
        credentials: "same-origin",
        headers: { Accept: "application/json" },
        signal,
      });
      const payload = await readJson(response);
      if (response.ok && Array.isArray(payload)) setHistory(payload.filter(isImportOperation));
    } finally {
      if (!signal?.aborted) setLoadingHistory(false);
    }
  }, [workspaceId]);

  useEffect(() => {
    const controller = new AbortController();
    void fetchHistory(controller.signal);
    return () => controller.abort();
  }, [fetchHistory]);

  useEffect(() => {
    if (!activeOpId) return;
    const controller = new AbortController();
    const startedAt = Date.now();
    let timer: ReturnType<typeof setTimeout> | undefined;

    const poll = async () => {
      if (Date.now() - startedAt >= POLL_TIMEOUT_MS) {
        setPhase("failed"); setError(text.timeout); setActiveOpId(null); return;
      }
      try {
        const query = new URLSearchParams({ workspaceId });
        const response = await fetch(`/api/import/status/${encodeURIComponent(activeOpId)}?${query.toString()}`, {
          credentials: "same-origin", headers: { Accept: "application/json" }, signal: controller.signal,
        });
        const payload = await readJson(response);
        if (!response.ok) throw new Error(getErrorMessage(payload, text.genericError));
        if (!isRecord(payload)) throw new Error(text.genericError);
        setStatus(payload);
        const nextStatus = stringValue(payload, "status");
        if (nextStatus === "success") {
          const product = isRecord(payload.product) ? payload.product : null;
          const productId = product ? stringValue(product, "id") || "" : "";
          setPhase("success"); setSuccessMessage(text.success); setActiveOpId(null);
          setUrl(""); setCustomPrompt("");
          onAddAuditLog("product.import_success", "Aura completed a verified product import.");
          await fetchHistory();
          onImportSuccess(productId);
          return;
        }
        if (nextStatus === "failed") {
          const message = stringValue(payload, "errorMessage") || text.genericError;
          setPhase("failed"); setError(message); setActiveOpId(null);
          onAddAuditLog("product.import_failed", message);
          await fetchHistory();
          return;
        }
        setPhase("processing");
        timer = setTimeout(() => void poll(), POLL_INTERVAL_MS);
      } catch (pollError) {
        if (controller.signal.aborted) return;
        setPhase("failed");
        setError(pollError instanceof Error ? pollError.message : text.genericError);
        setActiveOpId(null);
      }
    };

    void poll();
    return () => { controller.abort(); if (timer) clearTimeout(timer); };
  }, [activeOpId, fetchHistory, onAddAuditLog, onImportSuccess, text]);

  const startImport = async (event: FormEvent) => {
    event.preventDefault();
    const safeUrl = normalizeBrowserUrl(url);
    if (!safeUrl) { setError(text.invalidUrl); return; }

    setPhase("queued"); setError(null); setSuccessMessage(null); setStatus(null);
    try {
      const response = await fetch("/api/import", {
        method: "POST", credentials: "same-origin",
        headers: { "Content-Type": "application/json", Accept: "application/json" },
        body: JSON.stringify({ url: safeUrl, workspaceId, customPrompt: customPrompt.trim() || undefined }),
      });
      const payload = await readJson(response);
      if (!response.ok) throw new Error(getErrorMessage(payload, text.genericError));
      if (!isRecord(payload)) throw new Error(text.missingOperation);
      const operation = isRecord(payload.operation) ? payload.operation : null;
      const operationId = stringValue(payload, "operationId") || (operation ? stringValue(operation, "id") : undefined);
      if (!operationId) throw new Error(text.missingOperation);
      setActiveOpId(operationId);
      onAddAuditLog("product.import_start", `Aura started a verified import with ${providerFor(safeUrl) || "a supported provider"}.`);
      await fetchHistory();
    } catch (startError) {
      setPhase("failed");
      setError(startError instanceof Error ? startError.message : text.genericError);
    }
  };

  const progress = phase === "queued" ? 25 : phase === "processing" ? 70 : phase === "success" || phase === "failed" ? 100 : 0;
  const provider = providerFor(url) || text.unsupported;

  return (
    <div dir={locale === "ar" ? "rtl" : "ltr"} className="space-y-6 rounded-3xl border border-white/10 bg-[#11131d] p-5 sm:p-7">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div><h2 className="flex items-center gap-2 text-xl font-semibold text-white"><Download className="h-5 w-5 text-emerald-300" />{text.title}</h2><p className="mt-2 max-w-2xl text-sm text-slate-400">{text.subtitle}</p></div>
        <div className="flex items-center gap-2 rounded-xl border border-emerald-400/20 bg-emerald-400/10 px-3 py-2 text-xs text-emerald-200"><ShieldCheck className="h-4 w-4" />{text.secure}</div>
      </header>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1.35fr)_minmax(320px,0.65fr)]">
        <div className="space-y-5">
          <form onSubmit={startImport} className="space-y-5 rounded-2xl border border-white/10 bg-black/20 p-5">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-indigo-300">{text.newImport}</p>
            <label className="block space-y-2"><span className="text-sm font-medium text-slate-200">{text.productUrl}</span><div className="relative"><Link2 className="absolute left-3 top-3 h-4 w-4 text-slate-500" /><input type="url" required value={url} onChange={(event) => setUrl(event.target.value)} disabled={importing} placeholder="https://store.example/products/product-name" className="w-full rounded-xl border border-white/10 bg-[#0b0d14] py-2.5 pl-10 pr-3 text-sm text-white outline-none transition focus:border-indigo-400/60 disabled:opacity-50" /></div></label>
            <div className="flex items-center justify-between rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2 text-xs"><span className="text-slate-400">{text.provider}</span><strong className="text-emerald-300">{provider}</strong></div>
            <label className="block space-y-2"><span className="flex items-center justify-between text-sm font-medium text-slate-200"><span>{text.prompt}</span><span className="text-[10px] text-slate-500">{customPrompt.length}/1000</span></span><textarea value={customPrompt} onChange={(event) => setCustomPrompt(event.target.value)} maxLength={1000} disabled={importing} rows={3} placeholder={text.promptPlaceholder} className="w-full resize-none rounded-xl border border-white/10 bg-[#0b0d14] p-3 text-sm text-white outline-none transition focus:border-indigo-400/60 disabled:opacity-50" /></label>

            {error && <div role="alert" className="flex gap-2 rounded-xl border border-rose-400/20 bg-rose-400/10 p-3 text-sm text-rose-200"><AlertCircle className="mt-0.5 h-4 w-4 shrink-0" /><span>{error}</span></div>}
            {successMessage && <div className="flex gap-2 rounded-xl border border-emerald-400/20 bg-emerald-400/10 p-3 text-sm text-emerald-200"><CheckCircle2 className="h-4 w-4 shrink-0" /><span>{successMessage}</span></div>}

            <button type="submit" disabled={importing || !url.trim()} className="flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-indigo-500 to-emerald-500 px-4 py-3 text-sm font-semibold text-white transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-40">
              {importing ? <><Loader2 className="h-4 w-4 animate-spin" />{text.working}</> : <><Download className="h-4 w-4" />{text.start}</>}
            </button>
          </form>

          {importing && <section className="space-y-3 rounded-2xl border border-indigo-400/20 bg-indigo-400/10 p-5"><div className="flex items-center justify-between text-sm"><strong className="text-white">{text.progress}</strong><span className="text-indigo-200">{phase === "queued" ? text.queued : text.processing}</span></div><div className="h-2 overflow-hidden rounded-full bg-black/30"><div className="h-full rounded-full bg-gradient-to-r from-indigo-400 to-emerald-400 transition-all" style={{ width: `${progress}%` }} /></div><div className="flex items-center justify-between text-xs text-slate-400"><span>{stringValue(status || {}, "extractor") || provider}</span><span>{text.attempts}: {typeof status?.attemptCount === "number" ? status.attemptCount : 1}</span></div></section>}
        </div>

        <section className="space-y-3"><h3 className="flex items-center gap-2 text-sm font-semibold text-white"><Clock3 className="h-4 w-4 text-indigo-300" />{text.history}</h3><div className="max-h-[520px] space-y-3 overflow-y-auto pr-1">{loadingHistory ? <div className="flex justify-center py-12"><Loader2 className="h-5 w-5 animate-spin text-slate-500" /></div> : history.length === 0 ? <div className="rounded-2xl border border-white/10 bg-black/20 p-8 text-center text-sm text-slate-500">{text.empty}</div> : history.map((operation) => {
          const safeHref = normalizeBrowserUrl(operation.sourceUrl);
          return <article key={operation.id} className="space-y-2 rounded-2xl border border-white/10 bg-black/20 p-4"><div className="flex items-center justify-between gap-3"><strong className="text-xs text-slate-300">{operation.provider}</strong><span className={`flex items-center gap-1 rounded-full px-2 py-1 text-[10px] ${operation.status === "success" ? "bg-emerald-400/10 text-emerald-300" : operation.status === "failed" ? "bg-rose-400/10 text-rose-300" : "bg-indigo-400/10 text-indigo-300"}`}>{operation.status === "success" ? <CheckCircle2 className="h-3 w-3" /> : operation.status === "failed" ? <XCircle className="h-3 w-3" /> : <Loader2 className="h-3 w-3 animate-spin" />}{operation.status}</span></div>{safeHref ? <a href={safeHref} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 truncate text-xs text-indigo-300 hover:underline"><span className="truncate">{operation.sourceUrl}</span><ExternalLink className="h-3 w-3 shrink-0" /></a> : <p className="truncate text-xs text-slate-500">{operation.sourceUrl}</p>}<div className="flex justify-between border-t border-white/5 pt-2 text-[10px] text-slate-500"><span>{text.charged}: {operation.creditCharged || 0}</span><span>{operation.createdAt ? new Date(operation.createdAt).toLocaleDateString(locale) : ""}</span></div></article>;
        })}</div></section>
      </div>
    </div>
  );
}
