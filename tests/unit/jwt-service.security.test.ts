import assert from "node:assert/strict";
import test, { afterEach } from "node:test";
import { JwtService } from "../../server/identity/services/JwtService.ts";

const originalAccessSecret = process.env.JWT_SECRET;
const originalRefreshSecret = process.env.JWT_REFRESH_SECRET;

afterEach(() => {
  if (originalAccessSecret === undefined) delete process.env.JWT_SECRET;
  else process.env.JWT_SECRET = originalAccessSecret;
  if (originalRefreshSecret === undefined) delete process.env.JWT_REFRESH_SECRET;
  else process.env.JWT_REFRESH_SECRET = originalRefreshSecret;
});

test("JwtService fails closed when signing secrets are missing", () => {
  delete process.env.JWT_SECRET;
  delete process.env.JWT_REFRESH_SECRET;
  assert.throws(() => new JwtService(), /JWT_SECRET is required/);
});

test("JwtService rejects weak or identical secrets", () => {
  process.env.JWT_SECRET = "short";
  process.env.JWT_REFRESH_SECRET = "another-short";
  assert.throws(() => new JwtService(), /at least 32 characters/);

  const sharedSecret = "same-secret-value-that-is-longer-than-thirty-two-characters";
  process.env.JWT_SECRET = sharedSecret;
  process.env.JWT_REFRESH_SECRET = sharedSecret;
  assert.throws(() => new JwtService(), /must not be identical/);
});

test("JwtService signs and verifies distinct access and refresh tokens", () => {
  process.env.JWT_SECRET = "access-secret-value-that-is-longer-than-thirty-two-characters";
  process.env.JWT_REFRESH_SECRET = "refresh-secret-value-that-is-longer-than-thirty-two-characters";
  const service = new JwtService();
  const payload = { userId: "user-1", email: "test@example.com", role: "owner" };

  const accessToken = service.generateAccessToken(payload);
  const refreshToken = service.generateRefreshToken(payload);

  assert.notEqual(accessToken, refreshToken);
  assert.equal(service.verifyAccessToken(accessToken).userId, payload.userId);
  assert.equal(service.verifyRefreshToken(refreshToken).email, payload.email);
  assert.throws(() => service.verifyAccessToken(refreshToken), /Invalid or expired access token/);
});
