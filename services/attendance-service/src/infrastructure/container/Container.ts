// src/infrastructure/container/Container.ts

export class Container {
  private services = new Map<string, unknown>();

  register<T>(key: string, factory: () => T): void {
    if (!this.services.has(key)) {
      this.services.set(key, factory());
    }
  }

  resolve<T>(key: string): T {
    const service = this.services.get(key);
    if (!service) {
      throw new Error(`Service ${key} not registered`);
    }
    return service as T;
  }
}

export const ServiceKeys = {
  // Repositories
  AttendanceRepository: "AttendanceRepository",
  MemberStreakRepository: "MemberStreakRepository",
  GymCapacityRepository: "GymCapacityRepository",
  CheckInTokenRepository: "CheckInTokenRepository",

  // Services
  AttendanceService: "AttendanceService",
  MembershipService: "MembershipService", // External

  // Controllers
  AttendanceController: "AttendanceController",
  TokenController: "TokenController",
} as const;
