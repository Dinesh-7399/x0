// src/domain/repositories/IExerciseRepository.ts

import type { Difficulty, Equipment, Exercise, ExerciseCategory } from '../entities/Exercise.js';

export interface ExerciseSearchOptions {
  query?: string;
  category?: ExerciseCategory;
  equipment?: Equipment[];
  difficulty?: Difficulty;
  muscleGroup?: string;
  isSystemExercise?: boolean;
  isPublic?: boolean;
  createdBy?: string;
  limit: number;
  offset: number;
}

export interface ExerciseListResult {
  exercises: Exercise[];
  total: number;
  hasMore: boolean;
}

export interface IExerciseRepository {
  // CRUD
  save(exercise: Exercise): Promise<void>;
  findById(id: string): Promise<Exercise | null>;
  findBySlug(slug: string): Promise<Exercise | null>;
  findByIds(ids: string[]): Promise<Exercise[]>;
  update(exercise: Exercise): Promise<void>;
  delete(id: string): Promise<void>;

  // Search and list
  search(options: ExerciseSearchOptions): Promise<ExerciseListResult>;
  findSystemExercises(limit: number, offset: number): Promise<ExerciseListResult>;
  findByCreator(userId: string, limit: number, offset: number): Promise<ExerciseListResult>;

  // Counts
  countByCreator(userId: string): Promise<number>;

  // Check existence (for validation)
  exists(id: string): Promise<boolean>;
  existsAll(ids: string[]): Promise<boolean>;
}
