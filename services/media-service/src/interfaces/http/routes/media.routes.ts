// src/interfaces/http/routes/media.routes.ts

import { Hono } from 'hono';
import type { MediaController } from '../controllers/MediaController.js';

export function createMediaRoutes(controller: MediaController): Hono {
  const router = new Hono();

  // Upload endpoints
  router.post('/upload', (c) => controller.upload(c));
  router.post('/upload/multiple', (c) => controller.uploadMultiple(c));

  // Presigned URL
  router.post('/presigned-url', (c) => controller.generatePresignedUrl(c));

  // Stats
  router.get('/stats', (c) => controller.getStats(c));

  // Entity media
  router.get('/entity/:entityType/:entityId', (c) => controller.getEntityMedia(c));

  // CRUD
  router.get('/', (c) => controller.list(c));
  router.get('/:id', (c) => controller.get(c));
  router.patch('/:id', (c) => controller.update(c));
  router.delete('/:id', (c) => controller.delete(c));

  return router;
}
