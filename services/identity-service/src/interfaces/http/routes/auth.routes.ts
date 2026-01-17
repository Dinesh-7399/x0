// src/interfaces/http/routes/auth.routes.ts

import { Hono } from 'hono';
import type { AuthController } from '../controllers/AuthController.js';

/**
 * Create Auth Routes
 * 
 * Routes only define mappings - no business logic.
 * Single Responsibility: Route definitions only.
 */
export function createAuthRoutes(controller: AuthController): Hono {
  const router = new Hono();

  // Public routes (no auth required)
  router.post('/register', (c) => controller.register(c));
  router.post('/login', (c) => controller.login(c));
  router.post('/refresh', (c) => controller.refresh(c));
  router.post('/logout', (c) => controller.logout(c));
  router.post('/forgot-password', (c) => controller.forgotPassword(c));
  router.post('/reset-password', (c) => controller.resetPassword(c));

  // Protected routes (auth required)
  router.get('/me', (c) => controller.me(c));
  router.post('/send-verification', (c) => controller.sendVerification(c));
  router.post('/verify-email', (c) => controller.verifyEmail(c));

  return router;
}
