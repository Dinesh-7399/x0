// src/domain/repositories/IAttendanceRepository.ts

import type { Attendance, AttendanceProps } from "../entities/Attendance.js";

export interface AttendanceSearchOptions {
  memberId?: string;
  gymId?: string;
  startDate?: Date;
  endDate?: Date;
  limit: number;
  offset: number;
}

export interface AttendanceListResult {
  attendance: Attendance[];
  total: number;
  hasMore: boolean;
}

export interface IAttendanceRepository {
  save(attendance: Attendance): Promise<void>;
  findById(id: string): Promise<Attendance | null>;
  update(attendance: Attendance): Promise<void>;

  findActiveByMember(memberId: string): Promise<Attendance | null>;
  search(options: AttendanceSearchOptions): Promise<AttendanceListResult>;

  findStaleCheckIns(olderThan: Date): Promise<Attendance[]>; // For auto-checkout
  countActiveInGym(gymId: string): Promise<number>;

  // Analytics queries
  countByGymAndDate(gymId: string, date: Date): Promise<number>;
}
