// src/domain/repositories/IReportRepository.ts

import type { AggregatedReport, ReportType, CreateReportInput } from "../entities/AggregatedReport.js";

export interface IReportRepository {
  // Get a specific report
  getReport(reportType: ReportType, gymId: string | null): Promise<AggregatedReport | null>;

  // Get all reports for a gym
  getReportsForGym(gymId: string | null): Promise<AggregatedReport[]>;

  // Check if report is stale
  isReportStale(reportType: ReportType, gymId: string | null): Promise<boolean>;

  // Save or update a report
  upsert(input: CreateReportInput): Promise<AggregatedReport>;

  // Delete a report
  delete(reportType: ReportType, gymId: string | null): Promise<boolean>;

  // Get all stale reports (for regeneration)
  getStaleReports(): Promise<{ reportType: ReportType; gymId: string | null }[]>;

  // List available report types
  listReportTypes(): ReportType[];
}
