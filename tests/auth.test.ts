import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import test from "node:test";
import { asRecord, CookieJar, get, post, type HttpResult } from "./httpClient.ts";

function setCookieLines(response: HttpResult): string[] {
  const header = response.headers["set-cookie"];
  return Array.isArray(header) ? header : typeof header === "string" ? [header] : [];
}

function findCookie(lines: string[], name: string): string {
  const line = lines.find((value) => value.startsWith(`${name}=`));
  assert.ok(line, `Expected ${name} Set-Cookie header`);
  return line;
}

function assertSecureAuthCookie(line: string, expectedPath: string): void {
  assert.match(line, /;\s*HttpOnly(?:;|$)/i);
  assert.match(line, /;\s*Secure(?:;|$)/i);
  assert.match(line, /;\s*SameSite=Strict(?:;|$)/i);
  assert.match(line, new RegExp(`;\\s*Path=${expectedPath.replaceAll("/", "\\/")}(?:;|$)`, "i"));
}

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

test("login, refresh, and logout use secure HttpOnly cookies without exposing JWTs", async () => {
  const email = `cookie-auth-${randomUUID()}@test.invalid`;
  const password = "CookieAuthTest!123";

  const registration = await post("/api/auth/register", {
    email,
    password,
    firstName: "Cookie",
    lastName: "Tester",
  });
  assert.equal(registration.status, 201);

  const jar = new CookieJar();
  const login = await jar.post("/api/auth/login", { email, password });
  assert.equal(login.status, 200);
  const loginBody = asRecord(login.body);
  assert.equal("accessToken" in loginBody, false);
  assert.equal("refreshToken" in loginBody, false);
  assert.equal(login.headers["cache-control"], "no-store");

  const loginCookies = setCookieLines(login);
  const accessCookie = findCookie(loginCookies, "__Secure-aurapost_access_token");
  const refreshCookie = findCookie(loginCookies, "__Secure-aurapost_refresh_token");
  assertSecureAuthCookie(accessCookie, "/api");
  assertSecureAuthCookie(refreshCookie, "/api/auth");
  assert.equal(jar.has("__Secure-aurapost_access_token"), true);
  assert.equal(jar.has("__Secure-aurapost_refresh_token"), true);

  const workspace = await jar.get("/api/workspace");
  assert.equal(workspace.status, 200);

  const refresh = await jar.post("/api/auth/refresh", {});
  assert.equal(refresh.status, 200);
  const refreshBody = asRecord(refresh.body);
  assert.equal("accessToken" in refreshBody, false);
  assert.equal("refreshToken" in refreshBody, false);
  assert.equal(refresh.headers["cache-control"], "no-store");
  assertSecureAuthCookie(
    findCookie(setCookieLines(refresh), "__Secure-aurapost_access_token"),
    "/api",
  );
  assertSecureAuthCookie(
    findCookie(setCookieLines(refresh), "__Secure-aurapost_refresh_token"),
    "/api/auth",
  );

  const logout = await jar.post("/api/auth/logout", {});
  assert.equal(logout.status, 200);
  assert.equal(logout.headers["cache-control"], "no-store");
  assert.equal(jar.has("__Secure-aurapost_access_token"), false);
  assert.equal(jar.has("__Secure-aurapost_refresh_token"), false);
  assert.equal((await jar.get("/api/workspace")).status, 401);
});
