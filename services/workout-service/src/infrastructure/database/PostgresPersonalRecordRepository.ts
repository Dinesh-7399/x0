// src/infrastructure/database/PostgresPersonalRecordRepository.ts

import {
  PersonalRecord,
  type PersonalRecordProps,
  type RecordType,
} from '../../domain/entities/PersonalRecord.js';
import type {
  IPersonalRecordRepository,
  PRListResult,
  PRSearchOptions,
} from '../../domain/repositories/IPersonalRecordRepository.js';
import { execute, query, queryOne } from './postgres.js';

interface PRRow {
  id: string;
  user_id: string;
  exercise_id: string;
  exercise_name: string;
  record_type: string;
  value: number;
  unit: string;
  reps: number | null;
  weight: number | null;
  achieved_at: Date;
  workout_log_id: string;
  workout_log_set_number: number | null;
  previous_value: number | null;
  improvement: number | null;
  created_at: Date;
}

export class PostgresPersonalRecordRepository implements IPersonalRecordRepository {
  async save(record: PersonalRecord): Promise<void> {
    const sql = `
      INSERT INTO personal_records (
        id, user_id, exercise_id, exercise_name, record_type,
        value, unit, reps, weight, achieved_at, workout_log_id,
        workout_log_set_number, previous_value, improvement, created_at
      ) VALUES (
        $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15
      )
    `;

    await execute(sql, [
      record.id,
      record.userId,
      record.exerciseId,
      record.exerciseName,
      record.recordType,
      record.value,
      record.unit,
      record.reps,
      record.weight,
      record.achievedAt,
      record.workoutLogId,
      record.workoutLogSetNumber,
      record.previousValue,
      record.improvement,
      record.createdAt,
    ]);
  }

  async findById(id: string): Promise<PersonalRecord | null> {
    const sql = 'SELECT * FROM personal_records WHERE id = $1';
    const row = await queryOne<PRRow>(sql, [id]);
    return row ? this.toDomain(row) : null;
  }

  async findByUser(options: PRSearchOptions): Promise<PRListResult> {
    const conditions: string[] = ['user_id = $1'];
    const params: unknown[] = [options.userId];
    let paramIndex = 2;

    if (options.exerciseId) {
      conditions.push(`exercise_id = $${paramIndex}`);
      params.push(options.exerciseId);
      paramIndex++;
    }

    if (options.recordType) {
      conditions.push(`record_type = $${paramIndex}`);
      params.push(options.recordType);
      paramIndex++;
    }

    const whereClause = conditions.join(' AND ');

    // Count
    const countSql = `SELECT COUNT(*) as total FROM personal_records WHERE ${whereClause}`;
    const countResult = await queryOne<{ total: string }>(countSql, params);
    const total = Number.parseInt(countResult?.total || '0', 10);

    // Data
    const dataSql = `
      SELECT * FROM personal_records
      WHERE ${whereClause}
      ORDER BY achieved_at DESC
      LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
    `;
    params.push(options.limit, options.offset);

    const rows = await query<PRRow>(dataSql, params);

    return {
      records: rows.map((row) => this.toDomain(row)),
      total,
      hasMore: options.offset + rows.length < total,
    };
  }

  async findByUserAndExercise(userId: string, exerciseId: string): Promise<PersonalRecord[]> {
    const sql = `
      SELECT * FROM personal_records
      WHERE user_id = $1 AND exercise_id = $2
      ORDER BY record_type, achieved_at DESC
    `;
    const rows = await query<PRRow>(sql, [userId, exerciseId]);
    return rows.map((row) => this.toDomain(row));
  }

  async findCurrentRecord(
    userId: string,
    exerciseId: string,
    recordType: RecordType,
  ): Promise<PersonalRecord | null> {
    const sql = `
      SELECT * FROM personal_records
      WHERE user_id = $1 AND exercise_id = $2 AND record_type = $3
      ORDER BY achieved_at DESC
      LIMIT 1
    `;
    const row = await queryOne<PRRow>(sql, [userId, exerciseId, recordType]);
    return row ? this.toDomain(row) : null;
  }

  async findRecentByUser(userId: string, limit: number): Promise<PersonalRecord[]> {
    const sql = `
      SELECT * FROM personal_records
      WHERE user_id = $1
      ORDER BY achieved_at DESC
      LIMIT $2
    `;
    const rows = await query<PRRow>(sql, [userId, limit]);
    return rows.map((row) => this.toDomain(row));
  }

  async countByUser(userId: string): Promise<number> {
    const sql = 'SELECT COUNT(*) as total FROM personal_records WHERE user_id = $1';
    const result = await queryOne<{ total: string }>(sql, [userId]);
    return Number.parseInt(result?.total || '0', 10);
  }

  async countByUserThisMonth(userId: string): Promise<number> {
    const sql = `
      SELECT COUNT(*) as total FROM personal_records
      WHERE user_id = $1
        AND achieved_at >= DATE_TRUNC('month', CURRENT_DATE)
    `;
    const result = await queryOne<{ total: string }>(sql, [userId]);
    return Number.parseInt(result?.total || '0', 10);
  }

  private toDomain(row: PRRow): PersonalRecord {
    const props: PersonalRecordProps = {
      id: row.id,
      userId: row.user_id,
      exerciseId: row.exercise_id,
      exerciseName: row.exercise_name,
      recordType: row.record_type as RecordType,
      value: row.value,
      unit: row.unit,
      reps: row.reps,
      weight: row.weight,
      achievedAt: row.achieved_at,
      workoutLogId: row.workout_log_id,
      workoutLogSetNumber: row.workout_log_set_number,
      previousValue: row.previous_value,
      improvement: row.improvement,
      createdAt: row.created_at,
    };
    return PersonalRecord.fromPersistence(props);
  }
}
