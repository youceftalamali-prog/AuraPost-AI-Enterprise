import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

async function source(relativePath) {
  return readFile(new URL(`../../${relativePath}`, import.meta.url), "utf8");
}

test("JWT configuration fails closed instead of generating local secrets", async () => {
  const jwtSource = await source("server/identity/services/JwtService.ts");
  assert.match(jwtSource, /requireSecret\("JWT_SECRET"\)/);
  assert.match(jwtSource, /requireSecret\("JWT_REFRESH_SECRET"\)/);
  assert.match(jwtSource, /is required\. Refusing to generate process-local JWT secrets/);
  assert.match(jwtSource, /MINIMUM_SECRET_LENGTH = 32/);
  assert.doesNotMatch(jwtSource, /randomBytes/);
  assert.doesNotMatch(jwtSource, /globalJwtSecret/);
});

test("PayPal never fabricates successful orders or captures", async () => {
  const paypalSource = await source("server/billing/paypal.ts");
  assert.match(paypalSource, /fabricated payment success is disabled/);
  assert.match(paypalSource, /Fabricated PayPal order IDs are rejected/);
  assert.doesNotMatch(paypalSource, /SANDBOX-CAPTURE-/);
  assert.doesNotMatch(paypalSource, /const orderId = `SANDBOX-ORDER-/);
  assert.doesNotMatch(paypalSource, /publishing-100/);
});

test("production configuration validates secrets, test modes, and V1 policy", async () => {
  const environmentSource = await source("server/core/config/environment.ts");
  assert.match(environmentSource, /validateEnvironment\(\)/);
  assert.match(environmentSource, /JWT_REFRESH_SECRET/);
  assert.match(environmentSource, /ENCRYPTION_MASTER_KEY/);
  assert.match(environmentSource, /AURAPOST_ENABLE_TEST_DATASET/);
  assert.match(environmentSource, /AuraPost V1 licensing policy/);
  assert.match(environmentSource, /must contain at least 32 characters/);
});

test("disabled V1 APIs are blocked before legacy route handlers", async () => {
  const securitySource = await source("server/core/middleware/SecurityMiddleware.ts");
  assert.match(securitySource, /runtimeConfig\.features\.publishing/);
  assert.match(securitySource, /pathname\.startsWith\("\/api\/publishing"\)/);
  assert.match(securitySource, /pathname\.startsWith\("\/api\/auth\/meta"\)/);
  assert.match(securitySource, /FEATURE_DISABLED/);
  assert.match(securitySource, /"\/api\/features"/);
});

test("deployment files keep the Phase Zero safety controls", async () => {
  const [dockerfile, compose, envExample] = await Promise.all([
    source("Dockerfile"),
    source("docker-compose.yml"),
    source(".env.example"),
  ]);

  assert.match(dockerfile, /\/api\/health/);
  assert.doesNotMatch(dockerfile, /\/api\/health\/live/);
  assert.match(compose, /POSTGRES_PASSWORD:\?Set POSTGRES_PASSWORD/);
  assert.doesNotMatch(compose, /POSTGRES_PASSWORD:-changeme/);
  assert.match(envExample, /PUBLISHING_ENABLED=false/);
  assert.match(envExample, /TEST_MODE=false/);
});
