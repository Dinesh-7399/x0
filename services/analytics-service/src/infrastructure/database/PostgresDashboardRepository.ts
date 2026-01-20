// src/infrastructure/database/PostgresDashboardRepository.ts

import { getDb } from "./postgres.js";
import type { IDashboardRepository } from "../../domain/repositories/IDashboardRepository.js";
import type {
  Dashboard,
  DashboardWidget,
  DashboardLayout,
  WidgetConfig,
  CreateDashboardInput,
  UpdateDashboardInput,
  CreateWidgetInput,
  UpdateWidgetInput,
} from "../../domain/entities/Dashboard.js";
import type { MetricType } from "../../domain/entities/MetricSnapshot.js";

interface DashboardRow {
  id: string;
  user_id: string;
  gym_id: string | null;
  name: string;
  description: string | null;
  layout: DashboardLayout;
  is_default: boolean;
  created_at: Date;
  updated_at: Date;
}

interface WidgetRow {
  id: string;
  dashboard_id: string;
  widget_type: string;
  metric_type: string;
  title: string;
  position_x: number;
  position_y: number;
  width: number;
  height: number;
  config: WidgetConfig;
  created_at: Date;
  updated_at: Date;
}

function mapRowToDashboard(row: DashboardRow, widgets: DashboardWidget[] = []): Dashboard {
  return {
    id: row.id,
    userId: row.user_id,
    gymId: row.gym_id,
    name: row.name,
    description: row.description,
    layout: row.layout || { columns: 12, rowHeight: 100 },
    isDefault: row.is_default,
    widgets,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function mapRowToWidget(row: WidgetRow): DashboardWidget {
  return {
    id: row.id,
    dashboardId: row.dashboard_id,
    widgetType: row.widget_type as DashboardWidget["widgetType"],
    metricType: row.metric_type as MetricType,
    title: row.title,
    position: {
      x: row.position_x,
      y: row.position_y,
      w: row.width,
      h: row.height,
    },
    config: row.config || {},
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export class PostgresDashboardRepository implements IDashboardRepository {
  async findById(id: string): Promise<Dashboard | null> {
    const sql = getDb();
    const rows = await sql<DashboardRow[]>`SELECT * FROM analytics_dashboards WHERE id = ${id}`;
    if (rows.length === 0) return null;

    const widgets = await this.getWidgets(id);
    return mapRowToDashboard(rows[0], widgets);
  }

  async findByUser(userId: string): Promise<Dashboard[]> {
    const sql = getDb();
    const rows = await sql<DashboardRow[]>`
      SELECT * FROM analytics_dashboards WHERE user_id = ${userId} ORDER BY is_default DESC, name
    `;
    return Promise.all(
      rows.map(async (row) => {
        const widgets = await this.getWidgets(row.id);
        return mapRowToDashboard(row, widgets);
      })
    );
  }

  async findByGym(gymId: string): Promise<Dashboard[]> {
    const sql = getDb();
    const rows = await sql<DashboardRow[]>`
      SELECT * FROM analytics_dashboards WHERE gym_id = ${gymId} ORDER BY name
    `;
    return Promise.all(
      rows.map(async (row) => {
        const widgets = await this.getWidgets(row.id);
        return mapRowToDashboard(row, widgets);
      })
    );
  }

  async findDefaultForUser(userId: string): Promise<Dashboard | null> {
    const sql = getDb();
    const rows = await sql<DashboardRow[]>`
      SELECT * FROM analytics_dashboards WHERE user_id = ${userId} AND is_default = TRUE LIMIT 1
    `;
    if (rows.length === 0) return null;

    const widgets = await this.getWidgets(rows[0].id);
    return mapRowToDashboard(rows[0], widgets);
  }

  async create(input: CreateDashboardInput): Promise<Dashboard> {
    const sql = getDb();
    const rows = await sql<DashboardRow[]>`
      INSERT INTO analytics_dashboards (user_id, gym_id, name, description, layout, is_default)
      VALUES (
        ${input.userId},
        ${input.gymId ?? null},
        ${input.name},
        ${input.description ?? null},
        ${JSON.stringify(input.layout || { columns: 12, rowHeight: 100 })},
        ${input.isDefault ?? false}
      )
      RETURNING *
    `;
    return mapRowToDashboard(rows[0], []);
  }

  async update(id: string, input: UpdateDashboardInput): Promise<Dashboard | null> {
    const sql = getDb();

    // If no updates, just return current
    if (
      input.name === undefined &&
      input.description === undefined &&
      input.layout === undefined &&
      input.isDefault === undefined
    ) {
      return this.findById(id);
    }

    // Use explicit values with null coalescing for postgres.js
    const nameVal = input.name ?? null;
    const descVal = input.description ?? null;
    const layoutVal = input.layout ? JSON.stringify(input.layout) : null;
    const isDefaultVal = input.isDefault ?? null;

    const rows = await sql<DashboardRow[]>`
      UPDATE analytics_dashboards
      SET name = COALESCE(${nameVal}, name),
          description = COALESCE(${descVal}, description),
          layout = COALESCE(${layoutVal}::jsonb, layout),
          is_default = COALESCE(${isDefaultVal}, is_default)
      WHERE id = ${id}
      RETURNING *
    `;

    if (rows.length === 0) return null;

    const widgets = await this.getWidgets(id);
    return mapRowToDashboard(rows[0], widgets);
  }

  async delete(id: string): Promise<boolean> {
    const sql = getDb();
    await sql`DELETE FROM analytics_dashboards WHERE id = ${id}`;
    return true;
  }

  async setAsDefault(userId: string, dashboardId: string): Promise<void> {
    const sql = getDb();
    await sql`UPDATE analytics_dashboards SET is_default = FALSE WHERE user_id = ${userId}`;
    await sql`UPDATE analytics_dashboards SET is_default = TRUE WHERE id = ${dashboardId}`;
  }

  async getWidgets(dashboardId: string): Promise<DashboardWidget[]> {
    const sql = getDb();
    const rows = await sql<WidgetRow[]>`
      SELECT * FROM dashboard_widgets WHERE dashboard_id = ${dashboardId} ORDER BY position_y, position_x
    `;
    return rows.map(mapRowToWidget);
  }

  async addWidget(input: CreateWidgetInput): Promise<DashboardWidget> {
    const sql = getDb();
    const pos = input.position || { x: 0, y: 0, w: 4, h: 2 };
    const rows = await sql<WidgetRow[]>`
      INSERT INTO dashboard_widgets (
        dashboard_id, widget_type, metric_type, title,
        position_x, position_y, width, height, config
      ) VALUES (
        ${input.dashboardId},
        ${input.widgetType},
        ${input.metricType},
        ${input.title},
        ${pos.x},
        ${pos.y},
        ${pos.w},
        ${pos.h},
        ${JSON.stringify(input.config || {})}
      )
      RETURNING *
    `;
    return mapRowToWidget(rows[0]);
  }

  async updateWidget(
    widgetId: string,
    input: UpdateWidgetInput
  ): Promise<DashboardWidget | null> {
    const sql = getDb();

    // Use explicit values with null coalescing for postgres.js
    const widgetTypeVal = input.widgetType ?? null;
    const metricTypeVal = input.metricType ?? null;
    const titleVal = input.title ?? null;
    const posXVal = input.position?.x ?? null;
    const posYVal = input.position?.y ?? null;
    const widthVal = input.position?.w ?? null;
    const heightVal = input.position?.h ?? null;
    const configVal = input.config ? JSON.stringify(input.config) : null;

    const rows = await sql<WidgetRow[]>`
      UPDATE dashboard_widgets
      SET widget_type = COALESCE(${widgetTypeVal}, widget_type),
          metric_type = COALESCE(${metricTypeVal}, metric_type),
          title = COALESCE(${titleVal}, title),
          position_x = COALESCE(${posXVal}, position_x),
          position_y = COALESCE(${posYVal}, position_y),
          width = COALESCE(${widthVal}, width),
          height = COALESCE(${heightVal}, height),
          config = COALESCE(${configVal}::jsonb, config)
      WHERE id = ${widgetId}
      RETURNING *
    `;

    return rows[0] ? mapRowToWidget(rows[0]) : null;
  }

  async deleteWidget(widgetId: string): Promise<boolean> {
    const sql = getDb();
    await sql`DELETE FROM dashboard_widgets WHERE id = ${widgetId}`;
    return true;
  }

  async reorderWidgets(dashboardId: string, widgetIds: string[]): Promise<void> {
    const sql = getDb();
    for (let i = 0; i < widgetIds.length; i++) {
      await sql`
        UPDATE dashboard_widgets SET position_y = ${i} 
        WHERE id = ${widgetIds[i]} AND dashboard_id = ${dashboardId}
      `;
    }
  }
}
