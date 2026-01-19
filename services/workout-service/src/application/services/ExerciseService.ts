// src/application/services/ExerciseService.ts

/**
 * ExerciseService - manages exercise catalog
 * SECURITY: Enforces authorization, validates custom exercise limits
 */

import { getConfig } from '../../config/index.js';
import {
  type Difficulty,
  Equipment,
  Exercise,
  ExerciseCategory,
  type ExerciseType,
  MuscleGroup,
} from '../../domain/entities/Exercise.js';
import type { IExerciseRepository } from '../../domain/repositories/IExerciseRepository.js';
import {
  ExerciseNotFoundError,
  ExerciseNotOwnedError,
  InvalidExerciseDataError,
  SystemExerciseError,
  TooManyCustomExercisesError,
} from '../errors/WorkoutErrors.js';

export interface CreateExerciseDto {
  name: string;
  description: string;
  instructions?: string[];
  category?: ExerciseCategory;
  primaryMuscles?: MuscleGroup[];
  secondaryMuscles?: MuscleGroup[];
  equipment?: Equipment[];
  difficulty?: Difficulty;
  exerciseType?: ExerciseType;
  mediaUrls?: string[];
  isPublic?: boolean;
}

export interface UpdateExerciseDto {
  name?: string;
  description?: string;
  instructions?: string[];
  category?: ExerciseCategory;
  primaryMuscles?: MuscleGroup[];
  secondaryMuscles?: MuscleGroup[];
  equipment?: Equipment[];
  difficulty?: Difficulty;
  exerciseType?: ExerciseType;
  mediaUrls?: string[];
  isPublic?: boolean;
}

export interface ExerciseResponse {
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
  isSystemExercise: boolean;
  isCustom: boolean;
  isPublic: boolean;
  usageCount: number;
  createdAt: Date;
}

export interface ExerciseListResponse {
  exercises: ExerciseResponse[];
  total: number;
  hasMore: boolean;
  limit: number;
  offset: number;
}

export class ExerciseService {
  constructor(private readonly exerciseRepo: IExerciseRepository) {}

  /**
   * Create a custom exercise
   * SECURITY: Enforces custom exercise limit per user
   */
  async createExercise(userId: string, dto: CreateExerciseDto): Promise<ExerciseResponse> {
    const config = getConfig();

    // SECURITY: Check custom exercise limit
    const currentCount = await this.exerciseRepo.countByCreator(userId);
    if (currentCount >= config.maxCustomExercises) {
      throw new TooManyCustomExercisesError(config.maxCustomExercises);
    }

    try {
      const exercise = Exercise.create(userId, dto.name, dto.description, {
        instructions: dto.instructions,
        category: dto.category,
        primaryMuscles: dto.primaryMuscles,
        secondaryMuscles: dto.secondaryMuscles,
        equipment: dto.equipment,
        difficulty: dto.difficulty,
        exerciseType: dto.exerciseType,
        mediaUrls: dto.mediaUrls,
        isPublic: dto.isPublic,
      });

      await this.exerciseRepo.save(exercise);
      return this.toResponse(exercise);
    } catch (error) {
      // Re-throw validation errors with proper type
      if (error instanceof Error) {
        throw new InvalidExerciseDataError(error.message);
      }
      throw error;
    }
  }

  /**
   * Get exercise by ID
   * SECURITY: Checks view permission
   */
  async getExercise(userId: string, exerciseId: string): Promise<ExerciseResponse> {
    const exercise = await this.exerciseRepo.findById(exerciseId);

    if (!exercise || exercise.isDeleted) {
      throw new ExerciseNotFoundError(exerciseId);
    }

    // SECURITY: Check view permission
    if (!exercise.canBeViewedBy(userId)) {
      throw new ExerciseNotFoundError(exerciseId);
    }

    return this.toResponse(exercise);
  }

  /**
   * Update a custom exercise
   * SECURITY: Only owner can modify
   */
  async updateExercise(
    userId: string,
    exerciseId: string,
    dto: UpdateExerciseDto,
  ): Promise<ExerciseResponse> {
    const exercise = await this.exerciseRepo.findById(exerciseId);

    if (!exercise || exercise.isDeleted) {
      throw new ExerciseNotFoundError(exerciseId);
    }

    // SECURITY: Check ownership
    if (exercise.isSystemExercise) {
      throw new SystemExerciseError();
    }

    if (!exercise.canBeModifiedBy(userId)) {
      throw new ExerciseNotOwnedError();
    }

    try {
      exercise.update(dto);
      await this.exerciseRepo.update(exercise);
      return this.toResponse(exercise);
    } catch (error) {
      if (error instanceof Error) {
        throw new InvalidExerciseDataError(error.message);
      }
      throw error;
    }
  }

  /**
   * Delete a custom exercise (soft delete)
   * SECURITY: Only owner can delete
   */
  async deleteExercise(userId: string, exerciseId: string): Promise<void> {
    const exercise = await this.exerciseRepo.findById(exerciseId);

    if (!exercise || exercise.isDeleted) {
      throw new ExerciseNotFoundError(exerciseId);
    }

    if (exercise.isSystemExercise) {
      throw new SystemExerciseError();
    }

    if (!exercise.canBeDeletedBy(userId)) {
      throw new ExerciseNotOwnedError();
    }

    exercise.softDelete();
    await this.exerciseRepo.update(exercise);
  }

  /**
   * Search exercises
   */
  async searchExercises(
    userId: string,
    options: {
      query?: string;
      category?: ExerciseCategory;
      equipment?: Equipment[];
      difficulty?: Difficulty;
      muscleGroup?: string;
      limit?: number;
      offset?: number;
    },
  ): Promise<ExerciseListResponse> {
    const config = getConfig();
    const limit = Math.min(options.limit || config.defaultPageSize, config.maxPageSize);
    const offset = options.offset || 0;

    const result = await this.exerciseRepo.search({
      query: options.query,
      category: options.category,
      equipment: options.equipment,
      difficulty: options.difficulty,
      muscleGroup: options.muscleGroup,
      isSystemExercise: undefined, // Include both
      isPublic: true, // Only public or user's own
      createdBy: userId, // Include user's own exercises
      limit,
      offset,
    });

    return {
      exercises: result.exercises
        .filter((e) => e.canBeViewedBy(userId))
        .map((e) => this.toResponse(e)),
      total: result.total,
      hasMore: result.hasMore,
      limit,
      offset,
    };
  }

  /**
   * List user's custom exercises
   */
  async listMyExercises(
    userId: string,
    options: { limit?: number; offset?: number },
  ): Promise<ExerciseListResponse> {
    const config = getConfig();
    const limit = Math.min(options.limit || config.defaultPageSize, config.maxPageSize);
    const offset = options.offset || 0;

    const result = await this.exerciseRepo.findByCreator(userId, limit, offset);

    return {
      exercises: result.exercises.map((e) => this.toResponse(e)),
      total: result.total,
      hasMore: result.hasMore,
      limit,
      offset,
    };
  }

  /**
   * Get available categories (for filters)
   */
  getCategories(): ExerciseCategory[] {
    return Object.values(ExerciseCategory);
  }

  /**
   * Get available equipment (for filters)
   */
  getEquipment(): Equipment[] {
    return Object.values(Equipment);
  }

  /**
   * Get available muscle groups (for filters)
   */
  getMuscleGroups(): MuscleGroup[] {
    return Object.values(MuscleGroup);
  }

  private toResponse(exercise: Exercise): ExerciseResponse {
    return {
      id: exercise.id,
      name: exercise.name,
      slug: exercise.slug,
      description: exercise.description,
      instructions: exercise.instructions,
      category: exercise.category,
      primaryMuscles: exercise.primaryMuscles,
      secondaryMuscles: exercise.secondaryMuscles,
      equipment: exercise.equipment,
      difficulty: exercise.difficulty,
      exerciseType: exercise.exerciseType,
      mediaUrls: exercise.mediaUrls,
      isSystemExercise: exercise.isSystemExercise,
      isCustom: exercise.isCustom,
      isPublic: exercise.isPublic,
      usageCount: exercise.usageCount,
      createdAt: exercise.createdAt,
    };
  }
}
