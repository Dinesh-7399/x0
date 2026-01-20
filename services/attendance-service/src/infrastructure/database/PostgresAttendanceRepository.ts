// src/infrastructure/database/PostgresAttendanceRepository.ts

import { query, queryOne, execute } from "./postgres.js";
import type {
  IAttendanceRepository,
  AttendanceSearchOptions,
  AttendanceListResult,
} from "../../domain/repositories/IAttendanceRepository.js";
import {
  Attendance,
  type AttendanceProps,
  CheckInMethod,
  CheckOutMethod,
} from "../../domain/entities/Attendance.js";

interface AttendanceRow {
  id: string;
  member_id: string;
  gym_id: string;
  membership_id: string;
  check_in_time: Date;
  check_in_method: string;
  check_in_device_id: string | null;
  check_in_staff_id: string | null;
  check_out_time: Date | null;
  check_out_method: string | null;
  check_out_device_id: string | null;
  duration_minutes: number | null;
  notes: string | null;
  is_valid: boolean;
  voided_at: Date | null;
  voided_by: string | null;
  void_reason: string | null;
  created_at: Date;
  updated_at: Date;
}

export class PostgresAttendanceRepository implements IAttendanceRepository {
  async save(attendance: Attendance): Promise<void> {
    const sql = `
      INSERT INTO attendance (
        id, member_id, gym_id, membership_id,
        check_in_time, check_in_method, check_in_device_id, check_in_staff_id,
        check_out_time, check_out_method, check_out_device_id,
        duration_minutes, notes, is_valid,
        voided_at, voided_by, void_reason,
        created_at, updated_at
      ) VALUES (
        $1, $2, $3, $4, $5, $6, $7, $8, $9, $10,
        $11, $12, $13, $14, $15, $16, $17, $18, $19
      )
    `;

    await execute(sql, [
      attendance.id,
      attendance.memberId,
      attendance.gymId,
      attendance.props.membershipId,
      attendance.checkInTime,
      attendance.props.checkInMethod,
      attendance.props.checkInDeviceId,
      attendance.props.checkInStaffId,
      attendance.checkOutTime,
      attendance.props.checkOutMethod,
      attendance.props.checkOutDeviceId,
      attendance.durationMinutes,
      attendance.props.notes,
      attendance.isValid,
      attendance.props.voidedAt,
      attendance.props.voidedBy,
      attendance.props.voidReason,
      attendance.props.createdAt,
      attendance.props.updatedAt,
    ]);
  }

  async findById(id: string): Promise<Attendance | null> {
    const sql = `SELECT * FROM attendance WHERE id = $1`;
    const row = await queryOne<AttendanceRow>(sql, [id]);
    return row ? this.toDomain(row) : null;
  }

  async update(attendance: Attendance): Promise<void> {
    const sql = `
      UPDATE attendance SET
        check_out_time = $2, check_out_method = $3, check_out_device_id = $4,
        duration_minutes = $5, notes = $6, is_valid = $7,
        voided_at = $8, voided_by = $9, void_reason = $10,
        updated_at = $11
      WHERE id = $1
    `;

    await execute(sql, [
      attendance.id,
      attendance.checkOutTime,
      attendance.props.checkOutMethod,
      attendance.props.checkOutDeviceId,
      attendance.durationMinutes,
      attendance.props.notes,
      attendance.isValid,
      attendance.props.voidedAt,
      attendance.props.voidedBy,
      attendance.props.voidReason,
      attendance.props.updatedAt,
    ]);
  }

  async findActiveByMember(memberId: string): Promise<Attendance | null> {
    const sql = `
      SELECT * FROM attendance
      WHERE member_id = $1 AND check_out_time IS NULL AND is_valid = true
      ORDER BY check_in_time DESC
      LIMIT 1
    `;
    const row = await queryOne<AttendanceRow>(sql, [memberId]);
    return row ? this.toDomain(row) : null;
  }

  async search(options: AttendanceSearchOptions): Promise<AttendanceListResult> {
    const conditions: string[] = ["is_valid = true"];
    const params: unknown[] = [];
    let paramIndex = 1;

    if (options.memberId) {
      conditions.push(`member_id = $${paramIndex++}`);
      params.push(options.memberId);
    }
    if (options.gymId) {
      conditions.push(`gym_id = $${paramIndex++}`);
      params.push(options.gymId);
    }
    if (options.startDate) {
      conditions.push(`check_in_time >= $${paramIndex++}`);
      params.push(options.startDate);
    }
    if (options.endDate) {
      conditions.push(`check_in_time <= $${paramIndex++}`);
      params.push(options.endDate);
    }

    const whereClause = conditions.join(" AND ");

    // Count
    const countSql = `SELECT COUNT(*) as total FROM attendance WHERE ${whereClause}`;
    const countResult = await queryOne<{ total: string }>(countSql, params);
    const total = parseInt(countResult?.total || "0", 10);

    // Data
    const dataSql = `
      SELECT * FROM attendance
      WHERE ${whereClause}
      ORDER BY check_in_time DESC
      LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
    `;
    params.push(options.limit, options.offset);

    const rows = await query<AttendanceRow>(dataSql, params);

    return {
      attendance: rows.map((row) => this.toDomain(row)),
      total,
      hasMore: options.offset + rows.length < total,
    };
  }

  async findStaleCheckIns(olderThan: Date): Promise<Attendance[]> {
    const sql = `
      SELECT * FROM attendance
      WHERE check_out_time IS NULL AND is_valid = true AND check_in_time < $1
    `;
    const rows = await query<AttendanceRow>(sql, [olderThan]);
    return rows.map((row) => this.toDomain(row));
  }

  async countActiveInGym(gymId: string): Promise<number> {
    const sql = `
      SELECT COUNT(*) as total FROM attendance
      WHERE gym_id = $1 AND check_out_time IS NULL AND is_valid = true
    `;
    const result = await queryOne<{ total: string }>(sql, [gymId]);
    return parseInt(result?.total || "0", 10);
  }

  async countByGymAndDate(gymId: string, date: Date): Promise<number> {
    const startOfDay = new Date(date);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(date);
    endOfDay.setHours(23, 59, 59, 999);

    const sql = `
      SELECT COUNT(*) as total FROM attendance
      WHERE gym_id = $1 
      AND check_in_time >= $2 AND check_in_time <= $3
      AND is_valid = true
    `;
    const result = await queryOne<{ total: string }>(sql, [gymId, startOfDay, endOfDay]);
    return parseInt(result?.total || "0", 10);
  }

  private toDomain(row: AttendanceRow): Attendance {
    const props: AttendanceProps = {
      id: row.id,
      memberId: row.member_id,
      gymId: row.gym_id,
      membershipId: row.membership_id,
      checkInTime: row.check_in_time,
      checkInMethod: row.check_in_method as CheckInMethod,
      checkInDeviceId: row.check_in_device_id,
      checkInStaffId: row.check_in_staff_id,
      checkOutTime: row.check_out_time,
      checkOutMethod: row.check_out_method as CheckOutMethod | null,
      checkOutDeviceId: row.check_out_device_id,
      durationMinutes: row.duration_minutes,
      notes: row.notes,
      isValid: row.is_valid,
      voidedAt: row.voided_at,
      voidedBy: row.voided_by,
      voidReason: row.void_reason,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };

    return Attendance.fromPersistence(props);
  }
}
