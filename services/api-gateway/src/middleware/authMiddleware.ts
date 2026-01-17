// src/middleware/authMiddleware.ts
import type { Context, Next } from 'hono';
import { verifyToken, extractTokenFromHeader } from '../utils/jwt.utils.js';
import { TokenMissingError, TokenInvalidError, TokenExpiredError } from './errors/AuthErrors.js';
import { logger } from '../core/logger.js';
import type { UserContext } from '../types/auth.types.js';

/**
 * Authentication Middleware
 * 
 * Validates JWT tokens and sets user context.
 * This middleware is ONLY called for routes that require authentication.
 */
export async function authMiddleware(c: Context, next: Next) {
  const requestLogger = logger.child({
    requestId: c.get('requestId'),
    path: c.req.path,
  });

  try {
    // 1. Extract token from Authorization header
    const authHeader = c.req.header('Authorization');
    const token = extractTokenFromHeader(authHeader);

    if (!token) {
      requestLogger.warn('Missing authentication token');
      throw new TokenMissingError();
    }

    // 2. Verify token
    const decoded = verifyToken(token);

    if (decoded.expired) {
      requestLogger.warn('Token expired');
      throw new TokenExpiredError();
    }

    if (!decoded.valid) {
      requestLogger.warn('Invalid token');
      throw new TokenInvalidError();
    }

    // 3. Extract user context from token
    const userContext: UserContext = {
      userId: decoded.payload.sub,
      email: decoded.payload.email,
      roles: decoded.payload.roles || [],
      gymId: decoded.payload.gymId,
    };

    // 4. Set user context in Hono context (available to all downstream middleware/handlers)
    c.set('userId', userContext.userId);
    c.set('email', userContext.email);
    c.set('roles', userContext.roles);
    c.set('gymId', userContext.gymId);
    c.set('authenticated', true);

    requestLogger.debug(
      { userId: userContext.userId, roles: userContext.roles },
      'User authenticated',
    );

  } catch (error) {
    // Handle auth errors
    if (error instanceof TokenMissingError) {
      return c.json(
        {
          error: error.code,
          message: error.message,
        },
        401 as const,
      );
    }
    // 5. Continue to next middleware/handler
    await next();
    if (error instanceof TokenExpiredError) {
      return c.json(
        {
          error: error.code,
          message: error.message,
          hint: 'Use refresh token to get a new access token',
        },
        401 as const,
      );
    }

    if (error instanceof TokenInvalidError) {
      return c.json(
        {
          error: error.code,
          message: error.message,
        },
        401 as const,
      );
    }

    // Unknown error
    requestLogger.error({ error }, 'Authentication error');
    return c.json(
      {
        error: 'AUTHENTICATION_FAILED',
        message: 'Authentication failed',
      },
      401,
    );
  }
}

/**
 * Optional Authentication Middleware
 * 
 * Attempts to authenticate but doesn't fail if token is missing.
 * Useful for routes that work for both authenticated and anonymous users.
 */
export async function optionalAuthMiddleware(c: Context, next: Next) {
  const authHeader = c.req.header('Authorization');
  const token = extractTokenFromHeader(authHeader);

  if (token) {
    const decoded = verifyToken(token);

    if (decoded.valid && !decoded.expired) {
      // Set user context if token is valid
      c.set('userId', decoded.payload.sub);
      c.set('email', decoded.payload.email);
      c.set('roles', decoded.payload.roles || []);
      c.set('gymId', decoded.payload.gymId);
      c.set('authenticated', true);
    }
  }

  // Always continue (even without valid token)
  await next();
}