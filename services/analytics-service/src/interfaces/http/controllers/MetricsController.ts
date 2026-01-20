// src/interfaces/http/controllers/MetricsController.ts

import type { Context } from "hono";
import type { MetricsService } from "../../../application/services/MetricsService.js";
import type { MetricType } from "../../../domain/entities/MetricSnapshot.js";

export class MetricsController {
  constructor(private readonly metricsService: MetricsService) { }

  async listMetrics(c: Context): Promise<Response> {
    const gymId = c.req.query("gym_id") || null;
    const available = await this.metricsService.getAvailableMetrics(gymId);
    return c.json(available);
  }

  async getMetric(c: Context): Promise<Response> {
    const metricType = c.req.param("type") as MetricType;
    const gymId = c.req.query("gym_id") || null;

    const metric = await this.metricsService.getCurrentMetric(metricType, gymId);
    return c.json(metric);
  }

  async getMultipleMetrics(c: Context): Promise<Response> {
    const gymId = c.req.query("gym_id") || null;
    const typesParam = c.req.query("types");

    if (!typesParam) {
      return c.json({ error: "INVALID_REQUEST", message: "types query parameter is required" }, 400);
    }

    const metricTypes = typesParam.split(",") as MetricType[];
    const metrics = await this.metricsService.getMultipleMetrics(metricTypes, gymId);
    return c.json({ metrics });
  }

  async getMetricHistory(c: Context): Promise<Response> {
    const metricType = c.req.param("type") as MetricType;
    const gymId = c.req.query("gym_id") || null;
    const startDate = c.req.query("start_date");
    const endDate = c.req.query("end_date");
    const granularity = (c.req.query("granularity") as "hour" | "day" | "week" | "month") || "day";

    if (!startDate || !endDate) {
      return c.json(
        { error: "INVALID_REQUEST", message: "start_date and end_date are required" },
        400
      );
    }

    const history = await this.metricsService.getMetricHistory(
      metricType,
      gymId,
      new Date(startDate),
      new Date(endDate),
      granularity
    );

    return c.json(history);
  }

  async compareMetrics(c: Context): Promise<Response> {
    const metricType = c.req.param("type") as MetricType;
    const gymId = c.req.query("gym_id") || null;
    const period = (c.req.query("period") as "today" | "week" | "month" | "quarter" | "year") || "month";

    const comparison = await this.metricsService.compareMetrics(metricType, gymId, period);
    return c.json(comparison);
  }
}
