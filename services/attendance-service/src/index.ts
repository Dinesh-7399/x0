// src/index.ts

import { Hono } from "hono";
import { logger } from "hono/logger";
import { cors } from "hono/cors";
import { getConfig, validateConfig } from "./config/index.js";
import { bootstrap } from "./infrastructure/container/bootstrap.js";
import { ServiceKeys } from "./infrastructure/container/Container.js";
import { createAttendanceRoutes } from "./interfaces/http/routes/attendance.routes.js";
import { createTokenRoutes } from "./interfaces/http/routes/token.routes.js";
import { errorHandler } from "./interfaces/http/middleware/errorHandler.js";
import { closePool, checkConnection } from "./infrastructure/database/postgres.js";
import type { AttendanceController } from "./interfaces/http/controllers/AttendanceController.js";
import type { TokenController } from "./interfaces/http/controllers/TokenController.js";

// Load and validate configuration
const config = getConfig();
validateConfig();

// Bootstrap DI container
const container = bootstrap();

// Resolve controllers
const attendanceController = container.resolve<AttendanceController>(
  ServiceKeys.AttendanceController,
);
const tokenController = container.resolve<TokenController>(
  ServiceKeys.TokenController,
);

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

// Health checks
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

// Routes
// Note: In real app, we'd have auth middleware here. 
// For POC, assuming gateway handles auth or passed through headers.
// Ideally: app.use("/attendance/*", authMiddleware);

app.route("/attendance", createAttendanceRoutes(attendanceController));
app.route("/tokens", createTokenRoutes(tokenController));

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
🕒 Attendance Service v1.0
   Port: ${config.port}
   Environment: ${config.nodeEnv}
   
   Routes:
     /attendance/*
     /tokens/*
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
