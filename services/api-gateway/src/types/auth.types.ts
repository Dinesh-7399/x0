// src/types/auth.types.ts

/**
 * JWT Payload structure
 * Matches the payload created by Identity Service
 */
export interface JwtPayload {
  sub: string;         // User ID (subject)
  email: string;       // User email
  roles?: string[];    // User roles (plural)
  gymId?: string;      // Current gym context (optional)
  iat: number;         // Issued at (Unix timestamp)
  exp: number;         // Expiration (Unix timestamp)
}

/**
 * Decoded token result from verification
 */
export interface DecodedToken {
  payload: JwtPayload;
  valid: boolean;
  expired: boolean;
}

/**
 * User context extracted from JWT for request handling
 */
export interface UserContext {
  userId: string;
  email: string;
  roles: string[];
  gymId?: string;
}
