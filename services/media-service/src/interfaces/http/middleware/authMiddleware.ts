// src/interfaces/http/middleware/authMiddleware.ts

import type { Context, Next } from 'hono';

/**
 * Simple auth middleware that extracts user ID from headers.
 * In production, this would validate JWT tokens.
 * The API Gateway handles full authentication and passes user info via headers.
 */
export async function authMiddleware(c: Context, next: Next) {
  const userId = c.req.header('x-user-id');

  if (!userId) {
    return c.json(
      {
        error: 'UNAUTHORIZED',
        message: 'Authentication required',
      },
      401,
    );
  }

  // Attach user info to context for downstream use
  c.set('userId', userId);
  c.set('userRole', c.req.header('x-user-role') || 'user');

  await next();
}

/**
 * Optional auth middleware - doesn't fail if no auth, just sets user if available
 */
export async function optionalAuthMiddleware(c: Context, next: Next) {
  const userId = c.req.header('x-user-id');

  if (userId) {
    c.set('userId', userId);
    c.set('userRole', c.req.header('x-user-role') || 'user');
  }

  await next();
}
