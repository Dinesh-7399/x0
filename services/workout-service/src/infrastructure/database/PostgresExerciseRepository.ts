// src/infrastructure/database/PostgresExerciseRepository.ts

import {
  type Difficulty,
  type Equipment,
  Exercise,
  type ExerciseCategory,
  type ExerciseProps,
  type ExerciseType,
  type MuscleGroup,
} from '../../domain/entities/Exercise.js';
import type {
  ExerciseListResult,
  ExerciseSearchOptions,
  IExerciseRepository,
} from '../../domain/repositories/IExerciseRepository.js';
import { execute, query, queryOne } from './postgres.js';

interface ExerciseRow {
  id: string;
  name: string;
  slug: string;
  description: string;
  instructions: string[];
  category: string;
  primary_muscles: string[];
  secondary_muscles: string[];
  equipment: string[];
  difficulty: string;
  exercise_type: string;
  media_urls: string[];
  is_system_exercise: boolean;
  is_custom: boolean;
  created_by: string | null;
  is_approved: boolean;
  is_public: boolean;
  usage_count: number;
  deleted_at: Date | null;
  created_at: Date;
  updated_at: Date;
}

export class PostgresExerciseRepository implements IExerciseRepository {
  async save(exercise: Exercise): Promise<void> {
    const sql = `
      INSERT INTO exercises (
        id, name, slug, description, instructions, category,
        primary_muscles, secondary_muscles, equipment, difficulty,
        exercise_type, media_urls, is_system_exercise, is_custom,
        created_by, is_approved, is_public, usage_count,
        deleted_at, created_at, updated_at
      ) VALUES (
        $1, $2, $3, $4, $5, $6, $7, $8, $9, $10,
        $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21
      )
    `;

    await execute(sql, [
      exercise.id,
      exercise.name,
      exercise.slug,
      exercise.description,
      exercise.instructions,
      exercise.category,
      exercise.primaryMuscles,
      exercise.secondaryMuscles,
      exercise.equipment,
      exercise.difficulty,
      exercise.exerciseType,
      exercise.mediaUrls,
      exercise.isSystemExercise,
      exercise.isCustom,
      exercise.createdBy,
      exercise.isApproved,
      exercise.isPublic,
      exercise.usageCount,
      exercise.deletedAt,
      exercise.createdAt,
      exercise.updatedAt,
    ]);
  }

  async findById(id: string): Promise<Exercise | null> {
    const sql = 'SELECT * FROM exercises WHERE id = $1';
    const row = await queryOne<ExerciseRow>(sql, [id]);
    return row ? this.toDomain(row) : null;
  }

  async findBySlug(slug: string): Promise<Exercise | null> {
    const sql = 'SELECT * FROM exercises WHERE slug = $1 AND deleted_at IS NULL';
    const row = await queryOne<ExerciseRow>(sql, [slug]);
    return row ? this.toDomain(row) : null;
  }

  async findByIds(ids: string[]): Promise<Exercise[]> {
    if (ids.length === 0) return [];

    const placeholders = ids.map((_, i) => `$${i + 1}`).join(', ');
    const sql = `SELECT * FROM exercises WHERE id IN (${placeholders}) AND deleted_at IS NULL`;
    const rows = await query<ExerciseRow>(sql, ids);
    return rows.map((row) => this.toDomain(row));
  }

  async update(exercise: Exercise): Promise<void> {
    const sql = `
      UPDATE exercises SET
        name = $2, slug = $3, description = $4, instructions = $5,
        category = $6, primary_muscles = $7, secondary_muscles = $8,
        equipment = $9, difficulty = $10, exercise_type = $11,
        media_urls = $12, is_approved = $13, is_public = $14,
        usage_count = $15, deleted_at = $16, updated_at = $17
      WHERE id = $1
    `;

    await execute(sql, [
      exercise.id,
      exercise.name,
      exercise.slug,
      exercise.description,
      exercise.instructions,
      exercise.category,
      exercise.primaryMuscles,
      exercise.secondaryMuscles,
      exercise.equipment,
      exercise.difficulty,
      exercise.exerciseType,
      exercise.mediaUrls,
      exercise.isApproved,
      exercise.isPublic,
      exercise.usageCount,
      exercise.deletedAt,
      exercise.updatedAt,
    ]);
  }

  async delete(id: string): Promise<void> {
    await execute('UPDATE exercises SET deleted_at = NOW() WHERE id = $1', [id]);
  }

  async search(options: ExerciseSearchOptions): Promise<ExerciseListResult> {
    const conditions: string[] = ['deleted_at IS NULL'];
    const params: unknown[] = [];
    let paramIndex = 1;

    // Build WHERE conditions
    if (options.query) {
      conditions.push(`(name ILIKE $${paramIndex} OR description ILIKE $${paramIndex})`);
      params.push(`%${options.query}%`);
      paramIndex++;
    }

    if (options.category) {
      conditions.push(`category = $${paramIndex}`);
      params.push(options.category);
      paramIndex++;
    }

    if (options.equipment && options.equipment.length > 0) {
      conditions.push(`equipment && $${paramIndex}`);
      params.push(options.equipment);
      paramIndex++;
    }

    if (options.difficulty) {
      conditions.push(`difficulty = $${paramIndex}`);
      params.push(options.difficulty);
      paramIndex++;
    }

    if (options.muscleGroup) {
      conditions.push(
        `(primary_muscles @> ARRAY[$${paramIndex}]::text[] OR secondary_muscles @> ARRAY[$${paramIndex}]::text[])`,
      );
      params.push(options.muscleGroup);
      paramIndex++;
    }

    if (options.isSystemExercise !== undefined) {
      conditions.push(`is_system_exercise = $${paramIndex}`);
      params.push(options.isSystemExercise);
      paramIndex++;
    }

    // Show public exercises OR user's own exercises
    if (options.createdBy) {
      conditions.push(`(is_public = true OR created_by = $${paramIndex})`);
      params.push(options.createdBy);
      paramIndex++;
    } else if (options.isPublic) {
      conditions.push('is_public = true');
    }

    const whereClause = conditions.join(' AND ');

    // Count query
    const countSql = `SELECT COUNT(*) as total FROM exercises WHERE ${whereClause}`;
    const countResult = await queryOne<{ total: string }>(countSql, params);
    const total = Number.parseInt(countResult?.total || '0', 10);

    // Data query
    const dataSql = `
      SELECT * FROM exercises
      WHERE ${whereClause}
      ORDER BY is_system_exercise DESC, usage_count DESC, name ASC
      LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
    `;
    params.push(options.limit, options.offset);

    const rows = await query<ExerciseRow>(dataSql, params);

    return {
      exercises: rows.map((row) => this.toDomain(row)),
      total,
      hasMore: options.offset + rows.length < total,
    };
  }

  async findSystemExercises(limit: number, offset: number): Promise<ExerciseListResult> {
    const countSql =
      'SELECT COUNT(*) as total FROM exercises WHERE is_system_exercise = true AND deleted_at IS NULL';
    const countResult = await queryOne<{ total: string }>(countSql, []);
    const total = Number.parseInt(countResult?.total || '0', 10);

    const dataSql = `
      SELECT * FROM exercises
      WHERE is_system_exercise = true AND deleted_at IS NULL
      ORDER BY category, name
      LIMIT $1 OFFSET $2
    `;
    const rows = await query<ExerciseRow>(dataSql, [limit, offset]);

    return {
      exercises: rows.map((row) => this.toDomain(row)),
      total,
      hasMore: offset + rows.length < total,
    };
  }

  async findByCreator(userId: string, limit: number, offset: number): Promise<ExerciseListResult> {
    const countSql =
      'SELECT COUNT(*) as total FROM exercises WHERE created_by = $1 AND deleted_at IS NULL';
    const countResult = await queryOne<{ total: string }>(countSql, [userId]);
    const total = Number.parseInt(countResult?.total || '0', 10);

    const dataSql = `
      SELECT * FROM exercises
      WHERE created_by = $1 AND deleted_at IS NULL
      ORDER BY created_at DESC
      LIMIT $2 OFFSET $3
    `;
    const rows = await query<ExerciseRow>(dataSql, [userId, limit, offset]);

    return {
      exercises: rows.map((row) => this.toDomain(row)),
      total,
      hasMore: offset + rows.length < total,
    };
  }

  async countByCreator(userId: string): Promise<number> {
    const sql =
      'SELECT COUNT(*) as total FROM exercises WHERE created_by = $1 AND deleted_at IS NULL';
    const result = await queryOne<{ total: string }>(sql, [userId]);
    return Number.parseInt(result?.total || '0', 10);
  }

  async exists(id: string): Promise<boolean> {
    const sql = 'SELECT 1 FROM exercises WHERE id = $1 AND deleted_at IS NULL';
    const result = await queryOne(sql, [id]);
    return result !== null;
  }

  async existsAll(ids: string[]): Promise<boolean> {
    if (ids.length === 0) return true;

    const placeholders = ids.map((_, i) => `$${i + 1}`).join(', ');
    const sql = `SELECT COUNT(*) as total FROM exercises WHERE id IN (${placeholders}) AND deleted_at IS NULL`;
    const result = await queryOne<{ total: string }>(sql, ids);
    return Number.parseInt(result?.total || '0', 10) === ids.length;
  }

  private toDomain(row: ExerciseRow): Exercise {
    const props: ExerciseProps = {
      id: row.id,
      name: row.name,
      slug: row.slug,
      description: row.description,
      instructions: row.instructions || [],
      category: row.category as ExerciseCategory,
      primaryMuscles: (row.primary_muscles || []) as MuscleGroup[],
      secondaryMuscles: (row.secondary_muscles || []) as MuscleGroup[],
      equipment: (row.equipment || []) as Equipment[],
      difficulty: row.difficulty as Difficulty,
      exerciseType: row.exercise_type as ExerciseType,
      mediaUrls: row.media_urls || [],
      isSystemExercise: row.is_system_exercise,
      isCustom: row.is_custom,
      createdBy: row.created_by,
      isApproved: row.is_approved,
      isPublic: row.is_public,
      usageCount: row.usage_count,
      deletedAt: row.deleted_at,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
    return Exercise.fromPersistence(props);
  }
}
