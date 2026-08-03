import assert from "assert";
import http from "http";

const BASE = process.env.TEST_URL || "http://localhost:3000";
let passed = 0;
let failed = 0;

function test(name: string, fn: () => Promise<void>) {
  return fn()
    .then(() => { passed++; console.log(`  ✓ ${name}`); })
    .catch((err) => { failed++; console.error(`  ✗ ${name}: ${err.message}`); });
}

function get(path: string, headers: Record<string, string> = {}): Promise<{status: number; body: any}> {
  return new Promise((resolve, reject) => {
    const url = new URL(path, BASE);
    const req = http.request(url, { method: "GET", headers }, (res) => {
      let data = "";
      res.on("data", (chunk) => data += chunk);
      res.on("end", () => {
        try { resolve({ status: res.statusCode!, body: JSON.parse(data) }); }
        catch { resolve({ status: res.statusCode!, body: data }); }
      });
    });
    req.on("error", reject);
    req.end();
  });
}

function post(path: string, body: any, headers: Record<string, string> = {}): Promise<{status: number; body: any}> {
  return new Promise((resolve, reject) => {
    const url = new URL(path, BASE);
    const data = JSON.stringify(body);
    const req = http.request(url, { method: "POST", headers: { "Content-Type": "application/json", ...headers } }, (res) => {
      let responseData = "";
      res.on("data", (chunk) => responseData += chunk);
      res.on("end", () => {
        try { resolve({ status: res.statusCode!, body: JSON.parse(responseData) }); }
        catch { resolve({ status: res.statusCode!, body: responseData }); }
      });
    });
    req.on("error", reject);
    req.write(data);
    req.end();
  });
}

async function run() {
  console.log("\n=== API SECURITY TESTS ===\n");

  const protectedEndpoints = [
    "/api/workspace",
    "/api/products",
    "/api/billing/overview",
    "/api/shopify/overview",
    "/api/publishing/accounts",
    "/api/intelligence/ledger",
    "/api/ai-providers",
    "/api/images/projects",
  ];

  for (const endpoint of protectedEndpoints) {
    await test(`${endpoint} rejects unauthenticated request`, async () => {
      const res = await get(endpoint);
      assert.strictEqual(res.status, 401, `Expected 401, got ${res.status} for ${endpoint}`);
    });
  }

  const mutationEndpoints = [
    "/api/publishing/posts",
    "/api/content/generate",
    "/api/images/analyze",
    "/api/ai-providers/save",
    "/api/market-intelligence/analyze",
  ];

  for (const endpoint of mutationEndpoints) {
    await test(`POST ${endpoint} rejects unauthenticated request`, async () => {
      const res = await post(endpoint, {});
      assert.strictEqual(res.status, 401, `Expected 401, got ${res.status} for ${endpoint}`);
    });
  }

  await test("Test endpoint /api/ai-providers/test requires TEST_MODE", async () => {
    const res = await post("/api/ai-providers/test", { provider: "deepseek" });
    assert.ok([404, 401].includes(res.status), `Expected 404 or 401, got ${res.status}`);
  });

  await test("Test center /api/ai-providers/test-center/run requires TEST_MODE", async () => {
    const res = await post("/api/ai-providers/test-center/run", { modality: "text" });
    assert.ok([404, 401].includes(res.status), `Expected 404 or 401, got ${res.status}`);
  });

  await test("DataForSEO credential test requires TEST_MODE", async () => {
    const res = await post("/api/market-intelligence/credentials/test", { login: "test", password: "test" });
    assert.ok([404, 401].includes(res.status), `Expected 404 or 401, got ${res.status}`);
  });

  console.log(`\n=== Results: ${passed} passed, ${failed} failed ===\n`);
  process.exit(failed > 0 ? 1 : 0);
}

run();
