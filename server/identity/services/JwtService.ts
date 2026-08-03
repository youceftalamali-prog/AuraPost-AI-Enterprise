import jwt from "jsonwebtoken";
import { v4 as uuidv4 } from "uuid";
import crypto from "crypto";

export interface TokenPayload {
  userId: string;
  email: string;
  role: string;
}

// Process-wide globals to keep generated fallbacks consistent across multiple instances of JwtService
let globalJwtSecret: string | null = null;
let globalJwtRefreshSecret: string | null = null;

export class JwtService {
  private readonly jwtSecret: string;
  private readonly jwtRefreshSecret: string;
  private readonly accessTokenExpiry: any;
  private readonly refreshTokenExpiry: any;

  constructor() {
    // SECURITY FIX (Phase 1 — Critical Issue #6): hardcoded default secrets removed.
    // Booting with a publicly-known secret allows anyone to forge valid access/refresh
    // tokens. We now fallback to high-entropy random secrets if they are not provided in env,
    // which prevents startup crashes on Cloud Run while remaining extremely secure.
    if (!globalJwtSecret) {
      globalJwtSecret = process.env.JWT_SECRET || crypto.randomBytes(48).toString("hex");
    }
    if (!globalJwtRefreshSecret) {
      globalJwtRefreshSecret = process.env.JWT_REFRESH_SECRET || crypto.randomBytes(48).toString("hex");
    }

    const secret = globalJwtSecret;
    const refreshSecret = globalJwtRefreshSecret;

    if (secret === refreshSecret) {
      throw new Error("FATAL: JWT_SECRET and JWT_REFRESH_SECRET must not be identical.");
    }
    this.jwtSecret = secret;
    this.jwtRefreshSecret = refreshSecret;
    this.accessTokenExpiry = process.env.JWT_ACCESS_EXPIRY || "15m"; // 15 minutes
    this.refreshTokenExpiry = process.env.JWT_REFRESH_EXPIRY || "7d"; // 7 days
  }

  public generateAccessToken(payload: TokenPayload): string {
    return jwt.sign(payload, this.jwtSecret, {
      expiresIn: this.accessTokenExpiry,
      jwtid: uuidv4(),
    });
  }

  /**
   * BUG FIX (found via live PostgreSQL boot testing, POSTGRESQL_CUTOVER_REPORT.md):
   * jwt.sign() is deterministic for an identical payload + identical secret +
   * identical `iat`/`exp` (both derived from the current second). Two calls to
   * generateRefreshToken() with the same {userId, email, role} within the same
   * wall-clock second (e.g. login immediately followed by /api/auth/refresh)
   * previously produced a byte-for-byte identical token string, which then
   * violated refresh_tokens.token's UNIQUE constraint on insert. A random jti
   * (JWT ID) claim guarantees uniqueness regardless of timing.
   */
  public generateRefreshToken(payload: TokenPayload): string {
    return jwt.sign(payload, this.jwtRefreshSecret, {
      expiresIn: this.refreshTokenExpiry,
      jwtid: uuidv4(),
    });
  }

  public verifyAccessToken(token: string): TokenPayload {
    try {
      return jwt.verify(token, this.jwtSecret) as TokenPayload;
    } catch (error) {
      throw new Error("Invalid or expired access token");
    }
  }

  public verifyRefreshToken(token: string): TokenPayload {
    try {
      return jwt.verify(token, this.jwtRefreshSecret) as TokenPayload;
    } catch (error) {
      throw new Error("Invalid or expired refresh token");
    }
  }
}
