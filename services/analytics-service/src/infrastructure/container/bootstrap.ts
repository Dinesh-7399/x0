// src/infrastructure/container/bootstrap.ts

import { Container, ServiceKeys } from "./Container.js";

// Repositories
import { PostgresMetricRepository } from "../database/PostgresMetricRepository.js";
import { PostgresReportRepository } from "../database/PostgresReportRepository.js";
import { PostgresDashboardRepository } from "../database/PostgresDashboardRepository.js";

// Services
import { MetricsService } from "../../application/services/MetricsService.js";
import { ReportService } from "../../application/services/ReportService.js";
import { DashboardService } from "../../application/services/DashboardService.js";

// Controllers
import { MetricsController } from "../../interfaces/http/controllers/MetricsController.js";
import { ReportsController } from "../../interfaces/http/controllers/ReportsController.js";
import { DashboardController } from "../../interfaces/http/controllers/DashboardController.js";

export function bootstrap(): Container {
  const container = new Container();

  // Register repositories
  container.register(ServiceKeys.MetricRepository, () => new PostgresMetricRepository());
  container.register(ServiceKeys.ReportRepository, () => new PostgresReportRepository());
  container.register(ServiceKeys.DashboardRepository, () => new PostgresDashboardRepository());

  // Register services
  container.register(ServiceKeys.MetricsService, () => {
    const metricRepo = container.resolve<PostgresMetricRepository>(ServiceKeys.MetricRepository);
    return new MetricsService(metricRepo);
  });

  container.register(ServiceKeys.ReportService, () => {
    const reportRepo = container.resolve<PostgresReportRepository>(ServiceKeys.ReportRepository);
    return new ReportService(reportRepo);
  });

  container.register(ServiceKeys.DashboardService, () => {
    const dashboardRepo = container.resolve<PostgresDashboardRepository>(ServiceKeys.DashboardRepository);
    return new DashboardService(dashboardRepo);
  });

  // Register controllers
  container.register(ServiceKeys.MetricsController, () => {
    const metricsService = container.resolve<MetricsService>(ServiceKeys.MetricsService);
    return new MetricsController(metricsService);
  });

  container.register(ServiceKeys.ReportsController, () => {
    const reportService = container.resolve<ReportService>(ServiceKeys.ReportService);
    return new ReportsController(reportService);
  });

  container.register(ServiceKeys.DashboardController, () => {
    const dashboardService = container.resolve<DashboardService>(ServiceKeys.DashboardService);
    return new DashboardController(dashboardService);
  });

  return container;
}
