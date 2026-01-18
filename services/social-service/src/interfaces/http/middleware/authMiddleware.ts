import { Context, Next } from 'hono';
import { verify } from 'hono/jwt';

export const authMiddleware = async (c: Context, next: Next) => {
  const authHeader = c.req.header('Authorization');

  if (!authHeader) {
    return c.json({ error: 'UNAUTHORIZED', message: 'Missing or invalid authorization header' }, 401);
  }

  const token = authHeader.split(' ')[1]; // Bearer <token>

  try {
    const secret = process.env.JWT_SECRET || 'dev-secret';
    const payload = await verify(token, secret);
    c.set('user', payload);
    await next();
  } catch (error) {
    return c.json({ error: 'UNAUTHORIZED', message: 'Invalid token' }, 401);
  }
};
