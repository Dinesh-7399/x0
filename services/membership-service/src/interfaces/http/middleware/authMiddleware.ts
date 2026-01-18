import { Context, Next } from 'hono';
import { jwtVerify } from 'jose';
import { getConfig } from '../../../config/index.js';

export const authMiddleware = async (c: Context, next: Next) => {
  const authHeader = c.req.header('Authorization');

  console.error('Auth Header:', authHeader);
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return c.json({ error: 'UNAUTHORIZED', message: 'Missing or Invalid Authorization Header' }, 401);
  }

  const token = authHeader.split(' ')[1];
  console.log('Received Token:', token);
  if (!token) {
    return c.json({ error: 'UNAUTHORIZED', message: 'Missing Token' }, 401);
  }

  try {
    const config = getConfig();
    const secret = new TextEncoder().encode(config.jwtSecret);
    const { payload } = await jwtVerify(token, secret);
    c.set('user', payload);
    await next();
  } catch (error: any) {
    console.error('Auth Error:', error.message);
    const config = getConfig();
    console.log('Secret used:', config.jwtSecret ? config.jwtSecret.substring(0, 3) + '...' : 'undefined');
    return c.json({ error: 'UNAUTHORIZED', message: 'Invalid Token' }, 401);
  }
};
