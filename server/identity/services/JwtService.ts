import jwt from "jsonwebtoken";
import { v4 as uuidv4 } from "uuid";

export interface TokenPayload {
  userId: string;
  email: string;
  role: string;
}

const MINIMUM_SECRET_LENGTH = 32;

function requireSecret(name: "JWT_SECRET" | "JWT_REFRESH_SECRET"): string {
  const value = process.env[name]?.trim();

  if (!value) {
    throw new Error(`FATAL: ${name} is required. Refusing to generate process-local JWT secrets.`);
  }

  if (value.length < MINIMUM_SECRET_LENGTH) {
    throw new Error(`FATAL: ${name} must contain at least ${MINIMUM_SECRET_LENGTH} characters.`);
  }

  return value;
}

export class JwtService {
  private readonly jwtSecret: string;
  private readonly jwtRefreshSecret: string;
  private readonly accessTokenExpiry: any;
  private readonly refreshTokenExpiry: any;

  constructor() {
    const secret = requireSecret("JWT_SECRET");
    const refreshSecret = requireSecret("JWT_REFRESH_SECRET");

    if (secret === refreshSecret) {
      throw new Error("FATAL: JWT_SECRET and JWT_REFRESH_SECRET must not be identical.");
    }

    this.jwtSecret = secret;
    this.jwtRefreshSecret = refreshSecret;
    this.accessTokenExpiry = process.env.JWT_ACCESS_EXPIRY || "15m";
    this.refreshTokenExpiry = process.env.JWT_REFRESH_EXPIRY || "7d";
  }

  public generateAccessToken(payload: TokenPayload): string {
    return jwt.sign(payload, this.jwtSecret, {
      expiresIn: this.accessTokenExpiry,
      jwtid: uuidv4(),
    });
  }

  public generateRefreshToken(payload: TokenPayload): string {
    return jwt.sign(payload, this.jwtRefreshSecret, {
      expiresIn: this.refreshTokenExpiry,
      jwtid: uuidv4(),
    });
  }

  public verifyAccessToken(token: string): TokenPayload {
    try {
      return jwt.verify(token, this.jwtSecret) as TokenPayload;
    } catch {
      throw new Error("Invalid or expired access token");
    }
  }

  public verifyRefreshToken(token: string): TokenPayload {
    try {
      return jwt.verify(token, this.jwtRefreshSecret) as TokenPayload;
    } catch {
      throw new Error("Invalid or expired refresh token");
    }
  }
}
