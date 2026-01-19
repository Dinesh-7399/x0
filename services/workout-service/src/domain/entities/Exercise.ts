// src/domain/entities/Exercise.ts

/**
 * Exercise entity - represents a single exercise movement
 * SECURITY: All user input must be sanitized before creating
 */

export enum ExerciseCategory {
  CHEST = 'chest',
  BACK = 'back',
  SHOULDERS = 'shoulders',
  BICEPS = 'biceps',
  TRICEPS = 'triceps',
  LEGS = 'legs',
  GLUTES = 'glutes',
  CORE = 'core',
  CARDIO = 'cardio',
  FULL_BODY = 'full_body',
  OTHER = 'other',
}

export enum MuscleGroup {
  PECTORALS = 'pectorals',
  LATISSIMUS_DORSI = 'latissimus_dorsi',
  TRAPEZIUS = 'trapezius',
  RHOMBOIDS = 'rhomboids',
  DELTOIDS = 'deltoids',
  BICEPS = 'biceps',
  TRICEPS = 'triceps',
  FOREARMS = 'forearms',
  QUADRICEPS = 'quadriceps',
  HAMSTRINGS = 'hamstrings',
  GLUTES = 'glutes',
  CALVES = 'calves',
  ABDOMINALS = 'abdominals',
  OBLIQUES = 'obliques',
  LOWER_BACK = 'lower_back',
  HIP_FLEXORS = 'hip_flexors',
}

export enum Equipment {
  BARBELL = 'barbell',
  DUMBBELL = 'dumbbell',
  KETTLEBELL = 'kettlebell',
  CABLE = 'cable',
  MACHINE = 'machine',
  BODYWEIGHT = 'bodyweight',
  RESISTANCE_BAND = 'resistance_band',
  MEDICINE_BALL = 'medicine_ball',
  PULL_UP_BAR = 'pull_up_bar',
  BENCH = 'bench',
  SQUAT_RACK = 'squat_rack',
  TREADMILL = 'treadmill',
  BIKE = 'bike',
  ROWER = 'rower',
  OTHER = 'other',
  NONE = 'none',
}

export enum Difficulty {
  BEGINNER = 'beginner',
  INTERMEDIATE = 'intermediate',
  ADVANCED = 'advanced',
  EXPERT = 'expert',
}

export enum ExerciseType {
  STRENGTH = 'strength',
  CARDIO = 'cardio',
  FLEXIBILITY = 'flexibility',
  BALANCE = 'balance',
  PLYOMETRIC = 'plyometric',
  WARMUP = 'warmup',
  COOLDOWN = 'cooldown',
}

export interface ExerciseProps {
  id: string;
  name: string;
  slug: string;
  description: string;
  instructions: string[];
  category: ExerciseCategory;
  primaryMuscles: MuscleGroup[];
  secondaryMuscles: MuscleGroup[];
  equipment: Equipment[];
  difficulty: Difficulty;
  exerciseType: ExerciseType;
  mediaUrls: string[];
  isSystemExercise: boolean; // Created by admin, immutable
  isCustom: boolean; // User-created
  createdBy: string | null; // null for system exercises
  isApproved: boolean; // Admin approved for public catalog
  isPublic: boolean;
  usageCount: number;
  deletedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

// Validation constants - CRITICAL for security
const MAX_NAME_LENGTH = 100;
const MAX_DESCRIPTION_LENGTH = 2000;
const MAX_INSTRUCTION_LENGTH = 500;
const MAX_INSTRUCTIONS_COUNT = 20;
const MAX_MEDIA_URLS = 10;
const NAME_PATTERN = /^[\p{L}\p{N}\s\-'().]+$/u; // Unicode letters, numbers, spaces, basic punctuation

export class Exercise {
  private constructor(public readonly props: ExerciseProps) {}

  get id(): string {
    return this.props.id;
  }
  get name(): string {
    return this.props.name;
  }
  get slug(): string {
    return this.props.slug;
  }
  get description(): string {
    return this.props.description;
  }
  get instructions(): string[] {
    return this.props.instructions;
  }
  get category(): ExerciseCategory {
    return this.props.category;
  }
  get primaryMuscles(): MuscleGroup[] {
    return this.props.primaryMuscles;
  }
  get secondaryMuscles(): MuscleGroup[] {
    return this.props.secondaryMuscles;
  }
  get equipment(): Equipment[] {
    return this.props.equipment;
  }
  get difficulty(): Difficulty {
    return this.props.difficulty;
  }
  get exerciseType(): ExerciseType {
    return this.props.exerciseType;
  }
  get mediaUrls(): string[] {
    return this.props.mediaUrls;
  }
  get isSystemExercise(): boolean {
    return this.props.isSystemExercise;
  }
  get isCustom(): boolean {
    return this.props.isCustom;
  }
  get createdBy(): string | null {
    return this.props.createdBy;
  }
  get isApproved(): boolean {
    return this.props.isApproved;
  }
  get isPublic(): boolean {
    return this.props.isPublic;
  }
  get usageCount(): number {
    return this.props.usageCount;
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

  /**
   * Create a new custom exercise
   * @throws Error if validation fails
   */
  static create(
    createdBy: string,
    name: string,
    description: string,
    options: {
      instructions?: string[];
      category?: ExerciseCategory;
      primaryMuscles?: MuscleGroup[];
      secondaryMuscles?: MuscleGroup[];
      equipment?: Equipment[];
      difficulty?: Difficulty;
      exerciseType?: ExerciseType;
      mediaUrls?: string[];
      isPublic?: boolean;
    },
  ): Exercise {
    // VALIDATION: Sanitize and validate all inputs
    const sanitizedName = Exercise.sanitizeText(name).trim();
    const sanitizedDescription = Exercise.sanitizeText(description).trim();

    if (!sanitizedName || sanitizedName.length < 2) {
      throw new Error('Exercise name must be at least 2 characters');
    }
    if (sanitizedName.length > MAX_NAME_LENGTH) {
      throw new Error(`Exercise name cannot exceed ${MAX_NAME_LENGTH} characters`);
    }
    if (!NAME_PATTERN.test(sanitizedName)) {
      throw new Error('Exercise name contains invalid characters');
    }

    if (sanitizedDescription.length > MAX_DESCRIPTION_LENGTH) {
      throw new Error(`Description cannot exceed ${MAX_DESCRIPTION_LENGTH} characters`);
    }

    // Validate instructions
    const instructions = (options.instructions || [])
      .map((i) => Exercise.sanitizeText(i).trim())
      .filter((i) => i.length > 0);

    if (instructions.length > MAX_INSTRUCTIONS_COUNT) {
      throw new Error(`Maximum ${MAX_INSTRUCTIONS_COUNT} instructions allowed`);
    }
    for (const instruction of instructions) {
      if (instruction.length > MAX_INSTRUCTION_LENGTH) {
        throw new Error(`Each instruction cannot exceed ${MAX_INSTRUCTION_LENGTH} characters`);
      }
    }

    // Validate media URLs
    const mediaUrls = options.mediaUrls || [];
    if (mediaUrls.length > MAX_MEDIA_URLS) {
      throw new Error(`Maximum ${MAX_MEDIA_URLS} media URLs allowed`);
    }
    for (const url of mediaUrls) {
      if (!Exercise.isValidUrl(url)) {
        throw new Error(`Invalid media URL: ${url}`);
      }
    }

    // Validate enums
    const category = options.category || ExerciseCategory.OTHER;
    if (!Object.values(ExerciseCategory).includes(category)) {
      throw new Error('Invalid exercise category');
    }

    const difficulty = options.difficulty || Difficulty.INTERMEDIATE;
    if (!Object.values(Difficulty).includes(difficulty)) {
      throw new Error('Invalid difficulty level');
    }

    const exerciseType = options.exerciseType || ExerciseType.STRENGTH;
    if (!Object.values(ExerciseType).includes(exerciseType)) {
      throw new Error('Invalid exercise type');
    }

    // Validate muscle groups
    const primaryMuscles = options.primaryMuscles || [];
    const secondaryMuscles = options.secondaryMuscles || [];
    for (const muscle of [...primaryMuscles, ...secondaryMuscles]) {
      if (!Object.values(MuscleGroup).includes(muscle)) {
        throw new Error(`Invalid muscle group: ${muscle}`);
      }
    }

    // Validate equipment
    const equipment = options.equipment || [Equipment.NONE];
    for (const eq of equipment) {
      if (!Object.values(Equipment).includes(eq)) {
        throw new Error(`Invalid equipment: ${eq}`);
      }
    }

    return new Exercise({
      id: crypto.randomUUID(),
      name: sanitizedName,
      slug: Exercise.generateSlug(sanitizedName),
      description: sanitizedDescription,
      instructions,
      category,
      primaryMuscles,
      secondaryMuscles,
      equipment,
      difficulty,
      exerciseType,
      mediaUrls,
      isSystemExercise: false,
      isCustom: true,
      createdBy,
      isApproved: false,
      isPublic: options.isPublic ?? false,
      usageCount: 0,
      deletedAt: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    });
  }

  static fromPersistence(props: ExerciseProps): Exercise {
    return new Exercise(props);
  }

  /**
   * Check if user can modify this exercise
   * SECURITY: Critical authorization check
   */
  canBeModifiedBy(userId: string): boolean {
    // System exercises cannot be modified by anyone except through admin tools
    if (this.isSystemExercise) {
      return false;
    }
    // Custom exercises can only be modified by their creator
    return this.createdBy === userId && !this.isDeleted;
  }

  /**
   * Check if user can view this exercise
   */
  canBeViewedBy(userId: string): boolean {
    if (this.isDeleted) return false;
    if (this.isSystemExercise) return true;
    if (this.isPublic && this.isApproved) return true;
    return this.createdBy === userId;
  }

  /**
   * Check if exercise can be deleted
   * SECURITY: Exercises with usage should be soft-deleted only
   */
  canBeDeletedBy(userId: string): boolean {
    if (this.isSystemExercise) return false;
    return this.createdBy === userId && !this.isDeleted;
  }

  update(
    updates: Partial<{
      name: string;
      description: string;
      instructions: string[];
      category: ExerciseCategory;
      primaryMuscles: MuscleGroup[];
      secondaryMuscles: MuscleGroup[];
      equipment: Equipment[];
      difficulty: Difficulty;
      exerciseType: ExerciseType;
      mediaUrls: string[];
      isPublic: boolean;
    }>,
  ): void {
    if (this.isSystemExercise) {
      throw new Error('System exercises cannot be modified');
    }

    if (updates.name !== undefined) {
      const sanitized = Exercise.sanitizeText(updates.name).trim();
      if (sanitized.length < 2 || sanitized.length > MAX_NAME_LENGTH) {
        throw new Error('Invalid exercise name length');
      }
      if (!NAME_PATTERN.test(sanitized)) {
        throw new Error('Exercise name contains invalid characters');
      }
      (this.props as { name: string }).name = sanitized;
      (this.props as { slug: string }).slug = Exercise.generateSlug(sanitized);
    }

    if (updates.description !== undefined) {
      const sanitized = Exercise.sanitizeText(updates.description).trim();
      if (sanitized.length > MAX_DESCRIPTION_LENGTH) {
        throw new Error('Description too long');
      }
      (this.props as { description: string }).description = sanitized;
    }

    if (updates.instructions !== undefined) {
      const sanitized = updates.instructions
        .map((i) => Exercise.sanitizeText(i).trim())
        .filter((i) => i.length > 0);
      if (sanitized.length > MAX_INSTRUCTIONS_COUNT) {
        throw new Error('Too many instructions');
      }
      (this.props as { instructions: string[] }).instructions = sanitized;
    }

    if (updates.category !== undefined) {
      if (!Object.values(ExerciseCategory).includes(updates.category)) {
        throw new Error('Invalid category');
      }
      (this.props as { category: ExerciseCategory }).category = updates.category;
    }

    if (updates.primaryMuscles !== undefined) {
      (this.props as { primaryMuscles: MuscleGroup[] }).primaryMuscles = updates.primaryMuscles;
    }

    if (updates.secondaryMuscles !== undefined) {
      (this.props as { secondaryMuscles: MuscleGroup[] }).secondaryMuscles =
        updates.secondaryMuscles;
    }

    if (updates.equipment !== undefined) {
      (this.props as { equipment: Equipment[] }).equipment = updates.equipment;
    }

    if (updates.difficulty !== undefined) {
      (this.props as { difficulty: Difficulty }).difficulty = updates.difficulty;
    }

    if (updates.exerciseType !== undefined) {
      (this.props as { exerciseType: ExerciseType }).exerciseType = updates.exerciseType;
    }

    if (updates.mediaUrls !== undefined) {
      if (updates.mediaUrls.length > MAX_MEDIA_URLS) {
        throw new Error('Too many media URLs');
      }
      (this.props as { mediaUrls: string[] }).mediaUrls = updates.mediaUrls;
    }

    if (updates.isPublic !== undefined) {
      (this.props as { isPublic: boolean }).isPublic = updates.isPublic;
      // Reset approval if visibility changed
      if (updates.isPublic) {
        (this.props as { isApproved: boolean }).isApproved = false;
      }
    }

    this.touch();
  }

  softDelete(): void {
    if (this.isSystemExercise) {
      throw new Error('System exercises cannot be deleted');
    }
    (this.props as { deletedAt: Date }).deletedAt = new Date();
    this.touch();
  }

  incrementUsage(): void {
    (this.props as { usageCount: number }).usageCount += 1;
  }

  private touch(): void {
    (this.props as { updatedAt: Date }).updatedAt = new Date();
  }

  /**
   * Sanitize text input to prevent XSS and injection
   */
  private static sanitizeText(input: string): string {
    if (typeof input !== 'string') return '';
    // Remove null bytes and control characters
    return input
      .replace(/\0/g, '')
      .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '')
      .trim();
  }

  private static generateSlug(name: string): string {
    return name
      .toLowerCase()
      .replace(/[^\p{L}\p{N}]+/gu, '-')
      .replace(/^-+|-+$/g, '')
      .substring(0, 100);
  }

  private static isValidUrl(url: string): boolean {
    try {
      const parsed = new URL(url);
      return ['http:', 'https:'].includes(parsed.protocol);
    } catch {
      return false;
    }
  }
}
