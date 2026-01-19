// src/interfaces/http/middleware/errorHandler.ts

import type { Context, Next } from "hono";
import { ZodError } from "zod";
import { NotificationError } from "../../../application/errors/NotificationErrors.js";

export async function errorHandler(c: Context, next: Next) {
  try {
    await next();
  } catch (error) {
    if (error instanceof ZodError) {
      return c.json(
        {
          error: "VALIDATION_ERROR",
          message: "Invalid request data",
          details: error.errors.map((e) => ({
            field: e.path.join("."),
            message: e.message,
          })),
        },
        400,
      );
    }

    if (error instanceof NotificationError) {
      return c.json(
        { error: error.code, message: error.message },
        error.statusCode as 400 | 401 | 403 | 404 | 409 | 429 | 500,
      );
    }

    console.error("Unhandled error:", error);

    const isDev = process.env.NODE_ENV !== "production";
    return c.json(
      {
        error: "INTERNAL_ERROR",
        message: isDev && error instanceof Error ? error.message : "An unexpected error occurred",
      },
      500,
    );
  }
}
