import assert from "node:assert/strict";
import test from "node:test";
import { get, post } from "./httpClient.ts";

test("registration rejects missing fields", async () => {
  assert.ok((await post("/api/auth/register", {})).status >= 400);
});

test("registration rejects an invalid email", async () => {
  const response = await post("/api/auth/register", {
    email: "not-an-email",
    password: "testpass123",
    firstName: "Test",
    lastName: "User",
  });
  assert.ok(response.status >= 400);
});

test("login rejects empty credentials", async () => {
  assert.ok((await post("/api/auth/login", { email: "", password: "" })).status >= 400);
});

test("login rejects a non-existent user", async () => {
  const response = await post("/api/auth/login", {
    email: "nonexistent@test.invalid",
    password: "wrongpassword123",
  });
  assert.ok(response.status >= 400);
});

test("refresh rejects invalid or missing tokens", async () => {
  assert.ok((await post("/api/auth/refresh", { refreshToken: "invalid_refresh_token" })).status >= 400);
  assert.ok((await post("/api/auth/refresh", {})).status >= 400);
});

test("protected routes reject malformed authorization", async () => {
  assert.equal((await get("/api/workspace", { Authorization: "Bearer " })).status, 401);
  assert.equal((await get("/api/workspace", { Authorization: "Basic abc123" })).status, 401);
  const malformedJwt = "eyJhbGciOiJIUzI1NiJ9.eyJ1c2VySWQiOiJ0ZXN0In0.invalid";
  assert.equal((await get("/api/workspace", { Authorization: `Bearer ${malformedJwt}` })).status, 401);
});
