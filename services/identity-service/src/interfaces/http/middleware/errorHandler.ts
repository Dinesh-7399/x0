// src/interfaces/http/middleware/errorHandler.ts
import type { Context, Next } from 'hono';
import { z } from 'zod';
import { AuthError } from '../../../application/errors/AuthErrors.js';
import { getConfig } from '../../../config/index.js';

/**
 * Global Error Handler Middleware
 */
export async function errorHandler(c: Context, next: Next) {
  try {
    await next();
  } catch (error) {
    const config = getConfig();

    // Zod validation error
    if (error instanceof z.ZodError) {
      return c.json(
        {
          error: 'VALIDATION_ERROR',
          message: 'Invalid request data',
          details: error.issues.map((issue) => ({
            field: issue.path.join('.'),
            message: issue.message,
          })),
        },
        400 as const,
      );
    }

    // Auth error
    if (error instanceof AuthError) {
      return c.json(
        {
          error: error.code,
          message: error.message,
        },
        error.statusCode as 400,
      );
    }

    // Unknown error
    console.error('Unhandled error:', error);

    return c.json(
      {
        error: 'INTERNAL_SERVER_ERROR',
        message: config.nodeEnv === 'development'
          ? (error as Error).message
          : 'An unexpected error occurred',
      },
      500 as const,
    );
  }
}
