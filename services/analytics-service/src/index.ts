// src/index.ts

import { Hono } from "hono";
import { logger } from "hono/logger";
import { cors } from "hono/cors";
import { getConfig, validateConfig } from "./config/index.js";
import { bootstrap } from "./infrastructure/container/bootstrap.js";
import { ServiceKeys } from "./infrastructure/container/Container.js";
import { createMetricsRoutes } from "./interfaces/http/routes/metrics.routes.js";
import { createReportsRoutes } from "./interfaces/http/routes/reports.routes.js";
import { createDashboardRoutes } from "./interfaces/http/routes/dashboards.routes.js";
import { errorHandler } from "./interfaces/http/middleware/errorHandler.js";
import { closePool, checkConnection } from "./infrastructure/database/postgres.js";
import { closeRedis, checkRedisConnection } from "./infrastructure/cache/redis.js";
import type { MetricsController } from "./interfaces/http/controllers/MetricsController.js";
import type { ReportsController } from "./interfaces/http/controllers/ReportsController.js";
import type { DashboardController } from "./interfaces/http/controllers/DashboardController.js";

// Load and validate configuration
const config = getConfig();
validateConfig();

// Bootstrap DI container
const container = bootstrap();

// Resolve controllers
const metricsController = container.resolve<MetricsController>(ServiceKeys.MetricsController);
const reportsController = container.resolve<ReportsController>(ServiceKeys.ReportsController);
const dashboardController = container.resolve<DashboardController>(ServiceKeys.DashboardController);

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
  })
);

// Health checks
app.get("/health", async (c) => {
  const dbHealthy = await checkConnection();
  const redisHealthy = await checkRedisConnection();
  const allHealthy = dbHealthy && redisHealthy;

  return c.json(
    {
      status: allHealthy ? "healthy" : "degraded",
      service: config.serviceName,
      uptime: process.uptime(),
      database: dbHealthy ? "connected" : "disconnected",
      redis: redisHealthy ? "connected" : "disconnected",
    },
    allHealthy ? 200 : 503
  );
});

app.get("/ready", async (c) => {
  const dbHealthy = await checkConnection();
  return c.json({ status: dbHealthy ? "ready" : "not_ready" }, dbHealthy ? 200 : 503);
});

app.get("/live", (c) => c.json({ status: "alive" }));

// Mount routes
app.route("/metrics", createMetricsRoutes(metricsController));
app.route("/reports", createReportsRoutes(reportsController));
app.route("/dashboards", createDashboardRoutes(dashboardController));

// 404 handler
app.notFound((c) =>
  c.json(
    {
      error: "NOT_FOUND",
      message: `Route ${c.req.method} ${c.req.path} not found`,
    },
    404
  )
);

// Start server
const server = Bun.serve({
  port: config.port,
  fetch: app.fetch,
});

console.log(`
📊 Analytics Service v1.0
   Port: ${config.port}
   Environment: ${config.nodeEnv}

   Metrics:     /metrics/*
   Reports:     /reports/*
   Dashboards:  /dashboards/*
`);

// Graceful shutdown
process.on("SIGTERM", async () => {
  console.log("Shutting down...");
  server.stop();
  await closePool();
  await closeRedis();
  process.exit(0);
});

process.on("SIGINT", async () => {
  console.log("Interrupted, shutting down...");
  server.stop();
  await closePool();
  await closeRedis();
  process.exit(0);
});

export { app };
