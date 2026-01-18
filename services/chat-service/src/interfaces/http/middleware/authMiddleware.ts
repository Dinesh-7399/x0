
import type { Context, Next } from 'hono';
import { verify } from 'hono/jwt';

export async function authMiddleware(c: Context, next: Next) {
  const authHeader = c.req.header('Authorization');
  if (!authHeader?.startsWith('Bearer ')) {
    return c.json({ error: 'UNAUTHORIZED', message: 'Missing or invalid authorization header' }, 401);
  }

  const token = authHeader.slice(7);
  const secret = process.env.JWT_SECRET || 'dev-jwt-secret-change-in-production';

  try {
    const payload = await verify(token, secret);
    c.set('user', payload);
  } catch (err) {
    return c.json({ error: 'UNAUTHORIZED', message: 'Invalid or expired token' }, 401);
  }

  await next();
}
