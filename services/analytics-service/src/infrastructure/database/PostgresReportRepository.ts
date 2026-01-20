// src/infrastructure/database/PostgresReportRepository.ts

import { getDb } from "./postgres.js";
import type { IReportRepository } from "../../domain/repositories/IReportRepository.js";
import type {
  AggregatedReport,
  ReportType,
  ReportData,
  CreateReportInput,
} from "../../domain/entities/AggregatedReport.js";

interface ReportRow {
  id: string;
  report_type: string;
  gym_id: string | null;
  data: ReportData;
  generated_at: Date;
  valid_until: Date;
  version: number;
}

function mapRowToReport(row: ReportRow): AggregatedReport {
  return {
    id: row.id,
    reportType: row.report_type as ReportType,
    gymId: row.gym_id,
    data: row.data,
    generatedAt: row.generated_at,
    validUntil: row.valid_until,
    version: row.version,
  };
}

const ALL_REPORT_TYPES: ReportType[] = [
  "gym_overview",
  "member_analytics",
  "revenue_report",
  "attendance_patterns",
  "trainer_performance",
  "workout_trends",
];

export class PostgresReportRepository implements IReportRepository {
  async getReport(
    reportType: ReportType,
    gymId: string | null
  ): Promise<AggregatedReport | null> {
    const sql = getDb();
    const rows = gymId
      ? await sql<ReportRow[]>`
          SELECT * FROM aggregated_reports
          WHERE report_type = ${reportType} AND gym_id = ${gymId}
        `
      : await sql<ReportRow[]>`
          SELECT * FROM aggregated_reports
          WHERE report_type = ${reportType} AND gym_id IS NULL
        `;
    return rows[0] ? mapRowToReport(rows[0]) : null;
  }

  async getReportsForGym(gymId: string | null): Promise<AggregatedReport[]> {
    const sql = getDb();
    const rows = gymId
      ? await sql<ReportRow[]>`
          SELECT * FROM aggregated_reports WHERE gym_id = ${gymId} ORDER BY report_type
        `
      : await sql<ReportRow[]>`
          SELECT * FROM aggregated_reports WHERE gym_id IS NULL ORDER BY report_type
        `;
    return rows.map(mapRowToReport);
  }

  async isReportStale(
    reportType: ReportType,
    gymId: string | null
  ): Promise<boolean> {
    const sql = getDb();
    const rows = gymId
      ? await sql<{ valid_until: Date }[]>`
          SELECT valid_until FROM aggregated_reports
          WHERE report_type = ${reportType} AND gym_id = ${gymId}
        `
      : await sql<{ valid_until: Date }[]>`
          SELECT valid_until FROM aggregated_reports
          WHERE report_type = ${reportType} AND gym_id IS NULL
        `;

    if (rows.length === 0) return true;
    return new Date() > rows[0].valid_until;
  }

  async upsert(input: CreateReportInput): Promise<AggregatedReport> {
    const sql = getDb();
    const rows = await sql<ReportRow[]>`
      INSERT INTO aggregated_reports (report_type, gym_id, data, valid_until)
      VALUES (${input.reportType}, ${input.gymId}, ${JSON.stringify(input.data)}, ${input.validUntil})
      ON CONFLICT (report_type, gym_id)
      DO UPDATE SET
        data = EXCLUDED.data,
        generated_at = NOW(),
        valid_until = EXCLUDED.valid_until,
        version = aggregated_reports.version + 1
      RETURNING *
    `;
    return mapRowToReport(rows[0]);
  }

  async delete(reportType: ReportType, gymId: string | null): Promise<boolean> {
    const sql = getDb();
    if (gymId) {
      await sql`DELETE FROM aggregated_reports WHERE report_type = ${reportType} AND gym_id = ${gymId}`;
    } else {
      await sql`DELETE FROM aggregated_reports WHERE report_type = ${reportType} AND gym_id IS NULL`;
    }
    return true;
  }

  async getStaleReports(): Promise<
    { reportType: ReportType; gymId: string | null }[]
  > {
    const sql = getDb();
    const rows = await sql<{ report_type: string; gym_id: string | null }[]>`
      SELECT report_type, gym_id FROM aggregated_reports WHERE valid_until < NOW()
    `;
    return rows.map((r) => ({
      reportType: r.report_type as ReportType,
      gymId: r.gym_id,
    }));
  }

  listReportTypes(): ReportType[] {
    return ALL_REPORT_TYPES;
  }
}
