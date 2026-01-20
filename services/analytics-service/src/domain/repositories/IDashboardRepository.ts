// src/domain/repositories/IDashboardRepository.ts

import type {
  Dashboard,
  DashboardWidget,
  CreateDashboardInput,
  UpdateDashboardInput,
  CreateWidgetInput,
  UpdateWidgetInput,
} from "../entities/Dashboard.js";

export interface IDashboardRepository {
  // Dashboard CRUD
  findById(id: string): Promise<Dashboard | null>;
  findByUser(userId: string): Promise<Dashboard[]>;
  findByGym(gymId: string): Promise<Dashboard[]>;
  findDefaultForUser(userId: string): Promise<Dashboard | null>;

  create(input: CreateDashboardInput): Promise<Dashboard>;
  update(id: string, input: UpdateDashboardInput): Promise<Dashboard | null>;
  delete(id: string): Promise<boolean>;

  // Set as default dashboard
  setAsDefault(userId: string, dashboardId: string): Promise<void>;

  // Widget CRUD
  getWidgets(dashboardId: string): Promise<DashboardWidget[]>;
  addWidget(input: CreateWidgetInput): Promise<DashboardWidget>;
  updateWidget(widgetId: string, input: UpdateWidgetInput): Promise<DashboardWidget | null>;
  deleteWidget(widgetId: string): Promise<boolean>;

  // Reorder widgets
  reorderWidgets(dashboardId: string, widgetIds: string[]): Promise<void>;
}
