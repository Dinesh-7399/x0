// src/interfaces/http/controllers/DashboardController.ts

import type { Context } from "hono";
import type { DashboardService } from "../../../application/services/DashboardService.js";
import type { WidgetType } from "../../../domain/entities/Dashboard.js";
import type { MetricType } from "../../../domain/entities/MetricSnapshot.js";

// Helper to get userId from context (from JWT in real app)
function getUserId(c: Context): string {
  // In production, this would come from JWT middleware
  const userId = c.req.header("X-User-ID") || c.req.query("user_id");
  if (!userId) {
    throw new Error("User ID is required");
  }
  return userId;
}

export class DashboardController {
  constructor(private readonly dashboardService: DashboardService) { }

  async listDashboards(c: Context): Promise<Response> {
    const userId = getUserId(c);
    const dashboards = await this.dashboardService.getUserDashboards(userId);
    return c.json({ dashboards });
  }

  async getDashboard(c: Context): Promise<Response> {
    const dashboardId = c.req.param("id");
    const userId = getUserId(c);
    const dashboard = await this.dashboardService.getDashboard(dashboardId, userId);
    return c.json(dashboard);
  }

  async getDefaultDashboard(c: Context): Promise<Response> {
    const userId = getUserId(c);
    const dashboard = await this.dashboardService.getDefaultDashboard(userId);
    if (!dashboard) {
      return c.json({ message: "No default dashboard set" }, 404);
    }
    return c.json(dashboard);
  }

  async createDashboard(c: Context): Promise<Response> {
    const userId = getUserId(c);
    const body = await c.req.json();

    const dashboard = await this.dashboardService.createDashboard({
      userId,
      gymId: body.gymId || null,
      name: body.name,
      description: body.description,
      layout: body.layout,
      isDefault: body.isDefault,
    });

    return c.json(dashboard, 201);
  }

  async updateDashboard(c: Context): Promise<Response> {
    const dashboardId = c.req.param("id");
    const userId = getUserId(c);
    const body = await c.req.json();

    const dashboard = await this.dashboardService.updateDashboard(dashboardId, userId, {
      name: body.name,
      description: body.description,
      layout: body.layout,
      isDefault: body.isDefault,
    });

    return c.json(dashboard);
  }

  async deleteDashboard(c: Context): Promise<Response> {
    const dashboardId = c.req.param("id");
    const userId = getUserId(c);

    await this.dashboardService.deleteDashboard(dashboardId, userId);
    return c.json({ message: "Dashboard deleted" });
  }

  async setDefaultDashboard(c: Context): Promise<Response> {
    const dashboardId = c.req.param("id");
    const userId = getUserId(c);

    await this.dashboardService.setDefaultDashboard(dashboardId, userId);
    return c.json({ message: "Default dashboard updated" });
  }

  // Widget endpoints
  async addWidget(c: Context): Promise<Response> {
    const dashboardId = c.req.param("id");
    const userId = getUserId(c);
    const body = await c.req.json();

    const widget = await this.dashboardService.addWidget(dashboardId, userId, {
      widgetType: body.widgetType as WidgetType,
      metricType: body.metricType as MetricType,
      title: body.title,
      position: body.position,
      config: body.config,
    });

    return c.json(widget, 201);
  }

  async updateWidget(c: Context): Promise<Response> {
    const dashboardId = c.req.param("id");
    const widgetId = c.req.param("widgetId");
    const userId = getUserId(c);
    const body = await c.req.json();

    const widget = await this.dashboardService.updateWidget(dashboardId, widgetId, userId, {
      widgetType: body.widgetType,
      metricType: body.metricType,
      title: body.title,
      position: body.position,
      config: body.config,
    });

    return c.json(widget);
  }

  async deleteWidget(c: Context): Promise<Response> {
    const dashboardId = c.req.param("id");
    const widgetId = c.req.param("widgetId");
    const userId = getUserId(c);

    await this.dashboardService.deleteWidget(dashboardId, widgetId, userId);
    return c.json({ message: "Widget deleted" });
  }
}
