// src/interfaces/http/controllers/ExerciseController.ts

import type { Context } from 'hono';
import type { ExerciseService } from '../../../application/services/ExerciseService.js';
import type { Equipment, ExerciseCategory } from '../../../domain/entities/Exercise.js';
import {
  CreateExerciseSchema,
  ListExercisesQuerySchema,
  UpdateExerciseSchema,
} from '../validation/schemas.js';

export class ExerciseController {
  constructor(private readonly exerciseService: ExerciseService) {}

  /**
   * GET /exercises
   * Search/list exercises
   */
  async list(c: Context) {
    const userId = c.get('userId') as string;

    const query = ListExercisesQuerySchema.parse({
      query: c.req.query('query'),
      category: c.req.query('category'),
      equipment: c.req.query('equipment'),
      difficulty: c.req.query('difficulty'),
      muscleGroup: c.req.query('muscleGroup'),
      limit: c.req.query('limit'),
      offset: c.req.query('offset'),
    });

    // Parse equipment from comma-separated string
    const equipment = query.equipment
      ? (query.equipment.split(',').filter((e) => e) as Equipment[])
      : undefined;

    const result = await this.exerciseService.searchExercises(userId, {
      query: query.query,
      category: query.category as ExerciseCategory | undefined,
      equipment,
      difficulty: query.difficulty as any,
      muscleGroup: query.muscleGroup,
      limit: query.limit,
      offset: query.offset,
    });

    return c.json(result);
  }

  /**
   * GET /exercises/my
   * List user's custom exercises
   */
  async listMy(c: Context) {
    const userId = c.get('userId') as string;

    const limit = Number.parseInt(c.req.query('limit') || '20', 10);
    const offset = Number.parseInt(c.req.query('offset') || '0', 10);

    const result = await this.exerciseService.listMyExercises(userId, {
      limit: Math.min(limit, 100),
      offset: Math.max(offset, 0),
    });

    return c.json(result);
  }

  /**
   * GET /exercises/categories
   * Get available exercise categories
   */
  getCategories(c: Context) {
    return c.json({ categories: this.exerciseService.getCategories() });
  }

  /**
   * GET /exercises/equipment
   * Get available equipment types
   */
  getEquipment(c: Context) {
    return c.json({ equipment: this.exerciseService.getEquipment() });
  }

  /**
   * GET /exercises/muscle-groups
   * Get available muscle groups
   */
  getMuscleGroups(c: Context) {
    return c.json({ muscleGroups: this.exerciseService.getMuscleGroups() });
  }

  /**
   * GET /exercises/:id
   * Get exercise by ID
   */
  async get(c: Context) {
    const userId = c.get('userId') as string;
    const exerciseId = c.req.param('id');

    const exercise = await this.exerciseService.getExercise(userId, exerciseId);
    return c.json({ exercise });
  }

  /**
   * POST /exercises
   * Create custom exercise
   */
  async create(c: Context) {
    const userId = c.get('userId') as string;
    const body = CreateExerciseSchema.parse(await c.req.json());

    // Cast to match service DTO types
    const exercise = await this.exerciseService.createExercise(userId, body as any);
    return c.json({ exercise }, 201);
  }

  /**
   * PUT /exercises/:id
   * Update custom exercise
   */
  async update(c: Context) {
    const userId = c.get('userId') as string;
    const exerciseId = c.req.param('id');
    const body = UpdateExerciseSchema.parse(await c.req.json());

    // Cast to match service DTO types
    const exercise = await this.exerciseService.updateExercise(userId, exerciseId, body as any);
    return c.json({ exercise });
  }

  /**
   * DELETE /exercises/:id
   * Delete custom exercise
   */
  async delete(c: Context) {
    const userId = c.get('userId') as string;
    const exerciseId = c.req.param('id');

    await this.exerciseService.deleteExercise(userId, exerciseId);
    return c.json({ message: 'Exercise deleted' });
  }
}
