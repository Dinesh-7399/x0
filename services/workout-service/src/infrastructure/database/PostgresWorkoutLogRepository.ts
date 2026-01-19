// src/infrastructure/database/PostgresWorkoutLogRepository.ts

import type { PoolClient } from 'pg';
import {
  type LoggedExercise,
  type LoggedSet,
  WorkoutLog,
  type WorkoutLogProps,
  type WorkoutStatus,
} from '../../domain/entities/WorkoutLog.js';
import type {
  ExerciseHistoryEntry,
  ExerciseHistoryOptions,
  IWorkoutLogRepository,
  WorkoutLogListResult,
  WorkoutLogSearchOptions,
} from '../../domain/repositories/IWorkoutLogRepository.js';
import { execute, query, queryOne, withTransaction } from './postgres.js';

interface WorkoutLogRow {
  id: string;
  user_id: string;
  template_id: string | null;
  program_id: string | null;
  program_week: number | null;
  program_day: number | null;
  name: string;
  started_at: Date;
  completed_at: Date | null;
  status: string;
  duration: number | null;
  notes: string;
  mood: number | null;
  energy: number | null;
  exercises: LoggedExercise[];
  total_volume: number;
  total_sets: number;
  total_reps: number;
  calories_burned: number | null;
  location: string | null;
  gym_id: string | null;
  deleted_at: Date | null;
  created_at: Date;
  updated_at: Date;
}

export class PostgresWorkoutLogRepository implements IWorkoutLogRepository {
  async save(log: WorkoutLog): Promise<void> {
    const sql = `
      INSERT INTO workout_logs (
        id, user_id, template_id, program_id, program_week, program_day,
        name, started_at, completed_at, status, duration, notes,
        mood, energy, exercises, total_volume, total_sets, total_reps,
        calories_burned, location, gym_id, deleted_at, created_at, updated_at
      ) VALUES (
        $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12,
        $13, $14, $15, $16, $17, $18, $19, $20, $21, $22, $23, $24
      )
    `;

    await execute(sql, [
      log.id,
      log.userId,
      log.templateId,
      log.programId,
      log.programWeek,
      log.programDay,
      log.name,
      log.startedAt,
      log.completedAt,
      log.status,
      log.duration,
      log.notes,
      log.mood,
      log.energy,
      JSON.stringify(log.exercises),
      log.totalVolume,
      log.totalSets,
      log.totalReps,
      log.caloriesBurned,
      log.location,
      log.gymId,
      log.deletedAt,
      log.createdAt,
      log.updatedAt,
    ]);
  }

  async findById(id: string): Promise<WorkoutLog | null> {
    const sql = 'SELECT * FROM workout_logs WHERE id = $1';
    const row = await queryOne<WorkoutLogRow>(sql, [id]);
    return row ? this.toDomain(row) : null;
  }

  async update(log: WorkoutLog): Promise<void> {
    const sql = `
      UPDATE workout_logs SET
        completed_at = $2, status = $3, duration = $4, notes = $5,
        mood = $6, energy = $7, exercises = $8, total_volume = $9,
        total_sets = $10, total_reps = $11, calories_burned = $12,
        deleted_at = $13, updated_at = $14
      WHERE id = $1
    `;

    await execute(sql, [
      log.id,
      log.completedAt,
      log.status,
      log.duration,
      log.notes,
      log.mood,
      log.energy,
      JSON.stringify(log.exercises),
      log.totalVolume,
      log.totalSets,
      log.totalReps,
      log.caloriesBurned,
      log.deletedAt,
      log.updatedAt,
    ]);
  }

  async delete(id: string): Promise<void> {
    await execute('UPDATE workout_logs SET deleted_at = NOW() WHERE id = $1', [id]);
  }

  async findByUser(options: WorkoutLogSearchOptions): Promise<WorkoutLogListResult> {
    const conditions: string[] = ['user_id = $1', 'deleted_at IS NULL'];
    const params: unknown[] = [options.userId];
    let paramIndex = 2;

    if (options.status) {
      conditions.push(`status = $${paramIndex}`);
      params.push(options.status);
      paramIndex++;
    }

    if (options.templateId) {
      conditions.push(`template_id = $${paramIndex}`);
      params.push(options.templateId);
      paramIndex++;
    }

    if (options.programId) {
      conditions.push(`program_id = $${paramIndex}`);
      params.push(options.programId);
      paramIndex++;
    }

    if (options.startDate) {
      conditions.push(`started_at >= $${paramIndex}`);
      params.push(options.startDate);
      paramIndex++;
    }

    if (options.endDate) {
      conditions.push(`started_at <= $${paramIndex}`);
      params.push(options.endDate);
      paramIndex++;
    }

    const whereClause = conditions.join(' AND ');

    // Count
    const countSql = `SELECT COUNT(*) as total FROM workout_logs WHERE ${whereClause}`;
    const countResult = await queryOne<{ total: string }>(countSql, params);
    const total = Number.parseInt(countResult?.total || '0', 10);

    // Data
    const dataSql = `
      SELECT * FROM workout_logs
      WHERE ${whereClause}
      ORDER BY started_at DESC
      LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
    `;
    params.push(options.limit, options.offset);

    const rows = await query<WorkoutLogRow>(dataSql, params);

    return {
      logs: rows.map((row) => this.toDomain(row)),
      total,
      hasMore: options.offset + rows.length < total,
    };
  }

  async findActiveByUser(userId: string): Promise<WorkoutLog | null> {
    const sql = `
      SELECT * FROM workout_logs
      WHERE user_id = $1 AND status = 'in_progress' AND deleted_at IS NULL
      ORDER BY started_at DESC
      LIMIT 1
    `;
    const row = await queryOne<WorkoutLogRow>(sql, [userId]);
    return row ? this.toDomain(row) : null;
  }

  async getExerciseHistory(options: ExerciseHistoryOptions): Promise<ExerciseHistoryEntry[]> {
    // This is a more complex query that extracts exercise data from the JSONB
    const sql = `
      SELECT
        wl.id as workout_log_id,
        wl.name as workout_name,
        wl.started_at as date,
        wl.exercises
      FROM workout_logs wl
      WHERE wl.user_id = $1
        AND wl.status = 'completed'
        AND wl.deleted_at IS NULL
        AND EXISTS (
          SELECT 1 FROM jsonb_array_elements(wl.exercises::jsonb) elem
          WHERE elem->>'exerciseId' = $2
        )
      ORDER BY wl.started_at DESC
      LIMIT $3 OFFSET $4
    `;

    const rows = await query<{
      workout_log_id: string;
      workout_name: string;
      date: Date;
      exercises: LoggedExercise[];
    }>(sql, [options.userId, options.exerciseId, options.limit, options.offset]);

    return rows.map((row) => {
      const exerciseData = row.exercises.find((e) => e.exerciseId === options.exerciseId) || null;

      const sets = exerciseData?.sets.filter((s) => !s.isWarmup) || [];
      const totalVolume = sets.reduce((sum, s) => sum + s.actualWeight * s.actualReps, 0);
      const bestSet = sets.reduce(
        (best, s) =>
          s.actualWeight > best.weight ? { reps: s.actualReps, weight: s.actualWeight } : best,
        { reps: 0, weight: 0 },
      );

      return {
        workoutLogId: row.workout_log_id,
        workoutName: row.workout_name,
        date: row.date,
        sets: sets.map((s) => ({
          reps: s.actualReps,
          weight: s.actualWeight,
          weightUnit: s.weightUnit,
          rpe: s.rpe,
        })),
        totalVolume,
        bestSet,
      };
    });
  }

  async getWorkoutCountByUser(userId: string, sinceDate?: Date): Promise<number> {
    let sql = `
      SELECT COUNT(*) as total FROM workout_logs
      WHERE user_id = $1 AND status = 'completed' AND deleted_at IS NULL
    `;
    const params: unknown[] = [userId];

    if (sinceDate) {
      sql += ' AND started_at >= $2';
      params.push(sinceDate);
    }

    const result = await queryOne<{ total: string }>(sql, params);
    return Number.parseInt(result?.total || '0', 10);
  }

  async getTotalVolumeByUser(userId: string, sinceDate?: Date): Promise<number> {
    let sql = `
      SELECT COALESCE(SUM(total_volume), 0) as total FROM workout_logs
      WHERE user_id = $1 AND status = 'completed' AND deleted_at IS NULL
    `;
    const params: unknown[] = [userId];

    if (sinceDate) {
      sql += ' AND started_at >= $2';
      params.push(sinceDate);
    }

    const result = await queryOne<{ total: string }>(sql, params);
    return Number.parseFloat(result?.total || '0');
  }

  async getStreakByUser(userId: string): Promise<number> {
    // Calculate consecutive workout days
    const sql = `
      WITH workout_days AS (
        SELECT DISTINCT DATE(started_at) as workout_date
        FROM workout_logs
        WHERE user_id = $1 AND status = 'completed' AND deleted_at IS NULL
        ORDER BY workout_date DESC
      ),
      streak AS (
        SELECT workout_date,
               ROW_NUMBER() OVER (ORDER BY workout_date DESC) as rn,
               workout_date - (ROW_NUMBER() OVER (ORDER BY workout_date DESC))::int as grp
        FROM workout_days
      )
      SELECT COUNT(*) as streak_days
      FROM streak
      WHERE grp = (SELECT grp FROM streak WHERE rn = 1)
    `;

    const result = await queryOne<{ streak_days: string }>(sql, [userId]);
    return Number.parseInt(result?.streak_days || '0', 10);
  }

  async getWorkoutsStartedToday(userId: string): Promise<number> {
    const sql = `
      SELECT COUNT(*) as total FROM workout_logs
      WHERE user_id = $1
        AND DATE(started_at) = CURRENT_DATE
        AND deleted_at IS NULL
    `;
    const result = await queryOne<{ total: string }>(sql, [userId]);
    return Number.parseInt(result?.total || '0', 10);
  }

  private toDomain(row: WorkoutLogRow): WorkoutLog {
    // Parse exercises from JSONB if needed
    let exercises: LoggedExercise[] = [];
    if (typeof row.exercises === 'string') {
      exercises = JSON.parse(row.exercises);
    } else if (Array.isArray(row.exercises)) {
      exercises = row.exercises;
    }

    const props: WorkoutLogProps = {
      id: row.id,
      userId: row.user_id,
      templateId: row.template_id,
      programId: row.program_id,
      programWeek: row.program_week,
      programDay: row.program_day,
      name: row.name,
      startedAt: row.started_at,
      completedAt: row.completed_at,
      status: row.status as WorkoutStatus,
      duration: row.duration,
      notes: row.notes,
      mood: row.mood,
      energy: row.energy,
      exercises,
      totalVolume: row.total_volume,
      totalSets: row.total_sets,
      totalReps: row.total_reps,
      caloriesBurned: row.calories_burned,
      location: row.location,
      gymId: row.gym_id,
      deletedAt: row.deleted_at,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };

    return WorkoutLog.fromPersistence(props);
  }
}
