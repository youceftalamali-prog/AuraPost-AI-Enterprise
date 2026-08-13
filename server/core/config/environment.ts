import dotenv from "dotenv";

dotenv.config();

function readBoolean(name: string, defaultValue = false): boolean {
  const raw = process.env[name];
  if (raw === undefined || raw.trim() === "") return defaultValue;
  if (raw === "true") return true;
  if (raw === "false") return false;
  throw new Error(`${name} must be either "true" or "false".`);
}

function readPort(): number {
  const raw = process.env.PORT || "3000";
  const parsed = Number.parseInt(raw, 10);
  if (!Number.isInteger(parsed) || parsed < 1 || parsed > 65535) {
    throw new Error("PORT must be an integer between 1 and 65535.");
  }
  return parsed;
}

export interface RuntimeFeatureFlags {
  socialConnections: boolean;
  publishing: boolean;
  smartRepost: boolean;
  paidAds: boolean;
}

export interface RuntimeConfig {
  nodeEnv: string;
  releaseVersion: string;
  port: number;
  appUrl: string;
  appBaseUrl: string;
  databaseUrl: string;
  jwtSecret: string;
  jwtRefreshSecret: string;
  encryptionMasterKey: string;
  testMode: boolean;
  testDatasetEnabled: boolean;
  shopifyTestMode: boolean;
  features: RuntimeFeatureFlags;
}

const nodeEnv = process.env.NODE_ENV || "development";
const developmentUrl = nodeEnv === "production" ? "" : "http://localhost:3000";

export const runtimeConfig: RuntimeConfig = Object.freeze({
  nodeEnv,
  releaseVersion: process.env.AURAPOST_RELEASE_VERSION || "v1",
  port: readPort(),
  appUrl: process.env.APP_URL || developmentUrl,
  appBaseUrl: process.env.APP_BASE_URL || process.env.APP_URL || developmentUrl,
  databaseUrl: process.env.DATABASE_URL || "",
  jwtSecret: process.env.JWT_SECRET || "",
  jwtRefreshSecret: process.env.JWT_REFRESH_SECRET || "",
  encryptionMasterKey: process.env.ENCRYPTION_MASTER_KEY || "",
  testMode: readBoolean("TEST_MODE"),
  testDatasetEnabled: readBoolean("AURAPOST_ENABLE_TEST_DATASET"),
  shopifyTestMode: readBoolean("SHOPIFY_SYNC_TEST_MODE"),
  features: Object.freeze({
    socialConnections: readBoolean("SOCIAL_CONNECTIONS_ENABLED"),
    publishing: readBoolean("PUBLISHING_ENABLED"),
    smartRepost: readBoolean("SMART_REPOST_ENABLED"),
    paidAds: readBoolean("PAID_ADS_ENABLED"),
  }),
});

function requireValue(name: string, value: string): void {
  if (!value.trim()) {
    throw new Error(`Missing required environment variable: ${name}. See .env.example.`);
  }
}

function requireSecret(name: string, value: string): void {
  requireValue(name, value);
  if (value.length < 32) {
    throw new Error(`${name} must contain at least 32 characters.`);
  }
}

export function validateEnvironment(config: RuntimeConfig = runtimeConfig): void {
  if (config.nodeEnv !== "production") return;

  requireValue("DATABASE_URL", config.databaseUrl);
  requireValue("APP_URL", config.appUrl);
  requireValue("APP_BASE_URL", config.appBaseUrl);
  requireSecret("JWT_SECRET", config.jwtSecret);
  requireSecret("JWT_REFRESH_SECRET", config.jwtRefreshSecret);
  requireSecret("ENCRYPTION_MASTER_KEY", config.encryptionMasterKey);

  if (config.jwtSecret === config.jwtRefreshSecret) {
    throw new Error("JWT_SECRET and JWT_REFRESH_SECRET must not be identical.");
  }

  if (config.testMode || config.testDatasetEnabled || config.shopifyTestMode) {
    throw new Error(
      "Production refuses to start while TEST_MODE, AURAPOST_ENABLE_TEST_DATASET, or SHOPIFY_SYNC_TEST_MODE is enabled."
    );
  }

  if (config.releaseVersion === "v1") {
    const forbiddenFlags = Object.entries(config.features)
      .filter(([, enabled]) => enabled)
      .map(([name]) => name);
    if (forbiddenFlags.length > 0) {
      throw new Error(
        `AuraPost V1 licensing policy requires publishing features to remain disabled: ${forbiddenFlags.join(", ")}.`
      );
    }
  }
}

export const env = {
  NODE_ENV: runtimeConfig.nodeEnv,
  PORT: runtimeConfig.port,
  APP_URL: runtimeConfig.appUrl,
  APP_BASE_URL: runtimeConfig.appBaseUrl,
  DATABASE_URL: runtimeConfig.databaseUrl,
  JWT_SECRET: runtimeConfig.jwtSecret,
  JWT_REFRESH_SECRET: runtimeConfig.jwtRefreshSecret,
  ENCRYPTION_MASTER_KEY: runtimeConfig.encryptionMasterKey,
  OPENAI_API_KEY: process.env.OPENAI_API_KEY || "",
  STRIPE_SECRET_KEY: process.env.STRIPE_SECRET_KEY || "",
};

validateEnvironment();
