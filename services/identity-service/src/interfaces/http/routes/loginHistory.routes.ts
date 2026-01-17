// src/interfaces/http/routes/loginHistory.routes.ts

import { Hono } from 'hono';
import type { LoginHistoryController } from '../controllers/LoginHistoryController.js';

/**
 * Create Login History Routes
 */
export function createLoginHistoryRoutes(controller: LoginHistoryController): Hono {
  const router = new Hono();

  router.get('/', (c) => controller.getHistory(c));
  router.get('/status', (c) => controller.getLockStatus(c));

  return router;
}
