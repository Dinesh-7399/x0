// src/interfaces/http/middleware/errorHandler.ts

import type { Context, Next } from "hono";
import { ZodError } from "zod";
import { AttendanceError } from "../../../application/errors/AttendanceErrors.js";

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

    if (error instanceof AttendanceError) {
      return c.json(
        { error: error.code, message: error.message },
        error.statusCode as any,
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
