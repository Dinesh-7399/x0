// src/domain/entities/PersonalRecord.ts

/**
 * PersonalRecord entity - tracks user's best performances
 * SECURITY: Validates numeric values, prevents fake PR manipulation
 */

export enum RecordType {
  MAX_WEIGHT_1RM = 'max_weight_1rm', // 1 rep max
  MAX_WEIGHT_3RM = 'max_weight_3rm', // 3 rep max
  MAX_WEIGHT_5RM = 'max_weight_5rm', // 5 rep max
  MAX_WEIGHT_10RM = 'max_weight_10rm', // 10 rep max
  MAX_REPS = 'max_reps', // Max reps at bodyweight or fixed weight
  MAX_VOLUME = 'max_volume', // Max total volume in single workout
  MAX_DURATION = 'max_duration', // For cardio/endurance
}

export interface PersonalRecordProps {
  id: string;
  userId: string;
  exerciseId: string;
  exerciseName: string; // Denormalized
  recordType: RecordType;
  value: number;
  unit: string;
  reps: number | null; // For weight PRs
  weight: number | null; // For rep PRs
  achievedAt: Date;
  workoutLogId: string;
  workoutLogSetNumber: number | null;
  previousValue: number | null; // For showing improvement
  improvement: number | null; // Percentage improvement
  createdAt: Date;
}

// Validation limits - must match WorkoutLog
const MAX_REPS = 1000;
const MAX_WEIGHT = 2000; // kg
const MAX_VOLUME = 100000; // kg
const MAX_DURATION = 480; // minutes

export class PersonalRecord {
  private constructor(public readonly props: PersonalRecordProps) {}

  get id(): string {
    return this.props.id;
  }
  get userId(): string {
    return this.props.userId;
  }
  get exerciseId(): string {
    return this.props.exerciseId;
  }
  get exerciseName(): string {
    return this.props.exerciseName;
  }
  get recordType(): RecordType {
    return this.props.recordType;
  }
  get value(): number {
    return this.props.value;
  }
  get unit(): string {
    return this.props.unit;
  }
  get reps(): number | null {
    return this.props.reps;
  }
  get weight(): number | null {
    return this.props.weight;
  }
  get achievedAt(): Date {
    return this.props.achievedAt;
  }
  get workoutLogId(): string {
    return this.props.workoutLogId;
  }
  get workoutLogSetNumber(): number | null {
    return this.props.workoutLogSetNumber;
  }
  get previousValue(): number | null {
    return this.props.previousValue;
  }
  get improvement(): number | null {
    return this.props.improvement;
  }
  get createdAt(): Date {
    return this.props.createdAt;
  }

  /**
   * Create a new personal record
   * SECURITY: Validates all numeric values
   */
  static create(
    userId: string,
    exerciseId: string,
    exerciseName: string,
    recordType: RecordType,
    value: number,
    workoutLogId: string,
    options?: {
      unit?: string;
      reps?: number;
      weight?: number;
      setNumber?: number;
      previousValue?: number;
    },
  ): PersonalRecord {
    // Validate IDs
    if (!PersonalRecord.isValidUuid(userId)) {
      throw new Error('Invalid user ID');
    }
    if (!PersonalRecord.isValidUuid(exerciseId)) {
      throw new Error('Invalid exercise ID');
    }
    if (!PersonalRecord.isValidUuid(workoutLogId)) {
      throw new Error('Invalid workout log ID');
    }

    // Validate record type
    if (!Object.values(RecordType).includes(recordType)) {
      throw new Error('Invalid record type');
    }

    // CRITICAL: Validate value based on record type
    if (typeof value !== 'number' || !Number.isFinite(value) || value <= 0) {
      throw new Error('Record value must be a positive number');
    }

    switch (recordType) {
      case RecordType.MAX_WEIGHT_1RM:
      case RecordType.MAX_WEIGHT_3RM:
      case RecordType.MAX_WEIGHT_5RM:
      case RecordType.MAX_WEIGHT_10RM:
        if (value > MAX_WEIGHT) {
          throw new Error(`Weight cannot exceed ${MAX_WEIGHT} kg`);
        }
        break;
      case RecordType.MAX_REPS:
        if (value > MAX_REPS) {
          throw new Error(`Reps cannot exceed ${MAX_REPS}`);
        }
        break;
      case RecordType.MAX_VOLUME:
        if (value > MAX_VOLUME) {
          throw new Error(`Volume cannot exceed ${MAX_VOLUME} kg`);
        }
        break;
      case RecordType.MAX_DURATION:
        if (value > MAX_DURATION) {
          throw new Error(`Duration cannot exceed ${MAX_DURATION} minutes`);
        }
        break;
    }

    // Validate optional reps
    if (options?.reps !== undefined && options?.reps !== null) {
      if (!Number.isInteger(options.reps) || options.reps < 1 || options.reps > MAX_REPS) {
        throw new Error('Invalid reps value');
      }
    }

    // Validate optional weight
    if (options?.weight !== undefined && options?.weight !== null) {
      if (typeof options.weight !== 'number' || options.weight < 0 || options.weight > MAX_WEIGHT) {
        throw new Error('Invalid weight value');
      }
    }

    // Calculate improvement
    let improvement: number | null = null;
    if (options?.previousValue && options.previousValue > 0) {
      improvement =
        Math.round(((value - options.previousValue) / options.previousValue) * 10000) / 100;
    }

    // Determine unit
    let unit = options?.unit || '';
    if (!unit) {
      switch (recordType) {
        case RecordType.MAX_WEIGHT_1RM:
        case RecordType.MAX_WEIGHT_3RM:
        case RecordType.MAX_WEIGHT_5RM:
        case RecordType.MAX_WEIGHT_10RM:
        case RecordType.MAX_VOLUME:
          unit = 'kg';
          break;
        case RecordType.MAX_REPS:
          unit = 'reps';
          break;
        case RecordType.MAX_DURATION:
          unit = 'minutes';
          break;
      }
    }

    return new PersonalRecord({
      id: crypto.randomUUID(),
      userId,
      exerciseId,
      exerciseName: PersonalRecord.sanitize(exerciseName).slice(0, 100),
      recordType,
      value: Math.round(value * 100) / 100, // 2 decimal places
      unit,
      reps: options?.reps ?? null,
      weight: options?.weight ? Math.round(options.weight * 100) / 100 : null,
      achievedAt: new Date(),
      workoutLogId,
      workoutLogSetNumber: options?.setNumber ?? null,
      previousValue: options?.previousValue ?? null,
      improvement,
      createdAt: new Date(),
    });
  }

  static fromPersistence(props: PersonalRecordProps): PersonalRecord {
    return new PersonalRecord(props);
  }

  /**
   * Check if a new value beats this record
   */
  isBeatenBy(newValue: number): boolean {
    return newValue > this.value;
  }

  belongsTo(userId: string): boolean {
    return this.userId === userId;
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
