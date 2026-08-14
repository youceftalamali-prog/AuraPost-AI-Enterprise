import { AppError } from "../core/errors/AppError.ts";

export interface MarketTrendPoint { month: string; volume: number }
export interface MarketScores {
  demand: number;
  competitionRisk: number;
  commercialIntent: number;
  trend: number;
  opportunity: number;
  confidence: "high" | "medium" | "low";
}

const MAX_TERM_LENGTH = 200;
const MAX_LOCATION_LENGTH = 80;

function cleanText(value: unknown, field: string, maxLength: number): string {
  if (typeof value !== "string") {
    throw new AppError(`${field} must be text.`, 400, { code: "INVALID_MARKET_QUERY" });
  }
  const cleaned = value.replace(/[\u0000-\u001f\u007f]/g, " ").replace(/\s+/g, " ").trim();
  if (!cleaned || cleaned.length > maxLength) {
    throw new AppError(`${field} must contain between 1 and ${maxLength} characters.`, 400, {
      code: "INVALID_MARKET_QUERY",
    });
  }
  return cleaned;
}

export function normalizeMarketQuery(keyword: unknown, country: unknown = "United States", language: unknown = "English") {
  return {
    keyword: cleanText(keyword, "keyword", MAX_TERM_LENGTH),
    country: cleanText(country, "country", MAX_LOCATION_LENGTH),
    language: cleanText(language, "language", MAX_LOCATION_LENGTH),
  };
}

function clamp(value: number): number {
  return Math.min(100, Math.max(0, Math.round(value)));
}

export function calculateMarketScores(input: {
  searchVolume: number;
  cpc: number;
  competition: number;
  keywordDifficulty: number | null;
  trends: MarketTrendPoint[];
}): MarketScores {
  const demand = clamp(((Math.log10(Math.max(0, input.searchVolume) + 1) - 1) / 5) * 100);
  const paidRisk = clamp(input.competition * 100);
  const organicRisk = input.keywordDifficulty === null ? paidRisk : clamp(input.keywordDifficulty);
  const competitionRisk = clamp(paidRisk * 0.45 + organicRisk * 0.55);
  const commercialIntent = clamp((Math.min(Math.max(input.cpc, 0), 8) / 8) * 100);

  let trend = 50;
  if (input.trends.length >= 6) {
    const oldAverage = input.trends.slice(0, 3).reduce((sum, point) => sum + point.volume, 0) / 3;
    const recentAverage = input.trends.slice(-3).reduce((sum, point) => sum + point.volume, 0) / 3;
    const change = oldAverage > 0 ? (recentAverage - oldAverage) / oldAverage : 0;
    trend = clamp(50 + change * 50);
  }

  const opportunity = clamp(demand * 0.4 + (100 - competitionRisk) * 0.3 + commercialIntent * 0.15 + trend * 0.15);
  const confidence = input.keywordDifficulty !== null && input.trends.length >= 6
    ? "high"
    : input.searchVolume > 0
      ? "medium"
      : "low";
  return { demand, competitionRisk, commercialIntent, trend, opportunity, confidence };
}

export function marketNoData(keyword: string, message: string) {
  return {
    success: false,
    liveDataAvailable: false,
    keyword,
    message,
    source: "DataForSEO",
  };
}
