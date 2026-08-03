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

async function run() {
  console.log("\n=== AUTH TESTS ===\n");

  await test("Register with missing fields returns error", async () => {
    const res = await post("/api/auth/register", {});
    assert.ok(res.status >= 400);
  });

  await test("Register with invalid email returns error", async () => {
    const res = await post("/api/auth/register", { email: "not-an-email", password: "testpass123", firstName: "Test", lastName: "User" });
    assert.ok(res.status >= 400);
  });

  await test("Login with empty credentials returns error", async () => {
    const res = await post("/api/auth/login", { email: "", password: "" });
    assert.ok(res.status >= 400);
  });

  await test("Login with non-existent user returns error", async () => {
    const res = await post("/api/auth/login", { email: "nonexistent@test.com", password: "wrongpassword123" });
    assert.ok(res.status >= 400);
  });

  await test("Refresh with invalid token returns error", async () => {
    const res = await post("/api/auth/refresh", { refreshToken: "invalid_refresh_token" });
    assert.ok(res.status >= 400);
  });

  await test("Refresh with empty body returns error", async () => {
    const res = await post("/api/auth/refresh", {});
    assert.ok(res.status >= 400);
  });

  await test("Protected route rejects Bearer with no token", async () => {
    const res = await get("/api/workspace", { Authorization: "Bearer " });
    assert.strictEqual(res.status, 401);
  });

  await test("Protected route rejects malformed Authorization header", async () => {
    const res = await get("/api/workspace", { Authorization: "Basic abc123" });
    assert.strictEqual(res.status, 401);
  });

  await test("Protected route rejects expired/malformed JWT", async () => {
    const fakeJwt = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiJ0ZXN0IiwiaWF0IjoxMDAwMDAwMDAwfQ.invalid";
    const res = await get("/api/workspace", { Authorization: `Bearer ${fakeJwt}` });
    assert.strictEqual(res.status, 401);
  });

  console.log(`\n=== Results: ${passed} passed, ${failed} failed ===\n`);
  process.exit(failed > 0 ? 1 : 0);
}

run();
