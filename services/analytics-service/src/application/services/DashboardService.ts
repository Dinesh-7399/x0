// src/application/services/DashboardService.ts

import type { IDashboardRepository } from "../../domain/repositories/IDashboardRepository.js";
import type {
  Dashboard,
  DashboardWidget,
  CreateDashboardInput,
  UpdateDashboardInput,
  CreateWidgetInput,
  UpdateWidgetInput,
} from "../../domain/entities/Dashboard.js";
import { DashboardNotFoundError, WidgetNotFoundError, UnauthorizedAccessError } from "../errors/AnalyticsErrors.js";
import { cacheGet, cacheSet, cacheDelete, CacheKeys } from "../../infrastructure/cache/redis.js";

export interface DashboardResponse {
  id: string;
  userId: string;
  gymId: string | null;
  name: string;
  description: string | null;
  layout: { columns: number; rowHeight: number };
  isDefault: boolean;
  widgets: WidgetResponse[];
  createdAt: string;
  updatedAt: string;
}

export interface WidgetResponse {
  id: string;
  widgetType: string;
  metricType: string;
  title: string;
  position: { x: number; y: number; w: number; h: number };
  config: Record<string, unknown>;
}

export class DashboardService {
  constructor(private readonly dashboardRepo: IDashboardRepository) { }

  async getDashboard(dashboardId: string, userId: string): Promise<DashboardResponse> {
    const dashboard = await this.dashboardRepo.findById(dashboardId);
    if (!dashboard) {
      throw new DashboardNotFoundError(dashboardId);
    }

    // Authorization check
    if (dashboard.userId !== userId) {
      throw new UnauthorizedAccessError("dashboard");
    }

    return this.mapToResponse(dashboard);
  }

  async getUserDashboards(userId: string): Promise<DashboardResponse[]> {
    const dashboards = await this.dashboardRepo.findByUser(userId);
    return dashboards.map((d) => this.mapToResponse(d));
  }

  async getDefaultDashboard(userId: string): Promise<DashboardResponse | null> {
    const dashboard = await this.dashboardRepo.findDefaultForUser(userId);
    return dashboard ? this.mapToResponse(dashboard) : null;
  }

  async createDashboard(input: CreateDashboardInput): Promise<DashboardResponse> {
    const dashboard = await this.dashboardRepo.create(input);
    return this.mapToResponse(dashboard);
  }

  async updateDashboard(
    dashboardId: string,
    userId: string,
    input: UpdateDashboardInput
  ): Promise<DashboardResponse> {
    const existing = await this.dashboardRepo.findById(dashboardId);
    if (!existing) {
      throw new DashboardNotFoundError(dashboardId);
    }

    if (existing.userId !== userId) {
      throw new UnauthorizedAccessError("dashboard");
    }

    const updated = await this.dashboardRepo.update(dashboardId, input);
    if (!updated) {
      throw new DashboardNotFoundError(dashboardId);
    }

    // Invalidate cache
    await cacheDelete(CacheKeys.dashboard(dashboardId));

    return this.mapToResponse(updated);
  }

  async deleteDashboard(dashboardId: string, userId: string): Promise<void> {
    const existing = await this.dashboardRepo.findById(dashboardId);
    if (!existing) {
      throw new DashboardNotFoundError(dashboardId);
    }

    if (existing.userId !== userId) {
      throw new UnauthorizedAccessError("dashboard");
    }

    await this.dashboardRepo.delete(dashboardId);
    await cacheDelete(CacheKeys.dashboard(dashboardId));
  }

  async setDefaultDashboard(dashboardId: string, userId: string): Promise<void> {
    const existing = await this.dashboardRepo.findById(dashboardId);
    if (!existing) {
      throw new DashboardNotFoundError(dashboardId);
    }

    if (existing.userId !== userId) {
      throw new UnauthorizedAccessError("dashboard");
    }

    await this.dashboardRepo.setAsDefault(userId, dashboardId);
  }

  // Widget operations
  async addWidget(dashboardId: string, userId: string, input: Omit<CreateWidgetInput, "dashboardId">): Promise<WidgetResponse> {
    const dashboard = await this.dashboardRepo.findById(dashboardId);
    if (!dashboard) {
      throw new DashboardNotFoundError(dashboardId);
    }

    if (dashboard.userId !== userId) {
      throw new UnauthorizedAccessError("dashboard");
    }

    const widget = await this.dashboardRepo.addWidget({
      ...input,
      dashboardId,
    });

    await cacheDelete(CacheKeys.dashboard(dashboardId));
    return this.mapWidgetToResponse(widget);
  }

  async updateWidget(
    dashboardId: string,
    widgetId: string,
    userId: string,
    input: UpdateWidgetInput
  ): Promise<WidgetResponse> {
    const dashboard = await this.dashboardRepo.findById(dashboardId);
    if (!dashboard) {
      throw new DashboardNotFoundError(dashboardId);
    }

    if (dashboard.userId !== userId) {
      throw new UnauthorizedAccessError("dashboard");
    }

    const widget = await this.dashboardRepo.updateWidget(widgetId, input);
    if (!widget) {
      throw new WidgetNotFoundError(widgetId);
    }

    await cacheDelete(CacheKeys.dashboard(dashboardId));
    return this.mapWidgetToResponse(widget);
  }

  async deleteWidget(dashboardId: string, widgetId: string, userId: string): Promise<void> {
    const dashboard = await this.dashboardRepo.findById(dashboardId);
    if (!dashboard) {
      throw new DashboardNotFoundError(dashboardId);
    }

    if (dashboard.userId !== userId) {
      throw new UnauthorizedAccessError("dashboard");
    }

    await this.dashboardRepo.deleteWidget(widgetId);
    await cacheDelete(CacheKeys.dashboard(dashboardId));
  }

  private mapToResponse(dashboard: Dashboard): DashboardResponse {
    return {
      id: dashboard.id,
      userId: dashboard.userId,
      gymId: dashboard.gymId,
      name: dashboard.name,
      description: dashboard.description,
      layout: dashboard.layout,
      isDefault: dashboard.isDefault,
      widgets: dashboard.widgets.map((w) => this.mapWidgetToResponse(w)),
      createdAt: dashboard.createdAt.toISOString(),
      updatedAt: dashboard.updatedAt.toISOString(),
    };
  }

  private mapWidgetToResponse(widget: DashboardWidget): WidgetResponse {
    return {
      id: widget.id,
      widgetType: widget.widgetType,
      metricType: widget.metricType,
      title: widget.title,
      position: widget.position,
      config: widget.config,
    };
  }
}
