// src/domain/entities/WorkoutLog.ts

/**
 * WorkoutLog entity - records actual workout performance
 * SECURITY: Validates all inputs, prevents data manipulation
 */

import { getConfig } from '../../config/index.js';

export enum WorkoutStatus {
  IN_PROGRESS = 'in_progress',
  COMPLETED = 'completed',
  ABANDONED = 'abandoned',
}

export interface LoggedSet {
  setNumber: number;
  targetReps: number | null;
  actualReps: number;
  targetWeight: number | null;
  actualWeight: number;
  weightUnit: 'kg' | 'lbs';
  rpe: number | null;
  isWarmup: boolean;
  isPersonalRecord: boolean;
  completedAt: Date;
  notes: string;
}

export interface LoggedExercise {
  id: string;
  exerciseId: string;
  exerciseName: string; // Denormalized for history
  orderIndex: number;
  sets: LoggedSet[];
  notes: string;
  skipped: boolean;
  skippedReason: string | null;
  startedAt: Date | null;
  completedAt: Date | null;
}

export interface WorkoutLogProps {
  id: string;
  userId: string;
  templateId: string | null;
  programId: string | null;
  programWeek: number | null;
  programDay: number | null;
  name: string;
  startedAt: Date;
  completedAt: Date | null;
  status: WorkoutStatus;
  duration: number | null; // minutes
  notes: string;
  mood: number | null; // 1-5
  energy: number | null; // 1-5
  exercises: LoggedExercise[];
  totalVolume: number; // weight × reps sum in kg
  totalSets: number;
  totalReps: number;
  caloriesBurned: number | null;
  location: string | null;
  gymId: string | null;
  deletedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

// Validation limits
const MAX_NAME_LENGTH = 100;
const MAX_NOTES_LENGTH = 2000;
const MAX_LOCATION_LENGTH = 200;
const MAX_REPS_PER_SET = 1000;
const MAX_WEIGHT = 2000; // kg (world record deadlift is ~500kg)
const MIN_WEIGHT = 0;
const VALID_MOOD_RANGE = { min: 1, max: 5 };
const VALID_ENERGY_RANGE = { min: 1, max: 5 };
const VALID_RPE_RANGE = { min: 1, max: 10 };

export class WorkoutLog {
  private constructor(public readonly props: WorkoutLogProps) {}

  get id(): string {
    return this.props.id;
  }
  get userId(): string {
    return this.props.userId;
  }
  get templateId(): string | null {
    return this.props.templateId;
  }
  get programId(): string | null {
    return this.props.programId;
  }
  get programWeek(): number | null {
    return this.props.programWeek;
  }
  get programDay(): number | null {
    return this.props.programDay;
  }
  get name(): string {
    return this.props.name;
  }
  get startedAt(): Date {
    return this.props.startedAt;
  }
  get completedAt(): Date | null {
    return this.props.completedAt;
  }
  get status(): WorkoutStatus {
    return this.props.status;
  }
  get duration(): number | null {
    return this.props.duration;
  }
  get notes(): string {
    return this.props.notes;
  }
  get mood(): number | null {
    return this.props.mood;
  }
  get energy(): number | null {
    return this.props.energy;
  }
  get exercises(): LoggedExercise[] {
    return this.props.exercises;
  }
  get totalVolume(): number {
    return this.props.totalVolume;
  }
  get totalSets(): number {
    return this.props.totalSets;
  }
  get totalReps(): number {
    return this.props.totalReps;
  }
  get caloriesBurned(): number | null {
    return this.props.caloriesBurned;
  }
  get location(): string | null {
    return this.props.location;
  }
  get gymId(): string | null {
    return this.props.gymId;
  }
  get deletedAt(): Date | null {
    return this.props.deletedAt;
  }
  get createdAt(): Date {
    return this.props.createdAt;
  }
  get updatedAt(): Date {
    return this.props.updatedAt;
  }

  get isDeleted(): boolean {
    return this.props.deletedAt !== null;
  }
  get isActive(): boolean {
    return this.props.status === WorkoutStatus.IN_PROGRESS;
  }
  get isCompleted(): boolean {
    return this.props.status === WorkoutStatus.COMPLETED;
  }

  /**
   * Start a new workout
   */
  static start(
    userId: string,
    name: string,
    options?: {
      templateId?: string;
      programId?: string;
      programWeek?: number;
      programDay?: number;
      location?: string;
      gymId?: string;
      mood?: number;
      energy?: number;
    },
  ): WorkoutLog {
    // Validate user ID
    if (!userId || typeof userId !== 'string') {
      throw new Error('Valid user ID is required');
    }
    if (!WorkoutLog.isValidUuid(userId)) {
      throw new Error('Invalid user ID format');
    }

    // Validate name
    const sanitizedName = WorkoutLog.sanitize(name);
    if (sanitizedName.length < 1) {
      throw new Error('Workout name is required');
    }
    if (sanitizedName.length > MAX_NAME_LENGTH) {
      throw new Error(`Workout name cannot exceed ${MAX_NAME_LENGTH} characters`);
    }

    // Validate optional IDs
    if (options?.templateId && !WorkoutLog.isValidUuid(options.templateId)) {
      throw new Error('Invalid template ID format');
    }
    if (options?.programId && !WorkoutLog.isValidUuid(options.programId)) {
      throw new Error('Invalid program ID format');
    }
    if (options?.gymId && !WorkoutLog.isValidUuid(options.gymId)) {
      throw new Error('Invalid gym ID format');
    }

    // Validate mood/energy
    if (options?.mood !== undefined && options?.mood !== null) {
      if (options.mood < VALID_MOOD_RANGE.min || options.mood > VALID_MOOD_RANGE.max) {
        throw new Error(`Mood must be between ${VALID_MOOD_RANGE.min} and ${VALID_MOOD_RANGE.max}`);
      }
    }
    if (options?.energy !== undefined && options?.energy !== null) {
      if (options.energy < VALID_ENERGY_RANGE.min || options.energy > VALID_ENERGY_RANGE.max) {
        throw new Error(
          `Energy must be between ${VALID_ENERGY_RANGE.min} and ${VALID_ENERGY_RANGE.max}`,
        );
      }
    }

    // Validate location
    const location = options?.location ? WorkoutLog.sanitize(options.location) : null;
    if (location && location.length > MAX_LOCATION_LENGTH) {
      throw new Error(`Location cannot exceed ${MAX_LOCATION_LENGTH} characters`);
    }

    return new WorkoutLog({
      id: crypto.randomUUID(),
      userId,
      templateId: options?.templateId || null,
      programId: options?.programId || null,
      programWeek: options?.programWeek ?? null,
      programDay: options?.programDay ?? null,
      name: sanitizedName,
      startedAt: new Date(),
      completedAt: null,
      status: WorkoutStatus.IN_PROGRESS,
      duration: null,
      notes: '',
      mood: options?.mood ?? null,
      energy: options?.energy ?? null,
      exercises: [],
      totalVolume: 0,
      totalSets: 0,
      totalReps: 0,
      caloriesBurned: null,
      location,
      gymId: options?.gymId || null,
      deletedAt: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    });
  }

  static fromPersistence(props: WorkoutLogProps): WorkoutLog {
    return new WorkoutLog(props);
  }

  /**
   * Add an exercise to the workout
   */
  addExercise(exerciseId: string, exerciseName: string): LoggedExercise {
    const config = getConfig();

    if (this.status !== WorkoutStatus.IN_PROGRESS) {
      throw new Error('Cannot add exercises to a completed workout');
    }

    if (!WorkoutLog.isValidUuid(exerciseId)) {
      throw new Error('Invalid exercise ID format');
    }

    // Check exercise limit
    if (this.exercises.length >= config.maxExercisesPerWorkout) {
      throw new Error(`Maximum ${config.maxExercisesPerWorkout} exercises per workout`);
    }

    const exercise: LoggedExercise = {
      id: crypto.randomUUID(),
      exerciseId,
      exerciseName: WorkoutLog.sanitize(exerciseName).slice(0, 100),
      orderIndex: this.exercises.length,
      sets: [],
      notes: '',
      skipped: false,
      skippedReason: null,
      startedAt: new Date(),
      completedAt: null,
    };

    this.props.exercises.push(exercise);
    this.touch();
    return exercise;
  }

  /**
   * Log a set for an exercise
   * SECURITY: Validates all numeric inputs to prevent manipulation
   */
  logSet(
    exerciseId: string,
    set: {
      actualReps: number;
      actualWeight: number;
      weightUnit: 'kg' | 'lbs';
      targetReps?: number;
      targetWeight?: number;
      rpe?: number;
      isWarmup?: boolean;
      notes?: string;
    },
  ): LoggedSet {
    const config = getConfig();

    if (this.status !== WorkoutStatus.IN_PROGRESS) {
      throw new Error('Cannot log sets for a completed workout');
    }

    // Find the exercise
    const exercise = this.exercises.find((e) => e.id === exerciseId);
    if (!exercise) {
      throw new Error('Exercise not found in this workout');
    }

    // Check set limit
    if (exercise.sets.length >= config.maxSetsPerExercise) {
      throw new Error(`Maximum ${config.maxSetsPerExercise} sets per exercise`);
    }

    // CRITICAL: Validate reps
    if (typeof set.actualReps !== 'number' || !Number.isFinite(set.actualReps)) {
      throw new Error('Actual reps must be a valid number');
    }
    if (set.actualReps < 0 || set.actualReps > MAX_REPS_PER_SET) {
      throw new Error(`Reps must be between 0 and ${MAX_REPS_PER_SET}`);
    }
    if (!Number.isInteger(set.actualReps)) {
      throw new Error('Reps must be a whole number');
    }

    // CRITICAL: Validate weight
    if (typeof set.actualWeight !== 'number' || !Number.isFinite(set.actualWeight)) {
      throw new Error('Weight must be a valid number');
    }
    if (set.actualWeight < MIN_WEIGHT || set.actualWeight > MAX_WEIGHT) {
      throw new Error(`Weight must be between ${MIN_WEIGHT} and ${MAX_WEIGHT}`);
    }

    // Validate weight unit
    if (!['kg', 'lbs'].includes(set.weightUnit)) {
      throw new Error('Weight unit must be kg or lbs');
    }

    // Validate RPE if provided
    if (set.rpe !== undefined && set.rpe !== null) {
      if (
        typeof set.rpe !== 'number' ||
        set.rpe < VALID_RPE_RANGE.min ||
        set.rpe > VALID_RPE_RANGE.max
      ) {
        throw new Error(`RPE must be between ${VALID_RPE_RANGE.min} and ${VALID_RPE_RANGE.max}`);
      }
    }

    // Convert to kg for volume calculation
    const weightInKg = set.weightUnit === 'lbs' ? set.actualWeight * 0.453592 : set.actualWeight;
    const setVolume = weightInKg * set.actualReps;

    const loggedSet: LoggedSet = {
      setNumber: exercise.sets.length + 1,
      targetReps: set.targetReps ?? null,
      actualReps: Math.round(set.actualReps),
      targetWeight: set.targetWeight ?? null,
      actualWeight: Math.round(set.actualWeight * 100) / 100, // 2 decimal places
      weightUnit: set.weightUnit,
      rpe: set.rpe ?? null,
      isWarmup: set.isWarmup ?? false,
      isPersonalRecord: false, // Will be set by service after checking PRs
      completedAt: new Date(),
      notes: WorkoutLog.sanitize(set.notes || '').slice(0, 200),
    };

    exercise.sets.push(loggedSet);

    // Update totals (only count non-warmup sets)
    if (!loggedSet.isWarmup) {
      (this.props as { totalVolume: number }).totalVolume += setVolume;
      (this.props as { totalSets: number }).totalSets += 1;
      (this.props as { totalReps: number }).totalReps += loggedSet.actualReps;
    }

    this.touch();
    return loggedSet;
  }

  /**
   * Mark a set as a personal record
   */
  markSetAsPR(exerciseId: string, setNumber: number): void {
    const exercise = this.exercises.find((e) => e.id === exerciseId);
    if (!exercise) return;

    const set = exercise.sets.find((s) => s.setNumber === setNumber);
    if (set) {
      (set as { isPersonalRecord: boolean }).isPersonalRecord = true;
      this.touch();
    }
  }

  /**
   * Skip an exercise
   */
  skipExercise(exerciseId: string, reason?: string): void {
    if (this.status !== WorkoutStatus.IN_PROGRESS) {
      throw new Error('Cannot modify a completed workout');
    }

    const exercise = this.exercises.find((e) => e.id === exerciseId);
    if (!exercise) {
      throw new Error('Exercise not found in this workout');
    }

    (exercise as { skipped: boolean }).skipped = true;
    (exercise as { skippedReason: string | null }).skippedReason = reason
      ? WorkoutLog.sanitize(reason).slice(0, 200)
      : null;
    (exercise as { completedAt: Date }).completedAt = new Date();
    this.touch();
  }

  /**
   * Complete the workout
   */
  complete(notes?: string): void {
    if (this.status !== WorkoutStatus.IN_PROGRESS) {
      throw new Error('Workout is not in progress');
    }

    const config = getConfig();
    const now = new Date();
    const durationMs = now.getTime() - this.startedAt.getTime();
    const durationMinutes = Math.round(durationMs / 60000);

    // Validate duration isn't absurdly long (prevents timestamp manipulation)
    if (durationMinutes > config.maxWorkoutDurationMinutes) {
      console.warn(
        `Workout duration ${durationMinutes}min exceeds max ${config.maxWorkoutDurationMinutes}min`,
      );
      // Still complete but cap the duration
      (this.props as { duration: number }).duration = config.maxWorkoutDurationMinutes;
    } else {
      (this.props as { duration: number }).duration = durationMinutes;
    }

    (this.props as { completedAt: Date }).completedAt = now;
    (this.props as { status: WorkoutStatus }).status = WorkoutStatus.COMPLETED;

    if (notes) {
      const sanitizedNotes = WorkoutLog.sanitize(notes);
      if (sanitizedNotes.length > MAX_NOTES_LENGTH) {
        (this.props as { notes: string }).notes = sanitizedNotes.slice(0, MAX_NOTES_LENGTH);
      } else {
        (this.props as { notes: string }).notes = sanitizedNotes;
      }
    }

    // Mark all incomplete exercises as completed
    for (const exercise of this.exercises) {
      if (!exercise.completedAt) {
        (exercise as { completedAt: Date }).completedAt = now;
      }
    }

    this.touch();
  }

  /**
   * Abandon the workout
   */
  abandon(reason?: string): void {
    if (this.status !== WorkoutStatus.IN_PROGRESS) {
      throw new Error('Workout is not in progress');
    }

    const now = new Date();
    const durationMs = now.getTime() - this.startedAt.getTime();

    (this.props as { completedAt: Date }).completedAt = now;
    (this.props as { status: WorkoutStatus }).status = WorkoutStatus.ABANDONED;
    (this.props as { duration: number }).duration = Math.round(durationMs / 60000);

    if (reason) {
      (this.props as { notes: string }).notes = WorkoutLog.sanitize(reason).slice(
        0,
        MAX_NOTES_LENGTH,
      );
    }

    this.touch();
  }

  /**
   * SECURITY: Authorization check - only owner can modify
   */
  belongsTo(userId: string): boolean {
    return this.userId === userId;
  }

  canBeModifiedBy(userId: string): boolean {
    return this.belongsTo(userId) && !this.isDeleted;
  }

  canBeViewedBy(userId: string): boolean {
    // Only owner can view their workout logs
    return this.belongsTo(userId) && !this.isDeleted;
  }

  softDelete(): void {
    (this.props as { deletedAt: Date }).deletedAt = new Date();
    this.touch();
  }

  private touch(): void {
    (this.props as { updatedAt: Date }).updatedAt = new Date();
  }

  private static sanitize(input: string): string {
    if (typeof input !== 'string') return '';
    return input
      .replace(/\0/g, '')
      .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '')
      .trim();
  }

  private static isValidUuid(id: string): boolean {
    return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);
  }
}
