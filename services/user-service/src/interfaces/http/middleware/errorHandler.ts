// src/interfaces/http/middleware/errorHandler.ts

import type { Context, Next } from 'hono';
import { UserError } from '../../../application/errors/UserErrors.js';
import { z } from 'zod';

export async function errorHandler(c: Context, next: Next) {
  try {
    await next();
  } catch (error) {
    if (error instanceof UserError) {
      return c.json({
        error: error.code,
        message: error.message,
      }, error.statusCode as any);
    }

    if (error instanceof z.ZodError) {
      return c.json({
        error: 'VALIDATION_ERROR',
        message: 'Invalid request data',
        details: error.issues,
      }, 400);
    }

    console.error('Unhandled error:', error);
    return c.json({
      error: 'INTERNAL_ERROR',
      message: 'Internal server error',
    }, 500);
  }
}
