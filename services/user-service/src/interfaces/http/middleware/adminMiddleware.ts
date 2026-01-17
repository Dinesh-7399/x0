// src/interfaces/http/middleware/adminMiddleware.ts

import type { Context, Next } from 'hono';
import { ForbiddenError } from '../../../application/errors/UserErrors.js';

/**
 * Middleware to ensure user has admin role
 * Must run AFTER authMiddleware
 */
export async function adminMiddleware(c: Context, next: Next) {
  const user = c.get('user');

  if (!user) {
    return c.json({ error: 'UNAUTHORIZED', message: 'Authentication required' }, 401);
  }

  const hasAdminRole = user.roles.includes('admin') || user.roles.includes('superadmin');

  if (!hasAdminRole) {
    return c.json({ error: 'FORBIDDEN', message: 'Admin access required' }, 403);
  }

  await next();
}
