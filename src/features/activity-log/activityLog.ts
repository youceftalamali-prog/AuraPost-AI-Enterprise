// Activity Log core (Phase 4 — t164 / t165 / t166 foundation).
//
// Pure, framework-free domain logic shared by the Import log, the Analytics /
// Markets log, and the "jump into the agent" behaviour. In Phase 4 the Import
// and Analytics screens become read-only logs of past client operations, and
// clicking a row hands a localized seed prompt to the agent chat rectangle.
// Keeping this logic pure (no React, no DOM, no network) means it is unit
// tested in CI — the .tsx screens that consume it are not.
import type { AgentLocale, AgentSourceMode } from '../agent-shell/types';

export type ActivityKind = 'import' | 'analysis';
export type ActivityStatus = 'pending' | 'success' | 'failed';

export interface ActivityLogEntry {
  id: string;
  kind: ActivityKind;
  /** Primary label: product name, market query, or source URL. */
  title: string;
  /** Secondary label: provider, region, etc. */
  detail?: string;
  status: ActivityStatus;
  /** Epoch milliseconds; 0 when the timestamp is missing or unparseable. */
  createdAt: number;
  productId?: string;
  sourceUrl?: string;
  query?: string;
}

export interface RawImportOperation {
  id: string;
  sourceUrl: string;
  status: ActivityStatus | string;
  provider?: string;
  productId?: string;
  productName?: string;
  createdAt?: string | number | null;
}

export interface RawMarketAnalysis {
  id: string;
  query?: string;
  topic?: string;
  region?: string;
  status?: ActivityStatus | string;
  productId?: string;
  createdAt?: string | number | null;
}

export interface ActivityFilter {
  kind?: ActivityKind;
  status?: ActivityStatus;
  search?: string;
}

const VALID_STATUSES: readonly ActivityStatus[] = ['pending', 'success', 'failed'];

/** Coerce a timestamp of unknown shape into epoch ms, or 0 when unusable. */
export function toEpoch(value: string | number | null | undefined): number {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value === 'string') {
    const parsed = Date.parse(value);
    if (Number.isFinite(parsed)) return parsed;
  }
  return 0;
}

function normalizeStatus(value: unknown): ActivityStatus {
  return VALID_STATUSES.includes(value as ActivityStatus) ? (value as ActivityStatus) : 'pending';
}

export function importOperationToEntry(op: RawImportOperation): ActivityLogEntry {
  const title = (op.productName && op.productName.trim()) || op.sourceUrl;
  const entry: ActivityLogEntry = {
    id: op.id,
    kind: 'import',
    title,
    status: normalizeStatus(op.status),
    createdAt: toEpoch(op.createdAt),
    sourceUrl: op.sourceUrl,
  };
  if (op.provider && op.provider.trim()) entry.detail = op.provider.trim();
  if (op.productId) entry.productId = op.productId;
  return entry;
}

export function marketAnalysisToEntry(analysis: RawMarketAnalysis): ActivityLogEntry {
  const query =
    (analysis.query && analysis.query.trim()) || (analysis.topic && analysis.topic.trim()) || '';
  const entry: ActivityLogEntry = {
    id: analysis.id,
    kind: 'analysis',
    title: query,
    status: normalizeStatus(analysis.status),
    createdAt: toEpoch(analysis.createdAt),
  };
  if (query) entry.query = query;
  if (analysis.region && analysis.region.trim()) entry.detail = analysis.region.trim();
  if (analysis.productId) entry.productId = analysis.productId;
  return entry;
}

/** Newest first; stable for equal timestamps (preserves input order). */
export function sortActivityEntries(entries: readonly ActivityLogEntry[]): ActivityLogEntry[] {
  return entries
    .map((entry, index) => ({ entry, index }))
    .sort((a, b) => b.entry.createdAt - a.entry.createdAt || a.index - b.index)
    .map(({ entry }) => entry);
}

export function filterActivityEntries(
  entries: readonly ActivityLogEntry[],
  filter: ActivityFilter = {},
): ActivityLogEntry[] {
  const search = filter.search?.trim().toLowerCase();
  return entries.filter((entry) => {
    if (filter.kind && entry.kind !== filter.kind) return false;
    if (filter.status && entry.status !== filter.status) return false;
    if (search) {
      const haystack = `${entry.title} ${entry.detail ?? ''}`.toLowerCase();
      if (!haystack.includes(search)) return false;
    }
    return true;
  });
}

function resolveLocale(locale: string | undefined): AgentLocale {
  return locale === 'fr' || locale === 'en' ? locale : 'ar';
}

const RELATIVE: Record<
  AgentLocale,
  { now: string; minutes: (n: number) => string; hours: (n: number) => string; days: (n: number) => string }
> = {
  ar: {
    now: 'الآن',
    minutes: (n) => `منذ ${n} دقيقة`,
    hours: (n) => `منذ ${n} ساعة`,
    days: (n) => `منذ ${n} يوم`,
  },
  fr: {
    now: 'à l’instant',
    minutes: (n) => `il y a ${n} min`,
    hours: (n) => `il y a ${n} h`,
    days: (n) => `il y a ${n} j`,
  },
  en: {
    now: 'just now',
    minutes: (n) => `${n} min ago`,
    hours: (n) => `${n} h ago`,
    days: (n) => `${n} d ago`,
  },
};

const MINUTE = 60_000;
const HOUR = 60 * MINUTE;
const DAY = 24 * HOUR;

/** Localized relative time; falls back to an ISO date (YYYY-MM-DD) past a week. */
export function formatActivityTime(
  createdAt: number,
  locale: string | undefined,
  now: number = Date.now(),
): string {
  if (!Number.isFinite(createdAt) || createdAt <= 0) return '';
  const strings = RELATIVE[resolveLocale(locale)];
  const diff = now - createdAt;
  if (diff < MINUTE) return strings.now;
  if (diff < HOUR) return strings.minutes(Math.floor(diff / MINUTE));
  if (diff < DAY) return strings.hours(Math.floor(diff / HOUR));
  if (diff < 7 * DAY) return strings.days(Math.floor(diff / DAY));
  return new Date(createdAt).toISOString().slice(0, 10);
}

export interface AgentJumpSeed {
  mode: AgentSourceMode;
  prompt: string;
}

/**
 * Build the seed the agent chat should receive when a log row is clicked.
 * - analysis  -> description mode (resume the market analysis)
 * - import w/ productId -> saved_product mode (continue on the imported product)
 * - import w/o productId -> url mode (re-import then continue)
 */
export function buildAgentJumpSeed(entry: ActivityLogEntry, locale: string | undefined): AgentJumpSeed {
  const lang = resolveLocale(locale);
  if (entry.kind === 'analysis') {
    const label = entry.title || (lang === 'fr' ? 'ce marché' : lang === 'en' ? 'this market' : 'هذا السوق');
    return { mode: 'description', prompt: analysisPrompt(lang, label) };
  }
  if (entry.productId) {
    return { mode: 'saved_product', prompt: savedProductPrompt(lang, entry.title) };
  }
  const target = entry.sourceUrl || entry.title;
  return { mode: 'url', prompt: urlPrompt(lang, target) };
}

function savedProductPrompt(lang: AgentLocale, label: string): string {
  if (lang === 'fr') return `Continuer avec le produit importé : « ${label} ».`;
  if (lang === 'en') return `Continue working on the imported product: "${label}".`;
  return `تابع العمل على المنتج المستورد: «${label}».`;
}

function urlPrompt(lang: AgentLocale, target: string): string {
  if (lang === 'fr') return `Importer et travailler sur ce produit : ${target}`;
  if (lang === 'en') return `Import and work on this product: ${target}`;
  return `استورد وتابع العمل على هذا المنتج: ${target}`;
}

function analysisPrompt(lang: AgentLocale, label: string): string {
  if (lang === 'fr') return `Reprendre l’analyse de marché : « ${label} ».`;
  if (lang === 'en') return `Continue the market analysis: "${label}".`;
  return `تابع تحليل السوق: «${label}».`;
}
