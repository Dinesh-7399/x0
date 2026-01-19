// src/interfaces/http/middleware/authMiddleware.ts

import type { Context, Next } from "hono";

export async function authMiddleware(c: Context, next: Next) {
  const userId = c.req.header("x-user-id");

  if (!userId) {
    return c.json({ error: "UNAUTHORIZED", message: "Authentication required" }, 401);
  }

  // Validate UUID format
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(userId)) {
    return c.json({ error: "UNAUTHORIZED", message: "Invalid authentication token" }, 401);
  }

  c.set("userId", userId);
  c.set("userRole", c.req.header("x-user-role") || "user");

  await next();
}

/**
 * Internal service-to-service authentication
 */
export async function internalAuthMiddleware(c: Context, next: Next) {
  const serviceKey = c.req.header("x-service-key");
  const serviceName = c.req.header("x-service-name");

  // In development, allow all internal requests
  if (process.env.NODE_ENV === "development") {
    c.set("serviceName", serviceName || "unknown");
    await next();
    return;
  }

  // In production, verify service key
  if (!serviceKey || serviceKey !== process.env.INTERNAL_SERVICE_KEY) {
    return c.json(
      { error: "UNAUTHORIZED", message: "Invalid service key" },
      401,
    );
  }

  c.set("serviceName", serviceName || "unknown");
  await next();
}
