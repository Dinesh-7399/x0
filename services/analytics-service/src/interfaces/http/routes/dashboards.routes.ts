// src/interfaces/http/routes/dashboards.routes.ts

import { Hono } from "hono";
import type { DashboardController } from "../controllers/DashboardController.js";

export function createDashboardRoutes(controller: DashboardController): Hono {
  const router = new Hono();

  // Dashboard CRUD
  // GET /dashboards - List user's dashboards
  router.get("/", (c) => controller.listDashboards(c));

  // GET /dashboards/default - Get user's default dashboard
  router.get("/default", (c) => controller.getDefaultDashboard(c));

  // POST /dashboards - Create new dashboard
  router.post("/", (c) => controller.createDashboard(c));

  // GET /dashboards/:id - Get specific dashboard
  router.get("/:id", (c) => controller.getDashboard(c));

  // PUT /dashboards/:id - Update dashboard
  router.put("/:id", (c) => controller.updateDashboard(c));

  // DELETE /dashboards/:id - Delete dashboard
  router.delete("/:id", (c) => controller.deleteDashboard(c));

  // POST /dashboards/:id/default - Set as default
  router.post("/:id/default", (c) => controller.setDefaultDashboard(c));

  // Widget routes
  // POST /dashboards/:id/widgets - Add widget
  router.post("/:id/widgets", (c) => controller.addWidget(c));

  // PUT /dashboards/:id/widgets/:widgetId - Update widget
  router.put("/:id/widgets/:widgetId", (c) => controller.updateWidget(c));

  // DELETE /dashboards/:id/widgets/:widgetId - Delete widget
  router.delete("/:id/widgets/:widgetId", (c) => controller.deleteWidget(c));

  return router;
}
