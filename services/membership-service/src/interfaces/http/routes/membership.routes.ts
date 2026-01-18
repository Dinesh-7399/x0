import { Hono } from 'hono';
import { MembershipController } from '../controllers/MembershipController.js';
import { authMiddleware } from '../middleware/authMiddleware.js';

export const createMembershipRoutes = (controller: MembershipController) => {
  const router = new Hono();

  router.use('*', authMiddleware);

  router.get('/plans', (c) => controller.getPlans(c));
  router.post('/subscribe', (c) => controller.subscribe(c));
  router.get('/my-subscription', (c) => controller.getMySubscription(c));

  return router;
};
