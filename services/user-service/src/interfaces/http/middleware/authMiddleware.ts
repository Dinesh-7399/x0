// src/interfaces/http/middleware/authMiddleware.ts

import type { Context, Next } from 'hono';
import { Container, ServiceKeys } from '../../../infrastructure/container/Container.js';
import type { JwtService } from '../../../infrastructure/services/JwtService.js';

export async function authMiddleware(c: Context, next: Next) {
  const authHeader = c.req.header('Authorization');
  if (!authHeader?.startsWith('Bearer ')) {
    return c.json({ error: 'UNAUTHORIZED', message: 'Missing or invalid authorization header' }, 401);
  }

  const token = authHeader.slice(7);
  const container = Container.getInstance();
  const jwtService = container.resolve<JwtService>(ServiceKeys.JwtService);

  const payload = await jwtService.verifyToken(token);
  if (!payload) {
    return c.json({ error: 'UNAUTHORIZED', message: 'Invalid or expired token' }, 401);
  }

  // Attach user to context
  c.set('user', payload);

  await next();
}
