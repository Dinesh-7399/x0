// src/infrastructure/services/JwtService.ts

import { jwtVerify } from 'jose';
import { getConfig } from '../../config/index.js';

const config = getConfig();

export interface TokenPayload {
  sub: string;
  email: string;
  roles: string[];
}

/**
 * JWT Service
 * 
 * Verifies tokens using the shared JWT_SECRET.
 * Note: Uses TextEncoder for Key-to-Byte conversion required by `jose`.
 */
export class JwtService {
  private readonly secret = new TextEncoder().encode(config.jwtSecret);

  async verifyToken(token: string): Promise<TokenPayload | null> {
    try {
      const { payload } = await jwtVerify(token, this.secret);

      // Validate expected structure
      if (!payload.sub || typeof payload.sub !== 'string') return null;
      if (!payload.email || typeof payload.email !== 'string') return null;

      return {
        sub: payload.sub,
        email: payload.email,
        roles: Array.isArray(payload.roles) ? payload.roles as string[] : [],
      };
    } catch (error) {
      // console.error('Token verification failed:', error);
      return null;
    }
  }
}
