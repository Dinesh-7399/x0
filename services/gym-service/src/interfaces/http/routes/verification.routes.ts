// src/interfaces/http/routes/verification.routes.ts

import { Hono } from 'hono';
import type { VerificationController } from '../controllers/VerificationController.js';

export function createVerificationRoutes(controller: VerificationController): Hono {
  const router = new Hono();

  // ============ OWNER ROUTES ============

  // POST /gyms/:gymId/submit - Submit for verification
  router.post('/:gymId/submit', (c) => controller.submitForVerification(c));

  // POST /gyms/:gymId/corrections - Apply corrections and resubmit
  router.post('/:gymId/corrections', (c) => controller.applyCorrections(c));

  return router;
}

export function createPartnerVerificationRoutes(controller: VerificationController): Hono {
  const router = new Hono();

  // ============ PARTNER ROUTES ============

  // GET /verification/queue - Get pending gyms
  router.get('/queue', (c) => controller.getQueue(c));

  // POST /verification/:gymId/assign - Claim gym for review
  router.post('/:gymId/assign', (c) => controller.assignToSelf(c));

  // POST /verification/:gymId/review - Submit review with checklist & photos
  router.post('/:gymId/review', (c) => controller.submitReview(c));

  return router;
}
