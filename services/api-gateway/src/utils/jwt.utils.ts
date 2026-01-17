// src/utils/jwt.utils.ts
import jwt from 'jsonwebtoken';
import type { JwtPayload, DecodedToken } from '../types/auth.types.js';
import { getConfig } from '../config/config.js';
import { logger } from '../core/logger.js';

const config = getConfig();

/**
 * JWT Utilities
 * Functions for signing, verifying, and decoding JWT tokens
 */

/**
 * Verify and decode JWT token
 * @param token JWT token string
 * @returns Decoded token with validation status
 */
export function verifyToken(token: string): DecodedToken {
  try {
    // Verify token signature and expiration
    const decoded = jwt.verify(token, config.jwtSecret) as JwtPayload;

    return {
      payload: decoded,
      valid: true,
      expired: false,
    };
  } catch (error) {
    // Token expired
    if (error instanceof jwt.TokenExpiredError) {
      logger.debug('JWT token expired');

      // Decode without verification to get payload
      const decoded = jwt.decode(token) as JwtPayload | null;

      return {
        payload: decoded || ({} as JwtPayload),
        valid: false,
        expired: true,
      };
    }

    // Invalid signature or malformed token
    if (error instanceof jwt.JsonWebTokenError) {
      logger.debug({ error: error.message }, 'Invalid JWT token');

      return {
        payload: {} as JwtPayload,
        valid: false,
        expired: false,
      };
    }

    // Other errors
    logger.error({ error }, 'JWT verification error');

    return {
      payload: {} as JwtPayload,
      valid: false,
      expired: false,
    };
  }
}

/**
 * Decode JWT token WITHOUT verification (for debugging)
 * @param token JWT token string
 * @returns Decoded payload or null
 */
export function decodeToken(token: string): JwtPayload | null {
  try {
    return jwt.decode(token) as JwtPayload | null;
  } catch (error) {
    logger.error({ error }, 'Failed to decode JWT');
    return null;
  }
}

/**
 * Sign a JWT token (for testing purposes)
 * In production, Identity Service creates tokens
 * @param payload JWT payload
 * @param expiresIn Expiration time (e.g., '15m', '1h', '7d')
 * @returns Signed JWT token
 */
export function signToken(payload: Omit<JwtPayload, 'iat' | 'exp'>, expiresIn: string = '15m'): string {
  return jwt.sign(payload, config.jwtSecret, {
    expiresIn: expiresIn as jwt.SignOptions['expiresIn'],
    algorithm: 'HS256',
  });
}

/**
 * Extract token from Authorization header
 * Supports: "Bearer <token>" format
 * @param authHeader Authorization header value
 * @returns Token string or null
 */
export function extractTokenFromHeader(authHeader: string | undefined): string | null {
  if (!authHeader) {
    return null;
  }

  // Check for Bearer format
  const parts = authHeader.split(' ');

  if (parts.length !== 2) {
    return null;
  }

  const [scheme, token] = parts;

  if (scheme.toLowerCase() !== 'bearer') {
    return null;
  }

  return token;
}