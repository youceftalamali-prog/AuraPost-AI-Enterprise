import dotenv from "dotenv";

dotenv.config();

export const env = {
  NODE_ENV: process.env.NODE_ENV ?? "development",

  PORT: process.env.PORT ? parseInt(process.env.PORT, 10) : 3000,

  APP_URL: process.env.APP_URL ?? "http://localhost:3000",

  DATABASE_URL: process.env.DATABASE_URL ?? "",

  JWT_SECRET: process.env.JWT_SECRET ?? "",

  OPENAI_API_KEY: process.env.OPENAI_API_KEY ?? "",

  STRIPE_SECRET_KEY: process.env.STRIPE_SECRET_KEY ?? "",
};

export function validateEnvironment() {
  const required = [
    "JWT_SECRET",
    "ENCRYPTION_MASTER_KEY",
    "DATABASE_URL",
  ];

  const missing = required.filter(
    (key) => !process.env[key]
  );

  if (missing.length > 0) {
    throw new Error(
      `Missing required environment variables: ${missing.join(", ")}. ` +
      `See .env.example for configuration details.`
    );
  }

  const encKey = process.env.ENCRYPTION_MASTER_KEY ?? "";
  if (encKey.length > 0 && encKey.length < 16) {
    throw new Error(
      "ENCRYPTION_MASTER_KEY must be at least 16 characters long for AES-256 security."
    );
  }
}