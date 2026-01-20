// src/application/services/MetricsService.ts

import type { IMetricRepository } from "../../domain/repositories/IMetricRepository.js";
import type { MetricSnapshot, MetricType } from "../../domain/entities/MetricSnapshot.js";
import { getTimeRangeForPeriod, createTimeRange, type TimeRange } from "../../domain/value-objects/TimeRange.js";
import { MetricNotFoundError, InvalidTimeRangeError } from "../errors/AnalyticsErrors.js";
import {
  METRIC_METADATA,
  type MetricResponse,
  type MetricHistoryResponse,
  type MetricComparisonResponse,
  type AvailableMetricsResponse,
} from "../dtos/MetricDTOs.js";
import { cacheGet, cacheSet, CacheKeys } from "../../infrastructure/cache/redis.js";

export class MetricsService {
  constructor(private readonly metricRepo: IMetricRepository) { }

  async getCurrentMetric(
    metricType: MetricType,
    gymId: string | null
  ): Promise<MetricResponse> {
    // Check cache first
    const cacheKey = CacheKeys.metric(metricType, gymId, "current");
    const cached = await cacheGet<MetricResponse>(cacheKey);
    if (cached) return cached;

    const metric = await this.metricRepo.getCurrentValue(metricType, gymId);
    if (!metric) {
      throw new MetricNotFoundError(metricType);
    }

    const response = this.mapToResponse(metric);
    await cacheSet(cacheKey, response, 60); // 1 minute cache
    return response;
  }

  async getMultipleMetrics(
    metricTypes: MetricType[],
    gymId: string | null
  ): Promise<MetricResponse[]> {
    const metrics = await this.metricRepo.getMultipleMetrics(metricTypes, gymId);
    return metrics.map((m) => this.mapToResponse(m));
  }

  async getMetricHistory(
    metricType: MetricType,
    gymId: string | null,
    startDate: Date,
    endDate: Date,
    granularity: "hour" | "day" | "week" | "month" = "day"
  ): Promise<MetricHistoryResponse> {
    if (startDate >= endDate) {
      throw new InvalidTimeRangeError("Start date must be before end date");
    }

    const timeRange = createTimeRange(startDate, endDate, granularity);
    const metrics = await this.metricRepo.getHistory(metricType, gymId, timeRange);

    const values = metrics.map((m) => m.value);
    const data = metrics.map((m) => ({
      timestamp: m.periodStart.toISOString(),
      value: m.value,
    }));

    return {
      metricType,
      gymId,
      data,
      summary: {
        min: values.length > 0 ? Math.min(...values) : 0,
        max: values.length > 0 ? Math.max(...values) : 0,
        avg: values.length > 0 ? values.reduce((a, b) => a + b, 0) / values.length : 0,
        total: values.reduce((a, b) => a + b, 0),
      },
    };
  }

  async compareMetrics(
    metricType: MetricType,
    gymId: string | null,
    period: "today" | "week" | "month" | "quarter" | "year"
  ): Promise<MetricComparisonResponse> {
    const currentRange = getTimeRangeForPeriod(period);
    const previousRange = this.getPreviousPeriodRange(currentRange, period);

    const { current, previous } = await this.metricRepo.comparePeriods(
      metricType,
      gymId,
      currentRange,
      previousRange
    );

    const absoluteChange =
      current && previous ? current.value - previous.value : null;
    const percentChange =
      current && previous && previous.value !== 0
        ? ((current.value - previous.value) / previous.value) * 100
        : null;

    let trend: "up" | "down" | "stable" = "stable";
    if (absoluteChange !== null) {
      if (absoluteChange > 0) trend = "up";
      else if (absoluteChange < 0) trend = "down";
    }

    return {
      metricType,
      current: current ? this.mapToResponse(current) : null,
      previous: previous ? this.mapToResponse(previous) : null,
      change: {
        absolute: absoluteChange,
        percent: percentChange,
        trend,
      },
    };
  }

  async getAvailableMetrics(gymId: string | null): Promise<AvailableMetricsResponse> {
    const availableTypes = await this.metricRepo.listAvailableMetrics(gymId);

    // If no data yet, return all possible metrics
    const types = availableTypes.length > 0
      ? availableTypes
      : (Object.keys(METRIC_METADATA) as MetricType[]);

    const metrics = types.map((type) => ({
      type,
      ...METRIC_METADATA[type],
    }));

    return { metrics };
  }

  private mapToResponse(metric: MetricSnapshot): MetricResponse {
    return {
      metricType: metric.metricType,
      value: metric.value,
      previousValue: metric.previousValue,
      percentChange: metric.percentChange,
      periodType: metric.periodType,
      periodStart: metric.periodStart.toISOString(),
      periodEnd: metric.periodEnd.toISOString(),
      metadata: metric.metadata,
    };
  }

  private getPreviousPeriodRange(
    current: TimeRange,
    period: string
  ): TimeRange {
    const duration = current.end.getTime() - current.start.getTime();
    return {
      start: new Date(current.start.getTime() - duration),
      end: new Date(current.end.getTime() - duration),
      granularity: current.granularity,
    };
  }
}
