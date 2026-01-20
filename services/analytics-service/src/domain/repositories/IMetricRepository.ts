// src/domain/repositories/IMetricRepository.ts

import type { MetricSnapshot, MetricType, PeriodType, CreateMetricSnapshotInput } from "../entities/MetricSnapshot.js";
import type { TimeRange } from "../value-objects/TimeRange.js";

export interface IMetricRepository {
  // Get current metric value
  getCurrentValue(metricType: MetricType, gymId: string | null): Promise<MetricSnapshot | null>;

  // Get metric history
  getHistory(
    metricType: MetricType,
    gymId: string | null,
    timeRange: TimeRange
  ): Promise<MetricSnapshot[]>;

  // Get multiple metrics at once
  getMultipleMetrics(
    metricTypes: MetricType[],
    gymId: string | null
  ): Promise<MetricSnapshot[]>;

  // Compare metrics across periods
  comparePeriods(
    metricType: MetricType,
    gymId: string | null,
    currentPeriod: TimeRange,
    previousPeriod: TimeRange
  ): Promise<{ current: MetricSnapshot | null; previous: MetricSnapshot | null }>;

  // Save a metric snapshot
  save(input: CreateMetricSnapshotInput): Promise<MetricSnapshot>;

  // Upsert - update or insert
  upsert(input: CreateMetricSnapshotInput): Promise<MetricSnapshot>;

  // Bulk save for aggregation jobs
  bulkSave(inputs: CreateMetricSnapshotInput[]): Promise<number>;

  // List all available metric types
  listAvailableMetrics(gymId: string | null): Promise<MetricType[]>;
}
