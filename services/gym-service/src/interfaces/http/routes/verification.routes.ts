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

import { verify } from 'hono/jwt';

// Middleware to authenticate partners
const authenticatePartner = async (c: any, next: any) => {
  const authHeader = c.req.header('Authorization');
  if (!authHeader) {
    return c.json({ error: 'Missing Authorization header' }, 401);
  }

  const token = authHeader.split(' ')[1];
  if (!token) {
    return c.json({ error: 'Invalid Authorization header format' }, 401);
  }

  try {
    const secret = process.env.JWT_SECRET || 'dev-jwt-secret-change-in-production';
    const payload = await verify(token, secret, 'HS256');

    // Verify role
    if (payload.role !== 'partner' && payload.role !== 'admin') {
      return c.json({ error: 'Insufficient permissions: Partner role required' }, 403);
    }

    // Verify user ID matches token sub (if x-user-id header exists)
    const headerUserId = c.req.header('x-user-id');
    if (headerUserId && headerUserId !== payload.sub) {
      return c.json({ error: 'User ID mismatch' }, 403);
    }

    await next();
  } catch (err) {
    return c.json({ error: 'Invalid or expired token' }, 401);
  }
};

export function createPartnerVerificationRoutes(controller: VerificationController): Hono {
  const router = new Hono();

  // Apply authentication middleware
  router.use('/*', authenticatePartner);

  // ============ PARTNER ROUTES ============

  // GET /verification/queue - Get pending gyms
  router.get('/queue', (c) => controller.getQueue(c));

  // POST /verification/:gymId/assign - Claim gym for review
  router.post('/:gymId/assign', (c) => controller.assignToSelf(c));

  // POST /verification/:gymId/review - Submit review with checklist & photos
  router.post('/:gymId/review', (c) => controller.submitReview(c));

  return router;
}
