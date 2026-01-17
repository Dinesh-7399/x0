// src/interfaces/http/routes/profile.routes.ts

import { Hono } from 'hono';
import { authMiddleware } from '../middleware/authMiddleware.js';
import type { ProfileController } from '../controllers/ProfileController.js';

export function createProfileRoutes(controller: ProfileController): Hono {
  const router = new Hono();

  // Protected routes
  router.get('/me', authMiddleware, (c) => controller.getMyProfile(c));
  router.put('/me', authMiddleware, (c) => controller.updateMyProfile(c));
  router.post('/me', authMiddleware, (c) => controller.createMyProfile(c));

  // Public routes (or arguably authenticated too? for now assuming public view exists)
  router.get('/:id', (c) => controller.getUserProfile(c));

  return router;
}
