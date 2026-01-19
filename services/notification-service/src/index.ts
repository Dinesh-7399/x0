// src/index.ts

import { Hono } from "hono";
import { logger } from "hono/logger";
import { cors } from "hono/cors";
import { getConfig, validateConfig } from "./config/index.js";
import { bootstrap } from "./infrastructure/container/bootstrap.js";
import { ServiceKeys } from "./infrastructure/container/Container.js";
import {
  createNotificationRoutes,
  createInternalRoutes,
} from "./interfaces/http/routes/notification.routes.js";
import { createPreferencesRoutes } from "./interfaces/http/routes/preferences.routes.js";
import { createDeviceRoutes } from "./interfaces/http/routes/device.routes.js";
import { errorHandler } from "./interfaces/http/middleware/errorHandler.js";
import {
  authMiddleware,
  internalAuthMiddleware,
} from "./interfaces/http/middleware/authMiddleware.js";
import { closePool, checkConnection } from "./infrastructure/database/postgres.js";
import type { NotificationController } from "./interfaces/http/controllers/NotificationController.js";
import type { PreferencesController } from "./interfaces/http/controllers/PreferencesController.js";
import type { DeviceController } from "./interfaces/http/controllers/DeviceController.js";

// Load and validate configuration
const config = getConfig();
validateConfig();

// Bootstrap DI container
const container = bootstrap();

// Resolve controllers
const notificationController = container.resolve<NotificationController>(
  ServiceKeys.NotificationController,
);
const preferencesController = container.resolve<PreferencesController>(
  ServiceKeys.PreferencesController,
);
const deviceController = container.resolve<DeviceController>(ServiceKeys.DeviceController);

// Create Hono app
const app = new Hono();

// Global middleware
app.use("*", logger());
app.use("*", errorHandler);
app.use(
  "*",
  cors({
    origin: config.nodeEnv === "development" ? "*" : ["https://gymato.com"],
    credentials: true,
  }),
);

// Health checks (no auth)
app.get("/health", async (c) => {
  const dbHealthy = await checkConnection();
  return c.json(
    {
      status: dbHealthy ? "healthy" : "degraded",
      service: config.serviceName,
      uptime: process.uptime(),
      database: dbHealthy ? "connected" : "disconnected",
    },
    dbHealthy ? 200 : 503,
  );
});
app.get("/ready", (c) => c.json({ status: "ready" }));
app.get("/live", (c) => c.json({ status: "alive" }));

// Internal routes (service-to-service)
app.use("/internal/*", internalAuthMiddleware);
app.route("/internal", createInternalRoutes(notificationController));

// Protected routes
app.use("/notifications/*", authMiddleware);
app.use("/preferences/*", authMiddleware);
app.use("/devices/*", authMiddleware);

// Mount routes
app.route("/notifications", createNotificationRoutes(notificationController));
app.route("/preferences", createPreferencesRoutes(preferencesController));
app.route("/devices", createDeviceRoutes(deviceController));

// 404 handler
app.notFound((c) =>
  c.json(
    {
      error: "NOT_FOUND",
      message: `Route ${c.req.method} ${c.req.path} not found`,
    },
    404,
  ),
);

// Start server
const server = Bun.serve({
  port: config.port,
  fetch: app.fetch,
});

console.log(`
🔔 Notification Service v1.0
   Port: ${config.port}
   Environment: ${config.nodeEnv}
   
   User Routes:
     /notifications/*
     /preferences/*
     /devices/*
   
   Internal Routes:
     /internal/send
`);

// Graceful shutdown
process.on("SIGTERM", async () => {
  console.log("Shutting down...");
  server.stop();
  await closePool();
  process.exit(0);
});

process.on("SIGINT", async () => {
  console.log("Interrupted, shutting down...");
  server.stop();
  await closePool();
  process.exit(0);
});

export { app };
