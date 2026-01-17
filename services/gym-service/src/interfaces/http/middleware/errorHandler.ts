// src/interfaces/http/middleware/errorHandler.ts

import type { Context, Next } from 'hono';
import { GymError } from '../../../application/errors/GymErrors.js';
import { z } from 'zod';

export async function errorHandler(c: Context, next: Next): Promise<Response | void> {
  try {
    await next();
  } catch (error) {
    // Zod validation error
    if (error instanceof z.ZodError) {
      return c.json({
        error: 'VALIDATION_ERROR',
        message: 'Invalid request data',
        details: error.issues.map(i => ({
          field: i.path.join('.'),
          message: i.message,
        })),
      }, 400);
    }

    // Domain error
    if (error instanceof GymError) {
      return c.json({
        error: error.code,
        message: error.message,
      }, error.statusCode as any);
    }

    // Unknown error
    console.error('[Error] Unhandled:', error);
    return c.json({
      error: 'INTERNAL_ERROR',
      message: 'An unexpected error occurred',
    }, 500);
  }
}
