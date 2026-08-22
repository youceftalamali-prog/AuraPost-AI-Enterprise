import { useCallback, useEffect, useState } from "react";
import {
  Bot,
  CheckCircle2,
  Clock3,
  Download,
  ExternalLink,
  Loader2,
  XCircle,
} from "lucide-react";
import type { ImportOperation } from "../types.ts";
import type { AgentLocale } from "../features/agent-shell/types";
import { importOperationToEntry, type ActivityLogEntry } from "../features/activity-log/activityLog";

interface ProductImportProps {
  workspaceId: string;
  onAddAuditLog: (action: string, details: string) => void;
  onJumpToAgent?: (entry: ActivityLogEntry) => void;
  onStartImport?: () => void;
  onImportSuccess?: (productId: string) => void;
}

type JsonRecord = Record<string, unknown>;

const copy = {
  ar: {
    title: "سجل الاستيراد",
    subtitle: "يتولّى Aura الاستيراد داخل المحادثة. هنا سجل عملياتك السابقة؛ اضغط أي عملية لمتابعتها مع الوكيل.",
    newImport: "استيراد منتج جديد عبر الوكيل",
    history: "العمليات السابقة",
    empty: "لا توجد عمليات استيراد بعد. ابدأ أول استيراد عبر الوكيل.",
    charged: "الرصيد المخصوم",
    openInAgent: "تابع في الوكيل",
  },
  fr: {
    title: "Historique des imports",
    subtitle: "Aura gère l’import dans la conversation. Voici vos opérations passées ; cliquez sur l’une d’elles pour continuer avec l’agent.",
    newImport: "Importer un nouveau produit via l’agent",
    history: "Opérations précédentes",
    empty: "Aucun import pour le moment. Lancez le premier via l’agent.",
    charged: "Crédits débités",
    openInAgent: "Continuer dans l’agent",
  },
  en: {
    title: "Import history",
    subtitle: "Aura handles importing inside the chat. Here is the log of your past operations; click any one to continue with the agent.",
    newImport: "Import a new product via the agent",
    history: "Previous operations",
    empty: "No imports yet. Start your first import through the agent.",
    charged: "Credits charged",
    openInAgent: "Continue in agent",
  },
} satisfies Record<AgentLocale, Record<string, string>>;

function isRecord(value: unknown): value is JsonRecord {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

async function readJson(response: Response): Promise<unknown> {
  try {
    return await response.json();
  } catch {
    return null;
  }
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

function isImportOperation(value: unknown): value is ImportOperation {
  if (!isRecord(value)) return false;
  return typeof value.id === "string" && typeof value.sourceUrl === "string" &&
    (value.status === "pending" || value.status === "success" || value.status === "failed");
}

function currentLocale(): AgentLocale {
  const lang = document.documentElement.lang.toLowerCase();
  if (lang.startsWith("fr")) return "fr";
  if (lang.startsWith("en")) return "en";
  return "ar";
}

export default function ProductImport({ workspaceId, onAddAuditLog, onJumpToAgent, onStartImport }: ProductImportProps) {
  const [locale, setLocale] = useState<AgentLocale>(currentLocale);
  const [history, setHistory] = useState<ImportOperation[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(true);
  const text = copy[locale];

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

  const handleNewImport = () => {
    onAddAuditLog("product.import_via_agent", "Aura opened the chat to start a new import.");
    onStartImport?.();
  };

  return (
    <div dir={locale === "ar" ? "rtl" : "ltr"} className="space-y-6 rounded-3xl border border-white/10 bg-[#11131d] p-5 sm:p-7">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div><h2 className="flex items-center gap-2 text-xl font-semibold text-white"><Clock3 className="h-5 w-5 text-indigo-300" />{text.title}</h2><p className="mt-2 max-w-2xl text-sm text-slate-400">{text.subtitle}</p></div>
        {onStartImport && <button type="button" onClick={handleNewImport} className="flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-indigo-500 to-emerald-500 px-4 py-2.5 text-sm font-semibold text-white transition hover:brightness-110"><Download className="h-4 w-4" />{text.newImport}</button>}
      </header>

      <section className="space-y-3"><h3 className="flex items-center gap-2 text-sm font-semibold text-white"><Clock3 className="h-4 w-4 text-indigo-300" />{text.history}</h3><div className="max-h-[560px] space-y-3 overflow-y-auto pr-1">{loadingHistory ? <div className="flex justify-center py-12"><Loader2 className="h-5 w-5 animate-spin text-slate-500" /></div> : history.length === 0 ? <div className="rounded-2xl border border-white/10 bg-black/20 p-8 text-center text-sm text-slate-500">{text.empty}</div> : history.map((operation) => {
        const safeHref = normalizeBrowserUrl(operation.sourceUrl);
        return <article key={operation.id} className="space-y-2 rounded-2xl border border-white/10 bg-black/20 p-4"><div className="flex items-center justify-between gap-3"><strong className="text-xs text-slate-300">{operation.provider}</strong><span className={`flex items-center gap-1 rounded-full px-2 py-1 text-[10px] ${operation.status === "success" ? "bg-emerald-400/10 text-emerald-300" : operation.status === "failed" ? "bg-rose-400/10 text-rose-300" : "bg-indigo-400/10 text-indigo-300"}`}>{operation.status === "success" ? <CheckCircle2 className="h-3 w-3" /> : operation.status === "failed" ? <XCircle className="h-3 w-3" /> : <Loader2 className="h-3 w-3 animate-spin" />}{operation.status}</span></div>{safeHref ? <a href={safeHref} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 truncate text-xs text-indigo-300 hover:underline"><span className="truncate">{operation.sourceUrl}</span><ExternalLink className="h-3 w-3 shrink-0" /></a> : <p className="truncate text-xs text-slate-500">{operation.sourceUrl}</p>}<div className="flex justify-between border-t border-white/5 pt-2 text-[10px] text-slate-500"><span>{text.charged}: {operation.creditCharged || 0}</span><span>{operation.createdAt ? new Date(operation.createdAt).toLocaleDateString(locale) : ""}</span></div>{onJumpToAgent && <button type="button" onClick={() => onJumpToAgent(importOperationToEntry({ id: operation.id, sourceUrl: operation.sourceUrl, status: operation.status, provider: operation.provider, productId: operation.productId, createdAt: operation.createdAt }))} className="flex w-full items-center justify-center gap-1 rounded-lg border border-indigo-400/20 bg-indigo-400/10 px-2 py-1.5 text-[11px] text-indigo-200 transition hover:bg-indigo-400/20"><Bot className="h-3 w-3" />{text.openInAgent}</button>}</article>;
      })}</div></section>
    </div>
  );
}
