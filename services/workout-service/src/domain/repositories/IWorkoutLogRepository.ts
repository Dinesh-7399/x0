// src/domain/repositories/IWorkoutLogRepository.ts

import type { WorkoutLog, WorkoutStatus } from '../entities/WorkoutLog.js';

export interface WorkoutLogSearchOptions {
  userId: string;
  status?: WorkoutStatus;
  templateId?: string;
  programId?: string;
  startDate?: Date;
  endDate?: Date;
  limit: number;
  offset: number;
}

export interface WorkoutLogListResult {
  logs: WorkoutLog[];
  total: number;
  hasMore: boolean;
}

export interface ExerciseHistoryOptions {
  userId: string;
  exerciseId: string;
  limit: number;
  offset: number;
}

export interface ExerciseHistoryEntry {
  workoutLogId: string;
  workoutName: string;
  date: Date;
  sets: {
    reps: number;
    weight: number;
    weightUnit: string;
    rpe: number | null;
  }[];
  totalVolume: number;
  bestSet: {
    reps: number;
    weight: number;
  };
}

export interface IWorkoutLogRepository {
  // CRUD
  save(log: WorkoutLog): Promise<void>;
  findById(id: string): Promise<WorkoutLog | null>;
  update(log: WorkoutLog): Promise<void>;
  delete(id: string): Promise<void>;

  // User workouts
  findByUser(options: WorkoutLogSearchOptions): Promise<WorkoutLogListResult>;
  findActiveByUser(userId: string): Promise<WorkoutLog | null>;

  // History
  getExerciseHistory(options: ExerciseHistoryOptions): Promise<ExerciseHistoryEntry[]>;

  // Stats
  getWorkoutCountByUser(userId: string, sinceDate?: Date): Promise<number>;
  getTotalVolumeByUser(userId: string, sinceDate?: Date): Promise<number>;
  getStreakByUser(userId: string): Promise<number>;

  // Rate limiting check
  getWorkoutsStartedToday(userId: string): Promise<number>;
}
