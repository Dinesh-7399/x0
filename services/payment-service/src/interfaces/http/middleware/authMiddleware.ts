import { Context, Next } from 'hono';
import { verify } from 'hono/jwt';
import { getConfig } from '../../../config/index.js';

export const authMiddleware = async (c: Context, next: Next) => {
  const authHeader = c.req.header('Authorization');

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return c.json({ error: 'UNAUTHORIZED', message: 'Missing or Invalid Authorization Header' }, 401);
  }

  const token = authHeader.split(' ')[1];
  if (!token) {
    return c.json({ error: 'UNAUTHORIZED', message: 'Missing Token' }, 401);
  }

  try {
    const config = getConfig();
    const payload = await verify(token, config.jwtSecret);
    c.set('user', payload);
    await next();
  } catch (error) {
    return c.json({ error: 'UNAUTHORIZED', message: 'Invalid Token' }, 401);
  }
};
