// src/interfaces/http/middleware/errorHandler.ts

import type { Context, Next } from "hono";
import { AnalyticsError } from "../../../application/errors/AnalyticsErrors.js";

export async function errorHandler(c: Context, next: Next): Promise<Response> {
  try {
    await next();
  } catch (error) {
    console.error("Error:", error);

    if (error instanceof AnalyticsError) {
      return c.json(
        {
          error: error.code,
          message: error.message,
        },
        error.statusCode as 400 | 401 | 403 | 404 | 500
      );
    }

    // Generic error
    const message = error instanceof Error ? error.message : "Internal server error";
    return c.json(
      {
        error: "INTERNAL_ERROR",
        message,
      },
      500
    );
  }

  return c.res;
}
