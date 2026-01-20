// src/infrastructure/database/PostgresMetricRepository.ts

import { getDb } from "./postgres.js";
import type { IMetricRepository } from "../../domain/repositories/IMetricRepository.js";
import type {
  MetricSnapshot,
  MetricType,
  PeriodType,
  CreateMetricSnapshotInput,
} from "../../domain/entities/MetricSnapshot.js";
import type { TimeRange } from "../../domain/value-objects/TimeRange.js";

interface MetricRow {
  id: string;
  metric_type: string;
  gym_id: string | null;
  value: string;
  previous_value: string | null;
  percent_change: string | null;
  period_type: string;
  period_start: Date;
  period_end: Date;
  metadata: Record<string, unknown>;
  created_at: Date;
}

function mapRowToMetric(row: MetricRow): MetricSnapshot {
  return {
    id: row.id,
    metricType: row.metric_type as MetricType,
    gymId: row.gym_id,
    value: parseFloat(row.value),
    previousValue: row.previous_value ? parseFloat(row.previous_value) : null,
    percentChange: row.percent_change ? parseFloat(row.percent_change) : null,
    periodType: row.period_type as PeriodType,
    periodStart: row.period_start,
    periodEnd: row.period_end,
    metadata: row.metadata || {},
    createdAt: row.created_at,
  };
}

export class PostgresMetricRepository implements IMetricRepository {
  async getCurrentValue(
    metricType: MetricType,
    gymId: string | null
  ): Promise<MetricSnapshot | null> {
    const sql = getDb();
    const rows = gymId
      ? await sql<MetricRow[]>`
          SELECT * FROM metric_snapshots
          WHERE metric_type = ${metricType} AND gym_id = ${gymId}
          ORDER BY period_start DESC
          LIMIT 1
        `
      : await sql<MetricRow[]>`
          SELECT * FROM metric_snapshots
          WHERE metric_type = ${metricType} AND gym_id IS NULL
          ORDER BY period_start DESC
          LIMIT 1
        `;
    return rows[0] ? mapRowToMetric(rows[0]) : null;
  }

  async getHistory(
    metricType: MetricType,
    gymId: string | null,
    timeRange: TimeRange
  ): Promise<MetricSnapshot[]> {
    const sql = getDb();
    const rows = gymId
      ? await sql<MetricRow[]>`
          SELECT * FROM metric_snapshots
          WHERE metric_type = ${metricType}
            AND gym_id = ${gymId}
            AND period_start >= ${timeRange.start}
            AND period_end <= ${timeRange.end}
          ORDER BY period_start ASC
        `
      : await sql<MetricRow[]>`
          SELECT * FROM metric_snapshots
          WHERE metric_type = ${metricType}
            AND gym_id IS NULL
            AND period_start >= ${timeRange.start}
            AND period_end <= ${timeRange.end}
          ORDER BY period_start ASC
        `;
    return rows.map(mapRowToMetric);
  }

  async getMultipleMetrics(
    metricTypes: MetricType[],
    gymId: string | null
  ): Promise<MetricSnapshot[]> {
    if (metricTypes.length === 0) return [];
    const sql = getDb();

    const rows = gymId
      ? await sql<MetricRow[]>`
          SELECT DISTINCT ON (metric_type) *
          FROM metric_snapshots
          WHERE metric_type = ANY(${metricTypes}) AND gym_id = ${gymId}
          ORDER BY metric_type, period_start DESC
        `
      : await sql<MetricRow[]>`
          SELECT DISTINCT ON (metric_type) *
          FROM metric_snapshots
          WHERE metric_type = ANY(${metricTypes}) AND gym_id IS NULL
          ORDER BY metric_type, period_start DESC
        `;
    return rows.map(mapRowToMetric);
  }

  async comparePeriods(
    metricType: MetricType,
    gymId: string | null,
    currentPeriod: TimeRange,
    previousPeriod: TimeRange
  ): Promise<{ current: MetricSnapshot | null; previous: MetricSnapshot | null }> {
    const [current, previous] = await Promise.all([
      this.getLatestInRange(metricType, gymId, currentPeriod),
      this.getLatestInRange(metricType, gymId, previousPeriod),
    ]);
    return { current, previous };
  }

  private async getLatestInRange(
    metricType: MetricType,
    gymId: string | null,
    range: TimeRange
  ): Promise<MetricSnapshot | null> {
    const sql = getDb();
    const rows = gymId
      ? await sql<MetricRow[]>`
          SELECT * FROM metric_snapshots
          WHERE metric_type = ${metricType}
            AND gym_id = ${gymId}
            AND period_start >= ${range.start}
            AND period_end <= ${range.end}
          ORDER BY period_start DESC
          LIMIT 1
        `
      : await sql<MetricRow[]>`
          SELECT * FROM metric_snapshots
          WHERE metric_type = ${metricType}
            AND gym_id IS NULL
            AND period_start >= ${range.start}
            AND period_end <= ${range.end}
          ORDER BY period_start DESC
          LIMIT 1
        `;
    return rows[0] ? mapRowToMetric(rows[0]) : null;
  }

  async save(input: CreateMetricSnapshotInput): Promise<MetricSnapshot> {
    const sql = getDb();
    const rows = await sql<MetricRow[]>`
      INSERT INTO metric_snapshots (
        metric_type, gym_id, value, previous_value, percent_change,
        period_type, period_start, period_end, metadata
      ) VALUES (
        ${input.metricType},
        ${input.gymId},
        ${input.value},
        ${input.previousValue ?? null},
        ${input.percentChange ?? null},
        ${input.periodType},
        ${input.periodStart},
        ${input.periodEnd},
        ${JSON.stringify(input.metadata || {})}
      )
      RETURNING *
    `;
    return mapRowToMetric(rows[0]);
  }

  async upsert(input: CreateMetricSnapshotInput): Promise<MetricSnapshot> {
    const sql = getDb();
    const rows = await sql<MetricRow[]>`
      INSERT INTO metric_snapshots (
        metric_type, gym_id, value, previous_value, percent_change,
        period_type, period_start, period_end, metadata
      ) VALUES (
        ${input.metricType},
        ${input.gymId},
        ${input.value},
        ${input.previousValue ?? null},
        ${input.percentChange ?? null},
        ${input.periodType},
        ${input.periodStart},
        ${input.periodEnd},
        ${JSON.stringify(input.metadata || {})}
      )
      ON CONFLICT (metric_type, gym_id, period_type, period_start)
      DO UPDATE SET
        value = EXCLUDED.value,
        previous_value = EXCLUDED.previous_value,
        percent_change = EXCLUDED.percent_change,
        period_end = EXCLUDED.period_end,
        metadata = EXCLUDED.metadata
      RETURNING *
    `;
    return mapRowToMetric(rows[0]);
  }

  async bulkSave(inputs: CreateMetricSnapshotInput[]): Promise<number> {
    if (inputs.length === 0) return 0;

    let saved = 0;
    for (const input of inputs) {
      try {
        await this.upsert(input);
        saved++;
      } catch (err) {
        console.error("Failed to save metric:", input.metricType, err);
      }
    }
    return saved;
  }

  async listAvailableMetrics(gymId: string | null): Promise<MetricType[]> {
    const sql = getDb();
    const rows = gymId
      ? await sql<{ metric_type: string }[]>`
          SELECT DISTINCT metric_type FROM metric_snapshots WHERE gym_id = ${gymId} ORDER BY metric_type
        `
      : await sql<{ metric_type: string }[]>`
          SELECT DISTINCT metric_type FROM metric_snapshots WHERE gym_id IS NULL ORDER BY metric_type
        `;
    return rows.map((r) => r.metric_type as MetricType);
  }
}
