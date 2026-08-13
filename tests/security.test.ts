import assert from "node:assert/strict";
import test from "node:test";
import { asRecord, get, post } from "./httpClient.ts";

test("health endpoint returns a structured healthy response", async () => {
  const response = await get("/api/health");
  const body = asRecord(response.body);
  assert.equal(response.status, 200);
  assert.equal(body.status, "ok");
  assert.equal(typeof body.timestamp, "string");
  assert.equal(typeof body.uptime, "number");
  assert.equal(typeof response.headers["x-request-id"], "string");
});

test("readiness endpoint returns a structured response", async () => {
  const response = await get("/api/ready");
  const body = asRecord(response.body);
  assert.ok([200, 503].includes(response.status));
  assert.equal(typeof body.status, "string");
  assert.ok("database" in body);
});

test("removed debug and diagnostics endpoints stay unavailable", async () => {
  assert.equal((await get("/api/auth/meta/logs")).status, 404);
  assert.equal((await get("/api/publishing/meta-diagnostics")).status, 404);
});

test("protected resources reject unauthenticated or invalid tokens", async () => {
  assert.equal((await get("/api/workspace")).status, 401);
  assert.equal((await get("/api/workspace", { Authorization: "Bearer invalid_token_12345" })).status, 401);
  assert.equal((await get("/api/products")).status, 401);
  assert.equal((await get("/api/billing/overview")).status, 401);
});

test("credit mutation test route is unavailable when TEST_MODE is false", async () => {
  assert.equal((await post("/api/set-credits", { workspaceId: "test", amount: 999999 })).status, 404);
});

test("login errors do not expose internal fields or authentication cookies", async () => {
  const response = await post("/api/auth/login", { email: "", password: "" });
  assert.ok([400, 401, 422].includes(response.status));
  const serialized = JSON.stringify(response.body).toLowerCase();
  assert.equal(serialized.includes("stack"), false);
  assert.equal(serialized.includes("password_hash"), false);
  assert.equal(serialized.includes("accesstoken"), false);
  assert.equal(serialized.includes("refreshtoken"), false);
  assert.equal(response.headers["set-cookie"], undefined);
});
