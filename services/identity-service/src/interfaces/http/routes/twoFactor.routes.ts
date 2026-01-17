// src/interfaces/http/routes/twoFactor.routes.ts

import { Hono } from 'hono';
import type { TwoFactorController } from '../controllers/TwoFactorController.js';

/**
 * Create 2FA Routes
 */
export function createTwoFactorRoutes(controller: TwoFactorController): Hono {
  const router = new Hono();

  router.post('/setup', (c) => controller.setup(c));
  router.post('/enable', (c) => controller.enable(c));
  router.post('/disable', (c) => controller.disable(c));
  router.post('/verify', (c) => controller.verify(c));
  router.get('/status', (c) => controller.status(c));
  router.post('/backup-codes/regenerate', (c) => controller.regenerateBackupCodes(c));

  return router;
}
