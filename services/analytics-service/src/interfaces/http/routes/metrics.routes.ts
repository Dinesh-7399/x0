// src/interfaces/http/routes/metrics.routes.ts

import { Hono } from "hono";
import type { MetricsController } from "../controllers/MetricsController.js";

export function createMetricsRoutes(controller: MetricsController): Hono {
  const router = new Hono();

  // GET /metrics - List available metrics
  router.get("/", (c) => controller.listMetrics(c));

  // GET /metrics/batch - Get multiple metrics at once
  router.get("/batch", (c) => controller.getMultipleMetrics(c));

  // GET /metrics/:type - Get current metric value
  router.get("/:type", (c) => controller.getMetric(c));

  // GET /metrics/:type/history - Get metric history
  router.get("/:type/history", (c) => controller.getMetricHistory(c));

  // GET /metrics/:type/compare - Compare metric across periods
  router.get("/:type/compare", (c) => controller.compareMetrics(c));

  return router;
}
