// src/domain/entities/Dashboard.ts

import type { MetricType } from "./MetricSnapshot.js";

export type WidgetType = "line_chart" | "bar_chart" | "pie_chart" | "stat_card" | "table";

export interface WidgetPosition {
  x: number;
  y: number;
  w: number;
  h: number;
}

export interface WidgetConfig {
  colors?: string[];
  showLegend?: boolean;
  showLabels?: boolean;
  timeRange?: "day" | "week" | "month" | "year";
  limit?: number;
  [key: string]: unknown;
}

export interface DashboardWidget {
  id: string;
  dashboardId: string;
  widgetType: WidgetType;
  metricType: MetricType;
  title: string;
  position: WidgetPosition;
  config: WidgetConfig;
  createdAt: Date;
  updatedAt: Date;
}

export interface DashboardLayout {
  columns: number;
  rowHeight: number;
}

export interface Dashboard {
  id: string;
  userId: string;
  gymId: string | null;
  name: string;
  description: string | null;
  layout: DashboardLayout;
  isDefault: boolean;
  widgets: DashboardWidget[];
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateDashboardInput {
  userId: string;
  gymId?: string | null;
  name: string;
  description?: string;
  layout?: DashboardLayout;
  isDefault?: boolean;
}

export interface UpdateDashboardInput {
  name?: string;
  description?: string;
  layout?: DashboardLayout;
  isDefault?: boolean;
}

export interface CreateWidgetInput {
  dashboardId: string;
  widgetType: WidgetType;
  metricType: MetricType;
  title: string;
  position?: WidgetPosition;
  config?: WidgetConfig;
}

export interface UpdateWidgetInput {
  widgetType?: WidgetType;
  metricType?: MetricType;
  title?: string;
  position?: WidgetPosition;
  config?: WidgetConfig;
}
