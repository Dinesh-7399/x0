// src/interfaces/http/middleware/authMiddleware.ts

import type { Context, Next } from 'hono';

/**
 * Auth middleware that extracts and validates user ID from headers.
 * The API Gateway handles full JWT validation and passes user info.
 * SECURITY: This is the first line of defense - always validate.
 */
export async function authMiddleware(c: Context, next: Next) {
  const userId = c.req.header('x-user-id');

  // CRITICAL: Never proceed without user identification
  if (!userId) {
    return c.json(
      {
        error: 'UNAUTHORIZED',
        message: 'Authentication required',
      },
      401,
    );
  }

  // SECURITY: Validate UUID format to prevent injection
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(userId)) {
    return c.json(
      {
        error: 'UNAUTHORIZED',
        message: 'Invalid authentication token',
      },
      401,
    );
  }

  // Attach user info to context
  c.set('userId', userId);
  c.set('userRole', c.req.header('x-user-role') || 'user');

  await next();
}

/**
 * Optional auth - doesn't fail if no auth, just sets user if available
 */
export async function optionalAuthMiddleware(c: Context, next: Next) {
  const userId = c.req.header('x-user-id');

  if (userId) {
    // Still validate if present
    if (/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(userId)) {
      c.set('userId', userId);
      c.set('userRole', c.req.header('x-user-role') || 'user');
    }
  }

  await next();
}
