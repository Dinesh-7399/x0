// src/interfaces/http/controllers/WorkoutController.ts

import type { Context } from 'hono';
import type { WorkoutLogService } from '../../../application/services/WorkoutLogService.js';
import type { WorkoutStatus } from '../../../domain/entities/WorkoutLog.js';
import {
  AddExerciseSchema,
  CompleteWorkoutSchema,
  ListWorkoutsQuerySchema,
  LogSetSchema,
  SkipExerciseSchema,
  StartWorkoutSchema,
} from '../validation/schemas.js';

export class WorkoutController {
  constructor(private readonly workoutLogService: WorkoutLogService) {}

  /**
   * POST /workouts
   * Start a new workout session
   */
  async start(c: Context) {
    const userId = c.get('userId') as string;
    const body = StartWorkoutSchema.parse(await c.req.json());

    const workout = await this.workoutLogService.startWorkout(userId, body);
    return c.json({ workout }, 201);
  }

  /**
   * GET /workouts/active
   * Get current active workout
   */
  async getActive(c: Context) {
    const userId = c.get('userId') as string;

    const workout = await this.workoutLogService.getActiveWorkout(userId);
    if (!workout) {
      return c.json({ workout: null, message: 'No active workout' });
    }
    return c.json({ workout });
  }

  /**
   * GET /workouts/:id
   * Get workout by ID
   */
  async get(c: Context) {
    const userId = c.get('userId') as string;
    const workoutId = c.req.param('id');

    const workout = await this.workoutLogService.getWorkout(userId, workoutId);
    return c.json({ workout });
  }

  /**
   * GET /workouts
   * List user's workouts
   */
  async list(c: Context) {
    const userId = c.get('userId') as string;

    const query = ListWorkoutsQuerySchema.parse({
      status: c.req.query('status'),
      startDate: c.req.query('startDate'),
      endDate: c.req.query('endDate'),
      limit: c.req.query('limit'),
      offset: c.req.query('offset'),
    });

    const result = await this.workoutLogService.listWorkouts(userId, {
      status: query.status as WorkoutStatus | undefined,
      startDate: query.startDate ? new Date(query.startDate) : undefined,
      endDate: query.endDate ? new Date(query.endDate) : undefined,
      limit: query.limit,
      offset: query.offset,
    });

    return c.json(result);
  }

  /**
   * POST /workouts/:id/exercises
   * Add exercise to active workout
   */
  async addExercise(c: Context) {
    const userId = c.get('userId') as string;
    const workoutId = c.req.param('id');
    const body = AddExerciseSchema.parse(await c.req.json());

    const result = await this.workoutLogService.addExercise(userId, workoutId, body.exerciseId);
    return c.json(result, 201);
  }

  /**
   * POST /workouts/:id/exercises/:exerciseLogId/sets
   * Log a set for an exercise
   */
  async logSet(c: Context) {
    const userId = c.get('userId') as string;
    const workoutId = c.req.param('id');
    const exerciseLogId = c.req.param('exerciseLogId');
    const body = LogSetSchema.parse(await c.req.json());

    const result = await this.workoutLogService.logSet(userId, workoutId, exerciseLogId, body);
    return c.json(result, 201);
  }

  /**
   * POST /workouts/:id/exercises/:exerciseLogId/skip
   * Skip an exercise
   */
  async skipExercise(c: Context) {
    const userId = c.get('userId') as string;
    const workoutId = c.req.param('id');
    const exerciseLogId = c.req.param('exerciseLogId');

    let reason: string | undefined;
    try {
      const body = SkipExerciseSchema.parse(await c.req.json());
      reason = body.reason;
    } catch {
      // Body is optional
    }

    await this.workoutLogService.skipExercise(userId, workoutId, exerciseLogId, reason);
    return c.json({ message: 'Exercise skipped' });
  }

  /**
   * POST /workouts/:id/complete
   * Complete the workout
   */
  async complete(c: Context) {
    const userId = c.get('userId') as string;
    const workoutId = c.req.param('id');

    let notes: string | undefined;
    try {
      const body = CompleteWorkoutSchema.parse(await c.req.json());
      notes = body.notes;
    } catch {
      // Body is optional
    }

    const workout = await this.workoutLogService.completeWorkout(userId, workoutId, notes);
    return c.json({ workout, message: 'Workout completed!' });
  }

  /**
   * POST /workouts/:id/abandon
   * Abandon the workout
   */
  async abandon(c: Context) {
    const userId = c.get('userId') as string;
    const workoutId = c.req.param('id');

    let reason: string | undefined;
    try {
      const body = await c.req.json();
      reason = body?.reason;
    } catch {
      // Body is optional
    }

    await this.workoutLogService.abandonWorkout(userId, workoutId, reason);
    return c.json({ message: 'Workout abandoned' });
  }

  /**
   * DELETE /workouts/:id
   * Delete a workout log
   */
  async delete(c: Context) {
    const userId = c.get('userId') as string;
    const workoutId = c.req.param('id');

    await this.workoutLogService.deleteWorkout(userId, workoutId);
    return c.json({ message: 'Workout deleted' });
  }
}
