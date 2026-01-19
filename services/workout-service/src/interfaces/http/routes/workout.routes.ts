// src/interfaces/http/routes/workout.routes.ts

import { Hono } from 'hono';
import type { WorkoutController } from '../controllers/WorkoutController.js';

export function createWorkoutRoutes(controller: WorkoutController): Hono {
  const router = new Hono();

  // Active workout
  router.get('/active', (c) => controller.getActive(c));

  // Start new workout
  router.post('/', (c) => controller.start(c));

  // List workouts
  router.get('/', (c) => controller.list(c));

  // Get specific workout
  router.get('/:id', (c) => controller.get(c));

  // Add exercise to workout
  router.post('/:id/exercises', (c) => controller.addExercise(c));

  // Log set for exercise
  router.post('/:id/exercises/:exerciseLogId/sets', (c) => controller.logSet(c));

  // Skip exercise
  router.post('/:id/exercises/:exerciseLogId/skip', (c) => controller.skipExercise(c));

  // Complete workout
  router.post('/:id/complete', (c) => controller.complete(c));

  // Abandon workout
  router.post('/:id/abandon', (c) => controller.abandon(c));

  // Delete workout
  router.delete('/:id', (c) => controller.delete(c));

  return router;
}
