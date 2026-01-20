// src/application/services/ReportService.ts

import type { IReportRepository } from "../../domain/repositories/IReportRepository.js";
import type { AggregatedReport, ReportType, ReportData } from "../../domain/entities/AggregatedReport.js";
import { ReportNotFoundError } from "../errors/AnalyticsErrors.js";
import { cacheGet, cacheSet, CacheKeys, cacheDelete } from "../../infrastructure/cache/redis.js";

export interface ReportResponse {
  reportType: ReportType;
  gymId: string | null;
  data: ReportData;
  generatedAt: string;
  validUntil: string;
  isStale: boolean;
}

export interface ReportListResponse {
  reports: {
    type: ReportType;
    name: string;
    description: string;
    available: boolean;
  }[];
}

const REPORT_METADATA: Record<ReportType, { name: string; description: string }> = {
  gym_overview: { name: "Gym Overview", description: "High-level gym performance metrics" },
  member_analytics: { name: "Member Analytics", description: "Detailed member demographics and behavior" },
  revenue_report: { name: "Revenue Report", description: "Financial performance and trends" },
  attendance_patterns: { name: "Attendance Patterns", description: "Check-in patterns and capacity usage" },
  trainer_performance: { name: "Trainer Performance", description: "Trainer utilization and ratings" },
  workout_trends: { name: "Workout Trends", description: "Exercise popularity and completion rates" },
};

export class ReportService {
  constructor(private readonly reportRepo: IReportRepository) { }

  async getReport(
    reportType: ReportType,
    gymId: string | null
  ): Promise<ReportResponse> {
    // Check cache first
    const cacheKey = CacheKeys.report(reportType, gymId);
    const cached = await cacheGet<ReportResponse>(cacheKey);
    if (cached && !cached.isStale) return cached;

    const report = await this.reportRepo.getReport(reportType, gymId);
    if (!report) {
      throw new ReportNotFoundError(reportType);
    }

    const isStale = await this.reportRepo.isReportStale(reportType, gymId);
    const response = this.mapToResponse(report, isStale);

    // Cache for 15 minutes if not stale
    if (!isStale) {
      await cacheSet(cacheKey, response, 900);
    }

    return response;
  }

  async getAllReports(gymId: string | null): Promise<ReportResponse[]> {
    const reports = await this.reportRepo.getReportsForGym(gymId);
    const results = await Promise.all(
      reports.map(async (report) => {
        const isStale = await this.reportRepo.isReportStale(report.reportType, gymId);
        return this.mapToResponse(report, isStale);
      })
    );
    return results;
  }

  async listAvailableReports(gymId: string | null): Promise<ReportListResponse> {
    const existingReports = await this.reportRepo.getReportsForGym(gymId);
    const existingTypes = new Set(existingReports.map((r) => r.reportType));

    const allTypes = this.reportRepo.listReportTypes();
    const reports = allTypes.map((type) => ({
      type,
      ...REPORT_METADATA[type],
      available: existingTypes.has(type),
    }));

    return { reports };
  }

  async regenerateReport(
    reportType: ReportType,
    gymId: string | null
  ): Promise<ReportResponse> {
    // This would call aggregation logic to regenerate the report
    // For now, just invalidate cache and return existing
    const cacheKey = CacheKeys.report(reportType, gymId);
    await cacheDelete(cacheKey);

    const report = await this.reportRepo.getReport(reportType, gymId);
    if (!report) {
      throw new ReportNotFoundError(reportType);
    }

    return this.mapToResponse(report, false);
  }

  async saveReport(
    reportType: ReportType,
    gymId: string | null,
    data: ReportData,
    validForHours: number = 24
  ): Promise<ReportResponse> {
    const validUntil = new Date();
    validUntil.setHours(validUntil.getHours() + validForHours);

    const report = await this.reportRepo.upsert({
      reportType,
      gymId,
      data,
      validUntil,
    });

    // Invalidate cache
    const cacheKey = CacheKeys.report(reportType, gymId);
    await cacheDelete(cacheKey);

    return this.mapToResponse(report, false);
  }

  private mapToResponse(report: AggregatedReport, isStale: boolean): ReportResponse {
    return {
      reportType: report.reportType,
      gymId: report.gymId,
      data: report.data,
      generatedAt: report.generatedAt.toISOString(),
      validUntil: report.validUntil.toISOString(),
      isStale,
    };
  }
}
