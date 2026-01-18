import { Hono } from 'hono';
import { FeedController } from '../controllers/FeedController.js';

// Reuse auth middleware from social service (copy) or use shared?
// I'll assume I need to copy or create 'authMiddleware.ts' in feed-service too.
import { authMiddleware } from '../middleware/authMiddleware.js';

export const createFeedRoutes = (controller: FeedController) => {
  const router = new Hono();

  router.use('*', authMiddleware);
  router.get('/', (c) => controller.getFeed(c));

  return router;
};
