// src/domain/entities/WorkoutTemplate.ts

/**
 * WorkoutTemplate entity - a reusable workout structure
 * SECURITY: Validates all inputs, prevents resource exhaustion
 */

import { getConfig } from '../../config/index.js';

export enum Visibility {
  PRIVATE = 'private',
  PUBLIC = 'public',
  GYM_ONLY = 'gym_only',
  CLIENTS_ONLY = 'clients_only',
}

export interface SetPrescription {
  setNumber: number;
  targetReps: string; // "10" or "8-12" or "AMRAP"
  targetWeight: number | null;
  weightUnit: 'kg' | 'lbs' | '%1RM';
  restSeconds: number | null; // Override default rest
  tempo: string | null; // "3-1-2-0" format
  rpe: number | null; // 1-10
  notes: string;
}

export interface TemplateExercise {
  id: string;
  exerciseId: string;
  orderIndex: number;
  sets: SetPrescription[];
  restSeconds: number;
  supersetGroup: string | null;
  notes: string;
  alternatives: string[]; // Alternative exercise IDs
}

export interface WorkoutTemplateProps {
  id: string;
  name: string;
  description: string;
  createdBy: string;
  visibility: Visibility;
  gymId: string | null;
  targetDuration: number; // minutes
  difficulty: string;
  tags: string[];
  exercises: TemplateExercise[];
  warmup: TemplateExercise[];
  cooldown: TemplateExercise[];
  notes: string;
  mediaUrl: string | null;
  usageCount: number;
  rating: number;
  ratingCount: number;
  isFeatured: boolean;
  deletedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

// Validation limits
const MAX_NAME_LENGTH = 100;
const MAX_DESCRIPTION_LENGTH = 2000;
const MAX_NOTES_LENGTH = 1000;
const MAX_TAGS = 20;
const MAX_TAG_LENGTH = 30;
const MAX_ALTERNATIVES = 5;
const MAX_REST_SECONDS = 600; // 10 minutes max rest
const MIN_REST_SECONDS = 0;
const MAX_REPS_VALUE = 1000;
const MAX_WEIGHT_VALUE = 2000; // kg
const VALID_RPE_RANGE = { min: 1, max: 10 };
const TEMPO_PATTERN = /^[0-9]-[0-9]-[0-9]-[0-9]$/;
const REPS_PATTERN = /^(\d+|\d+-\d+|AMRAP|MAX|FAILURE)$/i;

export class WorkoutTemplate {
  private constructor(public readonly props: WorkoutTemplateProps) {}

  get id(): string {
    return this.props.id;
  }
  get name(): string {
    return this.props.name;
  }
  get description(): string {
    return this.props.description;
  }
  get createdBy(): string {
    return this.props.createdBy;
  }
  get visibility(): Visibility {
    return this.props.visibility;
  }
  get gymId(): string | null {
    return this.props.gymId;
  }
  get targetDuration(): number {
    return this.props.targetDuration;
  }
  get difficulty(): string {
    return this.props.difficulty;
  }
  get tags(): string[] {
    return this.props.tags;
  }
  get exercises(): TemplateExercise[] {
    return this.props.exercises;
  }
  get warmup(): TemplateExercise[] {
    return this.props.warmup;
  }
  get cooldown(): TemplateExercise[] {
    return this.props.cooldown;
  }
  get notes(): string {
    return this.props.notes;
  }
  get mediaUrl(): string | null {
    return this.props.mediaUrl;
  }
  get usageCount(): number {
    return this.props.usageCount;
  }
  get rating(): number {
    return this.props.rating;
  }
  get ratingCount(): number {
    return this.props.ratingCount;
  }
  get isFeatured(): boolean {
    return this.props.isFeatured;
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

  get totalExercises(): number {
    return this.props.exercises.length + this.props.warmup.length + this.props.cooldown.length;
  }

  /**
   * Create a new workout template
   * @throws Error if validation fails
   */
  static create(
    createdBy: string,
    name: string,
    description: string,
    exercises: TemplateExercise[],
    options?: {
      visibility?: Visibility;
      gymId?: string;
      targetDuration?: number;
      difficulty?: string;
      tags?: string[];
      warmup?: TemplateExercise[];
      cooldown?: TemplateExercise[];
      notes?: string;
      mediaUrl?: string;
    },
  ): WorkoutTemplate {
    const config = getConfig();

    // Validate name
    const sanitizedName = WorkoutTemplate.sanitize(name);
    if (sanitizedName.length < 2) {
      throw new Error('Template name must be at least 2 characters');
    }
    if (sanitizedName.length > MAX_NAME_LENGTH) {
      throw new Error(`Template name cannot exceed ${MAX_NAME_LENGTH} characters`);
    }

    // Validate description
    const sanitizedDesc = WorkoutTemplate.sanitize(description);
    if (sanitizedDesc.length > MAX_DESCRIPTION_LENGTH) {
      throw new Error(`Description cannot exceed ${MAX_DESCRIPTION_LENGTH} characters`);
    }

    // Validate exercise count - CRITICAL limit
    const totalExercises =
      exercises.length + (options?.warmup?.length || 0) + (options?.cooldown?.length || 0);

    if (totalExercises === 0) {
      throw new Error('Workout must have at least one exercise');
    }
    if (totalExercises > config.maxExercisesPerWorkout) {
      throw new Error(`Maximum ${config.maxExercisesPerWorkout} exercises allowed per workout`);
    }

    // Validate each exercise
    const validatedExercises = exercises.map((ex, i) =>
      WorkoutTemplate.validateExercise(ex, i, config.maxSetsPerExercise),
    );
    const validatedWarmup = (options?.warmup || []).map((ex, i) =>
      WorkoutTemplate.validateExercise(ex, i, config.maxSetsPerExercise),
    );
    const validatedCooldown = (options?.cooldown || []).map((ex, i) =>
      WorkoutTemplate.validateExercise(ex, i, config.maxSetsPerExercise),
    );

    // Validate tags
    const tags = (options?.tags || [])
      .map((t) => WorkoutTemplate.sanitize(t).toLowerCase())
      .filter((t) => t.length > 0 && t.length <= MAX_TAG_LENGTH)
      .slice(0, MAX_TAGS);

    // Validate notes
    const notes = WorkoutTemplate.sanitize(options?.notes || '');
    if (notes.length > MAX_NOTES_LENGTH) {
      throw new Error(`Notes cannot exceed ${MAX_NOTES_LENGTH} characters`);
    }

    // Validate target duration
    const targetDuration = options?.targetDuration || 60;
    if (targetDuration < 1 || targetDuration > 480) {
      throw new Error('Target duration must be between 1 and 480 minutes');
    }

    // Validate visibility
    const visibility = options?.visibility || Visibility.PRIVATE;
    if (!Object.values(Visibility).includes(visibility)) {
      throw new Error('Invalid visibility setting');
    }

    // Validate gymId for GYM_ONLY visibility
    if (visibility === Visibility.GYM_ONLY && !options?.gymId) {
      throw new Error('Gym ID required for gym-only templates');
    }

    return new WorkoutTemplate({
      id: crypto.randomUUID(),
      name: sanitizedName,
      description: sanitizedDesc,
      createdBy,
      visibility,
      gymId: options?.gymId || null,
      targetDuration,
      difficulty: options?.difficulty || 'intermediate',
      tags,
      exercises: validatedExercises,
      warmup: validatedWarmup,
      cooldown: validatedCooldown,
      notes,
      mediaUrl: options?.mediaUrl || null,
      usageCount: 0,
      rating: 0,
      ratingCount: 0,
      isFeatured: false,
      deletedAt: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    });
  }

  static fromPersistence(props: WorkoutTemplateProps): WorkoutTemplate {
    return new WorkoutTemplate(props);
  }

  /**
   * Validate a single exercise in the template
   */
  private static validateExercise(
    exercise: TemplateExercise,
    index: number,
    maxSets: number,
  ): TemplateExercise {
    if (!exercise.exerciseId || typeof exercise.exerciseId !== 'string') {
      throw new Error(`Exercise ${index + 1}: Invalid exercise ID`);
    }

    // Validate UUID format
    if (
      !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(exercise.exerciseId)
    ) {
      throw new Error(`Exercise ${index + 1}: Invalid exercise ID format`);
    }

    // Validate sets count
    if (!exercise.sets || exercise.sets.length === 0) {
      throw new Error(`Exercise ${index + 1}: At least one set required`);
    }
    if (exercise.sets.length > maxSets) {
      throw new Error(`Exercise ${index + 1}: Maximum ${maxSets} sets allowed`);
    }

    // Validate each set
    const validatedSets = exercise.sets.map((set, setIndex) =>
      WorkoutTemplate.validateSet(set, index, setIndex),
    );

    // Validate rest seconds
    const restSeconds = exercise.restSeconds ?? 60;
    if (restSeconds < MIN_REST_SECONDS || restSeconds > MAX_REST_SECONDS) {
      throw new Error(
        `Exercise ${index + 1}: Rest must be between ${MIN_REST_SECONDS} and ${MAX_REST_SECONDS} seconds`,
      );
    }

    // Validate alternatives
    const alternatives = (exercise.alternatives || []).slice(0, MAX_ALTERNATIVES);
    for (const alt of alternatives) {
      if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(alt)) {
        throw new Error(`Exercise ${index + 1}: Invalid alternative exercise ID`);
      }
    }

    return {
      id: exercise.id || crypto.randomUUID(),
      exerciseId: exercise.exerciseId,
      orderIndex: index,
      sets: validatedSets,
      restSeconds,
      supersetGroup: exercise.supersetGroup || null,
      notes: WorkoutTemplate.sanitize(exercise.notes || '').slice(0, 500),
      alternatives,
    };
  }

  /**
   * Validate a single set prescription
   */
  private static validateSet(
    set: SetPrescription,
    exerciseIndex: number,
    setIndex: number,
  ): SetPrescription {
    const prefix = `Exercise ${exerciseIndex + 1}, Set ${setIndex + 1}`;

    // Validate target reps
    const targetReps = (set.targetReps || '').toString().trim().toUpperCase();
    if (!REPS_PATTERN.test(targetReps)) {
      throw new Error(`${prefix}: Invalid rep format. Use number, range (8-12), or AMRAP`);
    }

    // Validate reps aren't absurd
    const repsMatch = targetReps.match(/\d+/g);
    if (repsMatch) {
      const maxReps = Math.max(...repsMatch.map(Number));
      if (maxReps > MAX_REPS_VALUE) {
        throw new Error(`${prefix}: Reps cannot exceed ${MAX_REPS_VALUE}`);
      }
    }

    // Validate weight
    const targetWeight = set.targetWeight;
    if (targetWeight !== null && targetWeight !== undefined) {
      if (typeof targetWeight !== 'number' || targetWeight < 0) {
        throw new Error(`${prefix}: Invalid weight value`);
      }
      if (targetWeight > MAX_WEIGHT_VALUE) {
        throw new Error(`${prefix}: Weight cannot exceed ${MAX_WEIGHT_VALUE} kg`);
      }
    }

    // Validate weight unit
    const weightUnit = set.weightUnit || 'kg';
    if (!['kg', 'lbs', '%1RM'].includes(weightUnit)) {
      throw new Error(`${prefix}: Invalid weight unit`);
    }

    // Validate RPE
    const rpe = set.rpe;
    if (rpe !== null && rpe !== undefined) {
      if (typeof rpe !== 'number' || rpe < VALID_RPE_RANGE.min || rpe > VALID_RPE_RANGE.max) {
        throw new Error(
          `${prefix}: RPE must be between ${VALID_RPE_RANGE.min} and ${VALID_RPE_RANGE.max}`,
        );
      }
    }

    // Validate tempo
    const tempo = set.tempo;
    if (tempo !== null && tempo !== undefined && tempo !== '') {
      if (!TEMPO_PATTERN.test(tempo)) {
        throw new Error(`${prefix}: Invalid tempo format. Use X-X-X-X (e.g., 3-1-2-0)`);
      }
    }

    // Validate rest override
    const restSeconds = set.restSeconds;
    if (restSeconds !== null && restSeconds !== undefined) {
      if (restSeconds < MIN_REST_SECONDS || restSeconds > MAX_REST_SECONDS) {
        throw new Error(
          `${prefix}: Rest override must be between ${MIN_REST_SECONDS} and ${MAX_REST_SECONDS} seconds`,
        );
      }
    }

    return {
      setNumber: setIndex + 1,
      targetReps,
      targetWeight: targetWeight ?? null,
      weightUnit,
      restSeconds: restSeconds ?? null,
      tempo: tempo || null,
      rpe: rpe ?? null,
      notes: WorkoutTemplate.sanitize(set.notes || '').slice(0, 200),
    };
  }

  /**
   * SECURITY: Authorization check
   */
  canBeModifiedBy(userId: string): boolean {
    return this.createdBy === userId && !this.isDeleted;
  }

  canBeViewedBy(userId: string, userGymIds?: string[]): boolean {
    if (this.isDeleted) return false;
    if (this.createdBy === userId) return true;

    switch (this.visibility) {
      case Visibility.PUBLIC:
        return true;
      case Visibility.GYM_ONLY:
        return this.gymId !== null && (userGymIds || []).includes(this.gymId);
      default:
        return false;
    }
  }

  canBeDeletedBy(userId: string): boolean {
    return this.createdBy === userId && !this.isDeleted;
  }

  softDelete(): void {
    (this.props as { deletedAt: Date }).deletedAt = new Date();
    this.touch();
  }

  incrementUsage(): void {
    (this.props as { usageCount: number }).usageCount += 1;
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
}
