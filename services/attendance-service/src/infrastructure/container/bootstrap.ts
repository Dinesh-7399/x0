// src/infrastructure/container/bootstrap.ts

import { Container, ServiceKeys } from "./Container.js";

// Repositories
import { PostgresAttendanceRepository } from "../database/PostgresAttendanceRepository.js";
import { PostgresMemberStreakRepository } from "../database/PostgresMemberStreakRepository.js";
import { PostgresGymCapacityRepository } from "../database/PostgresGymCapacityRepository.js";
import { PostgresCheckInTokenRepository } from "../database/PostgresCheckInTokenRepository.js";

// Services
import { AttendanceService } from "../../application/services/AttendanceService.js";

// Controllers
import { AttendanceController } from "../../interfaces/http/controllers/AttendanceController.js";
import { TokenController } from "../../interfaces/http/controllers/TokenController.js";

// Mock External Service
class MockMembershipService {
  async validateAccess(memberId: string, gymId: string) {
    // In real app, make http call to Membership Service
    return { valid: true, membershipId: "mock-membership-uuid" };
  }
}

export function bootstrap(): Container {
  const container = new Container();

  // Register repositories
  container.register(ServiceKeys.AttendanceRepository, () => new PostgresAttendanceRepository());
  container.register(ServiceKeys.MemberStreakRepository, () => new PostgresMemberStreakRepository());
  container.register(ServiceKeys.GymCapacityRepository, () => new PostgresGymCapacityRepository());
  container.register(ServiceKeys.CheckInTokenRepository, () => new PostgresCheckInTokenRepository());
  container.register(ServiceKeys.MembershipService, () => new MockMembershipService());

  // Register services
  container.register(
    ServiceKeys.AttendanceService,
    () =>
      new AttendanceService(
        container.resolve(ServiceKeys.AttendanceRepository),
        container.resolve(ServiceKeys.GymCapacityRepository),
        container.resolve(ServiceKeys.MemberStreakRepository),
        container.resolve(ServiceKeys.CheckInTokenRepository),
        container.resolve(ServiceKeys.MembershipService),
      ),
  );

  // Register controllers
  container.register(
    ServiceKeys.AttendanceController,
    () => new AttendanceController(container.resolve(ServiceKeys.AttendanceService)),
  );

  container.register(
    ServiceKeys.TokenController,
    () => new TokenController(container.resolve(ServiceKeys.AttendanceService)),
  );

  return container;
}
