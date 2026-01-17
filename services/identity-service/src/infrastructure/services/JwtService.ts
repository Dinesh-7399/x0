// src/infrastructure/services/JwtService.ts
import { SignJWT, jwtVerify, decodeJwt } from 'jose';
import { getConfig } from '../../config/index.js';

export interface TokenPayload {
  sub: string;       // User ID
  email: string;
  roles?: string[];
  gymId?: string;
}

export interface AccessTokenResult {
  accessToken: string;
  expiresIn: number; // seconds
}

/**
 * JWT Service using jose (pure JS, works with Bun)
 */
export class JwtService {
  private readonly secret: Uint8Array;
  private readonly accessExpiry: string;

  constructor() {
    const config = getConfig();
    this.secret = new TextEncoder().encode(config.jwtSecret);
    this.accessExpiry = config.jwtAccessExpiry;
  }

  /**
   * Sign an access token
   */
  async signAccessToken(payload: TokenPayload): Promise<AccessTokenResult> {
    const expiresIn = this.parseExpiry(this.accessExpiry);

    const token = await new SignJWT({ ...payload })
      .setProtectedHeader({ alg: 'HS256' })
      .setIssuedAt()
      .setExpirationTime(this.accessExpiry)
      .sign(this.secret);

    return { accessToken: token, expiresIn };
  }

  /**
   * Verify an access token
   */
  async verifyAccessToken(token: string): Promise<{ valid: boolean; expired: boolean; payload?: TokenPayload }> {
    try {
      const { payload } = await jwtVerify(token, this.secret);
      return {
        valid: true,
        expired: false,
        payload: payload as unknown as TokenPayload
      };
    } catch (error: any) {
      if (error.code === 'ERR_JWT_EXPIRED') {
        return { valid: false, expired: true };
      }
      return { valid: false, expired: false };
    }
  }

  /**
   * Decode token without verification (for debugging)
   */
  decodeToken(token: string): TokenPayload | null {
    try {
      return decodeJwt(token) as unknown as TokenPayload;
    } catch {
      return null;
    }
  }

  /**
   * Parse expiry string to seconds
   */
  private parseExpiry(expiry: string): number {
    const match = expiry.match(/^(\d+)([smhd])$/);
    if (!match) return 900; // default 15 minutes

    const value = parseInt(match[1], 10);
    const unit = match[2];

    switch (unit) {
      case 's': return value;
      case 'm': return value * 60;
      case 'h': return value * 3600;
      case 'd': return value * 86400;
      default: return 900;
    }
  }
}

// Singleton instance
let jwtService: JwtService | null = null;

export function getJwtService(): JwtService {
  if (!jwtService) {
    jwtService = new JwtService();
  }
  return jwtService;
}
