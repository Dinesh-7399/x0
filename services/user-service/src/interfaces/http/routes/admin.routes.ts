// src/interfaces/http/routes/admin.routes.ts

import { Hono } from 'hono';
import { authMiddleware } from '../middleware/authMiddleware.js';
import { adminMiddleware } from '../middleware/adminMiddleware.js';
import type { AdminController } from '../controllers/AdminController.js';

export function createAdminRoutes(controller: AdminController): Hono {
  const router = new Hono();

  // Apply auth and admin middleware to all routes
  router.use('*', authMiddleware, adminMiddleware);

  router.get('/', (c) => controller.listUsers(c));
  router.get('/:id', (c) => controller.getUser(c));
  router.post('/:id/ban', (c) => controller.banUser(c));
  router.post('/:id/unban', (c) => controller.unbanUser(c));

  return router;
}
