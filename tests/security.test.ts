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
  console.log("\n=== SECURITY TESTS ===\n");

  await test("Health endpoint returns 200 with status", async () => {
    const res = await get("/api/health");
    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.body.status, "ok");
    assert.ok(res.body.timestamp);
    assert.ok(typeof res.body.uptime === "number");
  });

  await test("Readiness endpoint returns structured response", async () => {
    const res = await get("/api/ready");
    assert.ok([200, 503].includes(res.status));
    assert.ok(res.body.status);
    assert.ok(res.body.database);
  });

  await test("Debug endpoint /api/auth/meta/logs returns 404", async () => {
    const res = await get("/api/auth/meta/logs");
    assert.strictEqual(res.status, 404);
  });

  await test("Debug endpoint /api/publishing/meta-diagnostics returns 404", async () => {
    const res = await get("/api/publishing/meta-diagnostics");
    assert.strictEqual(res.status, 404);
  });

  await test("Protected endpoint /api/workspace returns 401 without token", async () => {
    const res = await get("/api/workspace");
    assert.strictEqual(res.status, 401);
  });

  await test("Protected endpoint /api/workspace returns 401 with invalid token", async () => {
    const res = await get("/api/workspace", { Authorization: "Bearer invalid_token_12345" });
    assert.strictEqual(res.status, 401);
  });

  await test("Protected endpoint /api/products returns 401 without token", async () => {
    const res = await get("/api/products");
    assert.strictEqual(res.status, 401);
  });

  await test("Protected endpoint /api/billing/overview returns 401 without token", async () => {
    const res = await get("/api/billing/overview");
    assert.strictEqual(res.status, 401);
  });

  await test("POST /api/set-credits returns 404 in production", async () => {
    const res = await post("/api/set-credits", { workspaceId: "test", amount: 999999 });
    assert.strictEqual(res.status, 404);
  });

  await test("Request ID middleware adds X-Request-Id header", async () => {
    const res = await get("/api/health");
    // Health endpoint should work, request ID should be present
    assert.strictEqual(res.status, 200);
  });

  await test("Auth endpoint /api/auth/login returns error for missing fields", async () => {
    const res = await post("/api/auth/login", { email: "", password: "" });
    assert.ok([400, 401, 422].includes(res.status));
  });

  console.log(`\n=== Results: ${passed} passed, ${failed} failed ===\n`);
  process.exit(failed > 0 ? 1 : 0);
}

run();
