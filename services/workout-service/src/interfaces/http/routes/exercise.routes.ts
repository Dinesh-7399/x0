// src/interfaces/http/routes/exercise.routes.ts

import { Hono } from 'hono';
import type { ExerciseController } from '../controllers/ExerciseController.js';

export function createExerciseRoutes(controller: ExerciseController): Hono {
  const router = new Hono();

  // Metadata endpoints (for UI filters)
  router.get('/categories', (c) => controller.getCategories(c));
  router.get('/equipment', (c) => controller.getEquipment(c));
  router.get('/muscle-groups', (c) => controller.getMuscleGroups(c));

  // User's custom exercises
  router.get('/my', (c) => controller.listMy(c));

  // Search/list
  router.get('/', (c) => controller.list(c));

  // CRUD
  router.get('/:id', (c) => controller.get(c));
  router.post('/', (c) => controller.create(c));
  router.put('/:id', (c) => controller.update(c));
  router.delete('/:id', (c) => controller.delete(c));

  return router;
}
