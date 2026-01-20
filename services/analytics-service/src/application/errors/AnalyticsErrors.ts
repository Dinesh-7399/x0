// src/application/errors/AnalyticsErrors.ts

export class AnalyticsError extends Error {
  constructor(
    message: string,
    public code: string,
    public statusCode: number = 500
  ) {
    super(message);
    this.name = "AnalyticsError";
  }
}

export class MetricNotFoundError extends AnalyticsError {
  constructor(metricType: string) {
    super(`Metric not found: ${metricType}`, "METRIC_NOT_FOUND", 404);
    this.name = "MetricNotFoundError";
  }
}

export class ReportNotFoundError extends AnalyticsError {
  constructor(reportType: string) {
    super(`Report not found: ${reportType}`, "REPORT_NOT_FOUND", 404);
    this.name = "ReportNotFoundError";
  }
}

export class DashboardNotFoundError extends AnalyticsError {
  constructor(dashboardId: string) {
    super(`Dashboard not found: ${dashboardId}`, "DASHBOARD_NOT_FOUND", 404);
    this.name = "DashboardNotFoundError";
  }
}

export class WidgetNotFoundError extends AnalyticsError {
  constructor(widgetId: string) {
    super(`Widget not found: ${widgetId}`, "WIDGET_NOT_FOUND", 404);
    this.name = "WidgetNotFoundError";
  }
}

export class InvalidTimeRangeError extends AnalyticsError {
  constructor(message: string = "Invalid time range specified") {
    super(message, "INVALID_TIME_RANGE", 400);
    this.name = "InvalidTimeRangeError";
  }
}

export class UnauthorizedAccessError extends AnalyticsError {
  constructor(resource: string) {
    super(`Unauthorized access to ${resource}`, "UNAUTHORIZED", 403);
    this.name = "UnauthorizedAccessError";
  }
}
