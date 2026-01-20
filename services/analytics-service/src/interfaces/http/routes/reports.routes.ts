// src/interfaces/http/routes/reports.routes.ts

import { Hono } from "hono";
import type { ReportsController } from "../controllers/ReportsController.js";

export function createReportsRoutes(controller: ReportsController): Hono {
  const router = new Hono();

  // GET /reports - List available report types
  router.get("/", (c) => controller.listReports(c));

  // GET /reports/all - Get all reports for a gym
  router.get("/all", (c) => controller.getAllReports(c));

  // GET /reports/:type - Get specific report
  router.get("/:type", (c) => controller.getReport(c));

  // POST /reports/:type/regenerate - Force regenerate report
  router.post("/:type/regenerate", (c) => controller.regenerateReport(c));

  return router;
}
