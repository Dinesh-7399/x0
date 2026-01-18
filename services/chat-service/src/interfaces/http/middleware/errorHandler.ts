// src/interfaces/http/middleware/errorHandler.ts

import type { Context, Next } from 'hono';
import { ZodError } from 'zod';
import { ChatError } from '../../../application/errors/ChatErrors.js';

export async function errorHandler(c: Context, next: Next) {
  try {
    await next();
  } catch (error) {
    // Handle Zod validation errors
    if (error instanceof ZodError) {
      return c.json({
        error: 'VALIDATION_ERROR',
        message: 'Invalid request data',
        details: error.errors.map(e => ({
          path: e.path.join('.'),
          message: e.message,
        })),
      }, 400);
    }

    // Handle application errors
    if (error instanceof ChatError) {
      return c.json({
        error: error.code,
        message: error.message,
      }, error.statusCode as 400 | 401 | 403 | 404 | 500);
    }

    // Handle unknown errors
    console.error('Unhandled error:', error);
    return c.json({
      error: 'INTERNAL_ERROR',
      message: 'An unexpected error occurred',
    }, 500);
  }
}
