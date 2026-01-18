import { Hono } from 'hono';
import { SocialController } from '../controllers/SocialController.js';
import { authMiddleware } from '../middleware/authMiddleware.js';

export const createSocialRoutes = (controller: SocialController) => {
  const router = new Hono();

  // Unified generic routes
  router.use('*', authMiddleware);

  // Graph
  router.post('/follows/users/:targetId', (c) => controller.follow(c));
  router.delete('/follows/users/:targetId', (c) => controller.unfollow(c));
  router.get('/users/:userId/followers', (c) => controller.getFollowers(c));

  // Engagement
  router.post('/reactions/:targetType/:targetId', (c) => controller.react(c));

  return router;
};
