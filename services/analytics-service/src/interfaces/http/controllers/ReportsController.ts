// src/interfaces/http/controllers/ReportsController.ts

import type { Context } from "hono";
import type { ReportService } from "../../../application/services/ReportService.js";
import type { ReportType } from "../../../domain/entities/AggregatedReport.js";

export class ReportsController {
  constructor(private readonly reportService: ReportService) { }

  async listReports(c: Context): Promise<Response> {
    const gymId = c.req.query("gym_id") || null;
    const reports = await this.reportService.listAvailableReports(gymId);
    return c.json(reports);
  }

  async getReport(c: Context): Promise<Response> {
    const reportType = c.req.param("type") as ReportType;
    const gymId = c.req.query("gym_id") || null;

    const report = await this.reportService.getReport(reportType, gymId);
    return c.json(report);
  }

  async getAllReports(c: Context): Promise<Response> {
    const gymId = c.req.query("gym_id") || null;
    const reports = await this.reportService.getAllReports(gymId);
    return c.json({ reports });
  }

  async regenerateReport(c: Context): Promise<Response> {
    const reportType = c.req.param("type") as ReportType;
    const gymId = c.req.query("gym_id") || null;

    const report = await this.reportService.regenerateReport(reportType, gymId);
    return c.json(report);
  }
}
