// src/application/services/AttendanceService.ts

import type { IAttendanceRepository } from "../../domain/repositories/IAttendanceRepository.js";
import type { IGymCapacityRepository } from "../../domain/repositories/IGymCapacityRepository.js";
import type { IMemberStreakRepository } from "../../domain/repositories/IMemberStreakRepository.js";
import type { ICheckInTokenRepository } from "../../domain/repositories/ICheckInTokenRepository.js";
import { Attendance, CheckInMethod, CheckOutMethod } from "../../domain/entities/Attendance.js";
import { MemberStreak } from "../../domain/entities/MemberStreak.js";
import { CheckInToken } from "../../domain/entities/CheckInToken.js";
import {
  AlreadyCheckedInError,
  NotCheckedInError,
  GymCapacityExceededError,
  InvalidTokenError,
  TokenExpiredError,
  MembershipInvalidError,
} from "../errors/AttendanceErrors.js";
import { getConfig } from "../../config/index.js";

// Mock interfaces for external services
interface IMembershipService {
  validateAccess(memberId: string, gymId: string): Promise<{ valid: boolean; membershipId?: string; reason?: string }>;
}

export interface CheckInDto {
  memberId: string; // If manual/biometric
  gymId: string;
  method: CheckInMethod;
  tokenValue?: string; // If QR/NFC
  deviceId?: string;
  staffId?: string;
}

export interface CheckOutDto {
  memberId: string;
  gymId: string;
  method: CheckOutMethod;
  deviceId?: string;
}

export class AttendanceService {
  constructor(
    private readonly attendanceRepo: IAttendanceRepository,
    private readonly capacityRepo: IGymCapacityRepository,
    private readonly streakRepo: IMemberStreakRepository,
    private readonly tokenRepo: ICheckInTokenRepository,
    private readonly membershipService: IMembershipService, // Injected dependency
  ) { }

  /**
   * Process a check-in request
   */
  async checkIn(dto: CheckInDto): Promise<Attendance> {
    const config = getConfig();

    // 1. Resolve Member ID (if token provided)
    let memberId = dto.memberId;
    if (dto.method === CheckInMethod.QR_CODE || dto.method === CheckInMethod.NFC) {
      if (!dto.tokenValue) {
        throw new InvalidTokenError();
      }
      const token = await this.tokenRepo.findByValue(dto.tokenValue);
      if (!token || !token.props.isValid) {
        throw new InvalidTokenError();
      }
      if (token.isExpired) {
        throw new TokenExpiredError();
      }
      if (token.isUsed) {
        throw new InvalidTokenError(); // Already used
      }
      memberId = token.props.memberId;

      // Invalidate token immediately
      token.use();
      await this.tokenRepo.update(token);
    }

    // 2. Check if already checked in
    const existing = await this.attendanceRepo.findActiveByMember(memberId);
    if (existing) {
      // Auto check-out previous if it's very old? For now, nice error.
      throw new AlreadyCheckedInError();
    }

    // 3. Validate Membership
    if (this.membershipService) {
      const access = await this.membershipService.validateAccess(memberId, dto.gymId);
      if (!access.valid || !access.membershipId) {
        throw new MembershipInvalidError(access.reason || "Invalid membership");
      }
      memberId = memberId; // Ensure we use the validated ID if needed
    }

    // 4. Check Gym Capacity
    const capacity = await this.capacityRepo.getCapacity(dto.gymId);
    if (capacity && capacity.isFull) {
      // Double check real-time
      const current = capacity.currentOccupancy;
      if (current >= capacity.props.maxCapacity) {
        throw new GymCapacityExceededError();
      }
    }

    // 5. Create Attendance Record
    const attendance = Attendance.checkIn(
      memberId,
      dto.gymId,
      "mock-membership-id", // In real app, from membershipService response
      dto.method,
      dto.deviceId,
      dto.staffId
    );

    // 6. Save and Update Capacity (Transactional ideally, but across Redis/PG difficult)
    await this.attendanceRepo.save(attendance);
    await this.capacityRepo.incrementOccupancy(dto.gymId, capacity?.props.maxCapacity || 1000);

    // 7. Update Streak (Async usually, but doing sync for simplicity of POC)
    this.updateStreak(memberId, dto.gymId).catch(console.error);

    return attendance;
  }

  /**
   * Process a check-out request
   */
  async checkOut(dto: CheckOutDto): Promise<Attendance> {
    // 1. Find active attendance
    const attendance = await this.attendanceRepo.findActiveByMember(dto.memberId);
    if (!attendance) {
      throw new NotCheckedInError();
    }

    // Verify gym matches (optional, but good for data integrity)
    if (attendance.gymId !== dto.gymId) {
      // Did they sneak into another gym? Just check them out of the old one.
    }

    // 2. Perform Check-out
    attendance.checkOut(dto.method, dto.deviceId);
    await this.attendanceRepo.update(attendance);

    // 3. Decrement Capacity
    await this.capacityRepo.decrementOccupancy(attendance.gymId);

    return attendance;
  }

  /**
   * Update member streak logic
   */
  private async updateStreak(memberId: string, gymId: string): Promise<void> {
    let streak = await this.streakRepo.findByMemberId(memberId);
    if (!streak) {
      streak = MemberStreak.create(memberId);
    }

    streak.updateStreak(new Date());
    await this.streakRepo.save(streak);
  }

  /**
   * Generate a check-in token
   */
  async generateToken(memberId: string, gymId: string): Promise<string> {
    // Invalidate old tokens
    await this.tokenRepo.invalidateMemberTokens(memberId);

    const config = getConfig();
    const token = CheckInToken.generate(
      memberId,
      gymId,
      config.qrTokenExpiryMinutes
    );

    await this.tokenRepo.save(token);
    return token.tokenValue;
  }

  async getHistory(memberId: string, limit: number, offset: number) {
    return this.attendanceRepo.search({ memberId, limit, offset });
  }
}
