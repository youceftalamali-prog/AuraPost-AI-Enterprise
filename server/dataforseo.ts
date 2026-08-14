import { DatabaseManager } from "./db.ts";
import { logger } from "./core/observability/logger";
import {
  calculateMarketScores,
  marketNoData,
  normalizeMarketQuery,
  type MarketTrendPoint,
} from "./market-intelligence/contracts.ts";

export interface DataForSEOCredentials { login: string; password?: string; hasPassword?: boolean }
type JsonRecord = Record<string, unknown>;

const API_ORIGIN = "https://api.dataforseo.com";
const REQUEST_TIMEOUT_MS = 20_000;
const MAX_RESPONSE_BYTES = 8 * 1024 * 1024;

function record(value: unknown): JsonRecord | null {
  return typeof value === "object" && value !== null && !Array.isArray(value) ? value as JsonRecord : null;
}
function array(value: unknown): unknown[] { return Array.isArray(value) ? value : []; }
function number(value: unknown): number | null {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}
function text(value: unknown): string { return typeof value === "string" ? value.trim() : ""; }
function firstTaskResult(payload: unknown): JsonRecord | null {
  const root = record(payload);
  const task = record(array(root?.tasks)[0]);
  return record(array(task?.result)[0]);
}

async function readJsonBounded(response: Response): Promise<unknown> {
  const declared = Number(response.headers.get("content-length") || "0");
  if (declared > MAX_RESPONSE_BYTES) throw new Error("DATAFORSEO_RESPONSE_TOO_LARGE");
  const bytes = new Uint8Array(await response.arrayBuffer());
  if (bytes.byteLength > MAX_RESPONSE_BYTES) throw new Error("DATAFORSEO_RESPONSE_TOO_LARGE");
  return JSON.parse(new TextDecoder().decode(bytes));
}

async function requestDataForSEO(path: string, auth: string, payload?: unknown): Promise<unknown> {
  const url = new URL(path, API_ORIGIN);
  if (url.origin !== API_ORIGIN) throw new Error("DATAFORSEO_ENDPOINT_BLOCKED");
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  try {
    const response = await fetch(url, {
      method: payload === undefined ? "GET" : "POST",
      headers: { Authorization: `Basic ${auth}`, "Content-Type": "application/json" },
      body: payload === undefined ? undefined : JSON.stringify(payload),
      signal: controller.signal,
      redirect: "error",
    });
    if (!response.ok) throw new Error(`DATAFORSEO_HTTP_${response.status}`);
    return await readJsonBounded(response);
  } finally {
    clearTimeout(timeout);
  }
}

function parseTrends(result: JsonRecord): MarketTrendPoint[] {
  return array(result.monthly_searches).map((entry) => record(entry)).filter((entry): entry is JsonRecord => entry !== null)
    .map((entry) => ({
      month: `${number(entry.year) || 0}-${String(number(entry.month) || 0).padStart(2, "0")}`,
      volume: number(entry.search_volume) || 0,
    })).filter((point) => point.month !== "0-00");
}

export class DataForSEOService {
  public static async getCredentials(workspaceId: string): Promise<DataForSEOCredentials> {
    const db = await DatabaseManager.getInstance();
    const provider = (await db.getAIProviders(workspaceId)).find((item) => String(item.provider) === "dataforseo");
    return provider ? { login: provider.defaultModel || "", hasPassword: provider.hasApiKey } : { login: "", hasPassword: false };
  }

  private static async auth(workspaceId: string): Promise<string | null> {
    const db = await DatabaseManager.getInstance();
    const credentials = await this.getCredentials(workspaceId);
    const password = await db.getAIProviderApiKey(workspaceId, "dataforseo", false);
    if (!credentials.login || !password) return null;
    return Buffer.from(`${credentials.login}:${password}`).toString("base64");
  }

  public static async testConnection(login: string, password?: string) {
    if (!login?.trim() || !password?.trim()) return { success: false, message: "Login and password are required." };
    try {
      await requestDataForSEO("/v3/merchant/amazon/languages", Buffer.from(`${login.trim()}:${password}`).toString("base64"));
      return { success: true, message: "DataForSEO connection verified." };
    } catch {
      return { success: false, message: "DataForSEO rejected the credentials or could not be reached." };
    }
  }

  public static async analyzeMarket(workspaceId: string, keyword: string, country = "United States", language = "English") {
    const query = normalizeMarketQuery(keyword, country, language);
    const auth = await this.auth(workspaceId);
    if (!auth) return marketNoData(query.keyword, "Configure DataForSEO credentials to retrieve live market evidence.");
    const payload = [{ keywords: [query.keyword], location_name: query.country, language_name: query.language }];
    try {
      const [volumeCall, difficultyCall] = await Promise.allSettled([
        requestDataForSEO("/v3/keywords_data/google/search_volume/live", auth, payload),
        requestDataForSEO("/v3/dataforseo_labs/google/bulk_keyword_difficulty/live", auth, payload),
      ]);
      if (volumeCall.status !== "fulfilled") return marketNoData(query.keyword, "No live search-volume evidence was returned.");
      const volume = firstTaskResult(volumeCall.value);
      if (!volume) return marketNoData(query.keyword, "No live result exists for this market query.");
      const difficultyResult = difficultyCall.status === "fulfilled" ? firstTaskResult(difficultyCall.value) : null;
      const difficultyItem = record(array(difficultyResult?.items)[0]);
      const searchVolume = number(volume.search_volume) || 0;
      const cpc = number(volume.cpc) || 0;
      const competition = number(volume.competition) || 0;
      const keywordDifficulty = number(difficultyItem?.keyword_difficulty);
      const trends = parseTrends(volume);
      const scores = calculateMarketScores({ searchVolume, cpc, competition, keywordDifficulty, trends });
      return {
        success: true, liveDataAvailable: true, keyword: text(volume.keyword) || query.keyword,
        country: query.country, language: query.language, search_volume: searchVolume, cpc, competition,
        keyword_difficulty: keywordDifficulty, opportunity_score: scores.opportunity,
        score_components: scores, search_volume_trends: trends, source: "DataForSEO Live API",
        evidence: { searchVolume: true, keywordDifficulty: keywordDifficulty !== null, trendMonths: trends.length },
      };
    } catch (error) {
      logger.error({ err: error }, "Market intelligence request failed");
      return marketNoData(query.keyword, "Live market evidence is temporarily unavailable.");
    }
  }

  public static async findProductOpportunity(workspaceId: string, productName: string) {
    const result = await this.analyzeMarket(workspaceId, productName);
    if (!result.success || !("score_components" in result)) return { ...result, productName };
    const scores = result.score_components;
    return {
      success: true, liveDataAvailable: true, productName, source: result.source,
      demandScore: scores.demand, competitionScore: scores.competitionRisk,
      commercialIntentScore: scores.commercialIntent, trendScore: scores.trend,
      opportunityScore: scores.opportunity, profitabilityScore: null,
      isWinningProduct: scores.confidence !== "low" && scores.opportunity >= 70,
      opportunityLevel: scores.opportunity >= 70 ? "HIGH" : scores.opportunity >= 45 ? "MODERATE" : "LOW",
      confidence: scores.confidence,
      note: "Opportunity is evidence-based. Profitability requires product cost, shipping, fees, and return-rate data.",
    };
  }

  public static async researchCompetitors(workspaceId: string, productName: string) {
    const query = normalizeMarketQuery(productName);
    const auth = await this.auth(workspaceId);
    if (!auth) return { ...marketNoData(query.keyword, "Configure DataForSEO to retrieve live competitor listings."), competitors: [] };
    const sources = [
      ["Amazon", "/v3/merchant/amazon/products/live/advanced"],
      ["eBay", "/v3/merchant/ebay/listings/live/advanced"],
      ["Google Shopping", "/v3/merchant/google/products/live/advanced"],
    ] as const;
    const settled = await Promise.allSettled(sources.map(([, path]) => requestDataForSEO(path, auth, [{ keyword: query.keyword, location_name: query.country, language_name: query.language, limit: 10 }])));
    const competitors: Array<{ name: string; platform: string; price: number | null; rating: number | null; reviewsCount: number | null; productLink: string }> = [];
    settled.forEach((outcome, index) => {
      if (outcome.status !== "fulfilled") return;
      const result = firstTaskResult(outcome.value);
      for (const rawItem of array(result?.items)) {
        const item = record(rawItem); if (!item) continue;
        const priceRecord = record(item.price); const ratingRecord = record(item.rating);
        const productLink = text(item.url) || text(item.product_url);
        const name = text(item.title); if (!name || !productLink) continue;
        competitors.push({ name, platform: sources[index][0], price: number(priceRecord?.value) ?? number(item.price), rating: number(ratingRecord?.value) ?? number(item.rating), reviewsCount: number(item.reviews_count) ?? number(ratingRecord?.votes_count), productLink });
      }
    });
    const unique = [...new Map(competitors.map((item) => [item.productLink, item])).values()];
    const prices = unique.map((item) => item.price).filter((value): value is number => value !== null && value > 0);
    return {
      success: unique.length > 0, liveDataAvailable: unique.length > 0, competitors: unique,
      totalCompetitors: unique.length, lowestPrice: prices.length ? Math.min(...prices) : null,
      highestPrice: prices.length ? Math.max(...prices) : null,
      averagePrice: prices.length ? Number((prices.reduce((sum, value) => sum + value, 0) / prices.length).toFixed(2)) : null,
      source: "DataForSEO Live Merchant APIs",
      message: unique.length ? undefined : "No verified competitor listings were returned.",
    };
  }

  public static async discoverTrends(workspaceId: string, productName?: string) {
    const query = normalizeMarketQuery(productName || "");
    const auth = await this.auth(workspaceId);
    if (!auth) return { ...marketNoData(query.keyword, "Configure DataForSEO to retrieve live trends."), trendingProducts: [], countriesHighDemand: [] };
    try {
      const payload = await requestDataForSEO("/v3/keywords_data/google/trends/live", auth, [{ keywords: [query.keyword], location_name: query.country, language_name: query.language }]);
      const result = firstTaskResult(payload);
      const trendingProducts: Array<{ name: string; type: string }> = [];
      const countriesHighDemand: Array<{ country: string; value: number }> = [];
      for (const rawItem of array(result?.items)) {
        const item = record(rawItem); if (!item) continue;
        const type = text(item.type);
        if (type.includes("quer")) {
          const data = record(item.data);
          for (const rawQuery of [...array(data?.rising), ...array(data?.top)]) {
            const value = record(rawQuery); const name = text(value?.query) || text(value?.keyword);
            if (name) trendingProducts.push({ name, type: type.includes("rising") ? "rising" : "related" });
          }
        }
        if (type.includes("geo") || type.includes("region") || type.includes("demography")) {
          for (const rawRegion of array(item.data)) {
            const region = record(rawRegion); const country = text(region?.location_name) || text(region?.name);
            if (country) countriesHighDemand.push({ country, value: number(region?.value) || 0 });
          }
        }
      }
      return { success: true, liveDataAvailable: trendingProducts.length > 0 || countriesHighDemand.length > 0, trendingProducts: trendingProducts.slice(0, 12), countriesHighDemand: countriesHighDemand.sort((a, b) => b.value - a.value).slice(0, 8), marketRecommendations: null, source: "DataForSEO Google Trends Live API" };
    } catch (error) {
      logger.error({ err: error }, "Trend intelligence request failed");
      return { ...marketNoData(query.keyword, "No live trend evidence was returned."), trendingProducts: [], countriesHighDemand: [] };
    }
  }
}
