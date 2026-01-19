// src/application/services/WorkoutLogService.ts

/**
 * WorkoutLogService - handles workout session management
 * SECURITY: Enforces authorization, rate limits, and data validation
 */

import { getConfig } from '../../config/index.js';
import { PersonalRecord, RecordType } from '../../domain/entities/PersonalRecord.js';
import { WorkoutLog, type WorkoutStatus } from '../../domain/entities/WorkoutLog.js';
import type { IExerciseRepository } from '../../domain/repositories/IExerciseRepository.js';
import type { IPersonalRecordRepository } from '../../domain/repositories/IPersonalRecordRepository.js';
import type { IWorkoutLogRepository } from '../../domain/repositories/IWorkoutLogRepository.js';
import {
  ActiveWorkoutExistsError,
  DailyWorkoutLimitError,
  ExerciseInWorkoutNotFoundError,
  ExerciseNotFoundError,
  InvalidSetDataError,
  InvalidWorkoutDataError,
  WorkoutAlreadyCompletedError,
  WorkoutLogNotFoundError,
  WorkoutNotInProgressError,
  WorkoutNotOwnedError,
} from '../errors/WorkoutErrors.js';

export interface StartWorkoutDto {
  name: string;
  templateId?: string;
  programId?: string;
  programWeek?: number;
  programDay?: number;
  location?: string;
  gymId?: string;
  mood?: number;
  energy?: number;
}

export interface LogSetDto {
  actualReps: number;
  actualWeight: number;
  weightUnit: 'kg' | 'lbs';
  targetReps?: number;
  targetWeight?: number;
  rpe?: number;
  isWarmup?: boolean;
  notes?: string;
}

export interface WorkoutLogResponse {
  id: string;
  name: string;
  status: WorkoutStatus;
  startedAt: Date;
  completedAt: Date | null;
  duration: number | null;
  totalVolume: number;
  totalSets: number;
  totalReps: number;
  exercises: Array<{
    id: string;
    exerciseId: string;
    exerciseName: string;
    sets: Array<{
      setNumber: number;
      actualReps: number;
      actualWeight: number;
      weightUnit: string;
      rpe: number | null;
      isWarmup: boolean;
      isPersonalRecord: boolean;
    }>;
    skipped: boolean;
  }>;
  createdAt: Date;
}

export interface WorkoutLogListResponse {
  logs: WorkoutLogResponse[];
  total: number;
  hasMore: boolean;
  limit: number;
  offset: number;
}

export class WorkoutLogService {
  constructor(
    private readonly workoutLogRepo: IWorkoutLogRepository,
    private readonly exerciseRepo: IExerciseRepository,
    private readonly prRepo: IPersonalRecordRepository,
  ) {}

  /**
   * Start a new workout session
   * SECURITY: Checks rate limits and existing active workouts
   */
  async startWorkout(userId: string, dto: StartWorkoutDto): Promise<WorkoutLogResponse> {
    const config = getConfig();

    // SECURITY: Check daily workout limit to prevent abuse
    const workoutsToday = await this.workoutLogRepo.getWorkoutsStartedToday(userId);
    if (workoutsToday >= config.maxWorkoutsPerDay) {
      throw new DailyWorkoutLimitError(config.maxWorkoutsPerDay);
    }

    // SECURITY: Prevent multiple active workouts
    const activeWorkout = await this.workoutLogRepo.findActiveByUser(userId);
    if (activeWorkout) {
      throw new ActiveWorkoutExistsError();
    }

    // Validate template exists if provided
    if (dto.templateId) {
      // Template validation would be done here
      // For now, just validate UUID format
      if (!this.isValidUuid(dto.templateId)) {
        throw new InvalidWorkoutDataError('Invalid template ID format');
      }
    }

    // Create workout log
    const workout = WorkoutLog.start(userId, dto.name, {
      templateId: dto.templateId,
      programId: dto.programId,
      programWeek: dto.programWeek,
      programDay: dto.programDay,
      location: dto.location,
      gymId: dto.gymId,
      mood: dto.mood,
      energy: dto.energy,
    });

    await this.workoutLogRepo.save(workout);

    return this.toResponse(workout);
  }

  /**
   * Get current active workout for user
   */
  async getActiveWorkout(userId: string): Promise<WorkoutLogResponse | null> {
    const workout = await this.workoutLogRepo.findActiveByUser(userId);
    if (!workout) {
      return null;
    }
    return this.toResponse(workout);
  }

  /**
   * Get workout by ID
   * SECURITY: Enforces ownership check
   */
  async getWorkout(userId: string, workoutId: string): Promise<WorkoutLogResponse> {
    const workout = await this.workoutLogRepo.findById(workoutId);

    if (!workout || workout.isDeleted) {
      throw new WorkoutLogNotFoundError(workoutId);
    }

    // CRITICAL: Authorization check
    if (!workout.belongsTo(userId)) {
      throw new WorkoutNotOwnedError();
    }

    return this.toResponse(workout);
  }

  /**
   * Add exercise to active workout
   */
  async addExercise(
    userId: string,
    workoutId: string,
    exerciseId: string,
  ): Promise<{ exerciseLogId: string }> {
    const workout = await this.getWorkoutForModification(userId, workoutId);

    // Validate exercise exists
    const exercise = await this.exerciseRepo.findById(exerciseId);
    if (!exercise || exercise.isDeleted) {
      throw new ExerciseNotFoundError(exerciseId);
    }

    // Check if user can view this exercise
    if (!exercise.canBeViewedBy(userId)) {
      throw new ExerciseNotFoundError(exerciseId);
    }

    const exerciseLog = workout.addExercise(exerciseId, exercise.name);
    await this.workoutLogRepo.update(workout);

    return { exerciseLogId: exerciseLog.id };
  }

  /**
   * Log a set for an exercise
   * SECURITY: Validates all numeric inputs
   */
  async logSet(
    userId: string,
    workoutId: string,
    exerciseLogId: string,
    dto: LogSetDto,
  ): Promise<{ set: { setNumber: number; isPersonalRecord: boolean } }> {
    const workout = await this.getWorkoutForModification(userId, workoutId);

    // Find the exercise in the workout
    const exerciseLog = workout.exercises.find((e) => e.id === exerciseLogId);
    if (!exerciseLog) {
      throw new ExerciseInWorkoutNotFoundError();
    }

    // Log the set (validation happens in entity)
    const set = workout.logSet(exerciseLogId, {
      actualReps: dto.actualReps,
      actualWeight: dto.actualWeight,
      weightUnit: dto.weightUnit,
      targetReps: dto.targetReps,
      targetWeight: dto.targetWeight,
      rpe: dto.rpe,
      isWarmup: dto.isWarmup,
      notes: dto.notes,
    });

    // Check for personal record (only for non-warmup sets)
    let isPR = false;
    if (!set.isWarmup && set.actualReps > 0 && set.actualWeight > 0) {
      isPR = await this.checkAndSavePR(
        userId,
        exerciseLog.exerciseId,
        exerciseLog.exerciseName,
        set,
        workout.id,
      );

      if (isPR) {
        workout.markSetAsPR(exerciseLogId, set.setNumber);
      }
    }

    await this.workoutLogRepo.update(workout);

    return {
      set: {
        setNumber: set.setNumber,
        isPersonalRecord: isPR,
      },
    };
  }

  /**
   * Skip an exercise
   */
  async skipExercise(
    userId: string,
    workoutId: string,
    exerciseLogId: string,
    reason?: string,
  ): Promise<void> {
    const workout = await this.getWorkoutForModification(userId, workoutId);
    workout.skipExercise(exerciseLogId, reason);
    await this.workoutLogRepo.update(workout);
  }

  /**
   * Complete the workout
   */
  async completeWorkout(
    userId: string,
    workoutId: string,
    notes?: string,
  ): Promise<WorkoutLogResponse> {
    const workout = await this.getWorkoutForModification(userId, workoutId);
    workout.complete(notes);
    await this.workoutLogRepo.update(workout);

    // TODO: Publish workout.completed event

    return this.toResponse(workout);
  }

  /**
   * Abandon the workout
   */
  async abandonWorkout(userId: string, workoutId: string, reason?: string): Promise<void> {
    const workout = await this.getWorkoutForModification(userId, workoutId);
    workout.abandon(reason);
    await this.workoutLogRepo.update(workout);
  }

  /**
   * List user's workout history
   */
  async listWorkouts(
    userId: string,
    options: {
      status?: WorkoutStatus;
      startDate?: Date;
      endDate?: Date;
      limit?: number;
      offset?: number;
    },
  ): Promise<WorkoutLogListResponse> {
    const config = getConfig();
    const limit = Math.min(options.limit || config.defaultPageSize, config.maxPageSize);
    const offset = options.offset || 0;

    const result = await this.workoutLogRepo.findByUser({
      userId,
      status: options.status,
      startDate: options.startDate,
      endDate: options.endDate,
      limit,
      offset,
    });

    return {
      logs: result.logs.map((log) => this.toResponse(log)),
      total: result.total,
      hasMore: result.hasMore,
      limit,
      offset,
    };
  }

  /**
   * Delete a workout log
   */
  async deleteWorkout(userId: string, workoutId: string): Promise<void> {
    const workout = await this.workoutLogRepo.findById(workoutId);

    if (!workout || workout.isDeleted) {
      throw new WorkoutLogNotFoundError(workoutId);
    }

    if (!workout.belongsTo(userId)) {
      throw new WorkoutNotOwnedError();
    }

    workout.softDelete();
    await this.workoutLogRepo.update(workout);
  }

  // ============================================
  // Private helpers
  // ============================================

  private async getWorkoutForModification(userId: string, workoutId: string): Promise<WorkoutLog> {
    const workout = await this.workoutLogRepo.findById(workoutId);

    if (!workout || workout.isDeleted) {
      throw new WorkoutLogNotFoundError(workoutId);
    }

    // CRITICAL: Authorization check
    if (!workout.belongsTo(userId)) {
      throw new WorkoutNotOwnedError();
    }

    if (!workout.isActive) {
      throw new WorkoutNotInProgressError();
    }

    return workout;
  }

  private async checkAndSavePR(
    userId: string,
    exerciseId: string,
    exerciseName: string,
    set: { actualReps: number; actualWeight: number; weightUnit: string; setNumber: number },
    workoutLogId: string,
  ): Promise<boolean> {
    // Convert to kg for comparison
    const weightInKg = set.weightUnit === 'lbs' ? set.actualWeight * 0.453592 : set.actualWeight;

    // Determine record type based on reps
    let recordType: RecordType;
    if (set.actualReps === 1) {
      recordType = RecordType.MAX_WEIGHT_1RM;
    } else if (set.actualReps <= 3) {
      recordType = RecordType.MAX_WEIGHT_3RM;
    } else if (set.actualReps <= 5) {
      recordType = RecordType.MAX_WEIGHT_5RM;
    } else {
      recordType = RecordType.MAX_WEIGHT_10RM;
    }

    // Get current record
    const currentRecord = await this.prRepo.findCurrentRecord(userId, exerciseId, recordType);

    // Check if new value beats current record
    if (!currentRecord || weightInKg > currentRecord.value) {
      const pr = PersonalRecord.create(
        userId,
        exerciseId,
        exerciseName,
        recordType,
        weightInKg,
        workoutLogId,
        {
          reps: set.actualReps,
          setNumber: set.setNumber,
          previousValue: currentRecord?.value,
        },
      );

      await this.prRepo.save(pr);
      return true;
    }

    return false;
  }

  private toResponse(workout: WorkoutLog): WorkoutLogResponse {
    return {
      id: workout.id,
      name: workout.name,
      status: workout.status,
      startedAt: workout.startedAt,
      completedAt: workout.completedAt,
      duration: workout.duration,
      totalVolume: Math.round(workout.totalVolume * 100) / 100,
      totalSets: workout.totalSets,
      totalReps: workout.totalReps,
      exercises: workout.exercises.map((e) => ({
        id: e.id,
        exerciseId: e.exerciseId,
        exerciseName: e.exerciseName,
        sets: e.sets.map((s) => ({
          setNumber: s.setNumber,
          actualReps: s.actualReps,
          actualWeight: s.actualWeight,
          weightUnit: s.weightUnit,
          rpe: s.rpe,
          isWarmup: s.isWarmup,
          isPersonalRecord: s.isPersonalRecord,
        })),
        skipped: e.skipped,
      })),
      createdAt: workout.createdAt,
    };
  }

  private isValidUuid(id: string): boolean {
    return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);
  }
}
