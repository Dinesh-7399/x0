// src/interfaces/http/middleware/errorHandler.ts

import type { Context, Next } from 'hono';
import { ZodError } from 'zod';
import { WorkoutError } from '../../../application/errors/WorkoutErrors.js';

export async function errorHandler(c: Context, next: Next) {
  try {
    await next();
  } catch (error) {
    // Handle Zod validation errors
    if (error instanceof ZodError) {
      return c.json(
        {
          error: 'VALIDATION_ERROR',
          message: 'Invalid request data',
          details: error.errors.map((e) => ({
            field: e.path.join('.'),
            message: e.message,
          })),
        },
        400,
      );
    }

    // Handle application errors
    if (error instanceof WorkoutError) {
      return c.json(
        {
          error: error.code,
          message: error.message,
        },
        error.statusCode as 400 | 401 | 403 | 404 | 409 | 429 | 500,
      );
    }

    // Log unexpected errors
    console.error('Unhandled error:', error);

    // Don't expose internal error details in production
    const isDev = process.env.NODE_ENV !== 'production';
    return c.json(
      {
        error: 'INTERNAL_ERROR',
        message: isDev && error instanceof Error ? error.message : 'An unexpected error occurred',
      },
      500,
    );
  }
}
