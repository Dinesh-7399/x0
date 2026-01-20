// src/infrastructure/container/Container.ts

type Factory<T> = () => T;

export class Container {
  private services: Map<string, unknown> = new Map();
  private factories: Map<string, Factory<unknown>> = new Map();

  register<T>(key: string, factory: Factory<T>): void {
    this.factories.set(key, factory as Factory<unknown>);
  }

  registerInstance<T>(key: string, instance: T): void {
    this.services.set(key, instance);
  }

  resolve<T>(key: string): T {
    // Check if already instantiated
    if (this.services.has(key)) {
      return this.services.get(key) as T;
    }

    // Check if factory exists
    const factory = this.factories.get(key);
    if (!factory) {
      throw new Error(`Service not registered: ${key}`);
    }

    // Create instance and cache it
    const instance = factory() as T;
    this.services.set(key, instance);
    return instance;
  }

  has(key: string): boolean {
    return this.services.has(key) || this.factories.has(key);
  }
}

// Service keys for dependency injection
export const ServiceKeys = {
  // Repositories
  MetricRepository: "MetricRepository",
  ReportRepository: "ReportRepository",
  DashboardRepository: "DashboardRepository",

  // Services
  MetricsService: "MetricsService",
  ReportService: "ReportService",
  DashboardService: "DashboardService",
  AggregationService: "AggregationService",

  // Controllers
  MetricsController: "MetricsController",
  ReportsController: "ReportsController",
  DashboardController: "DashboardController",
} as const;
