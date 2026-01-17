// src/interfaces/http/routes/session.routes.ts

import { Hono } from 'hono';
import type { SessionController } from '../controllers/SessionController.js';

/**
 * Create Session Routes
 * 
 * Routes only define mappings - no business logic.
 */
export function createSessionRoutes(controller: SessionController): Hono {
  const router = new Hono();

  // All routes require authentication
  router.get('/', (c) => controller.listSessions(c));
  router.get('/count', (c) => controller.getSessionCount(c));
  router.delete('/:id', (c) => controller.revokeSession(c));
  router.post('/revoke-others', (c) => controller.revokeOtherSessions(c));

  return router;
}
