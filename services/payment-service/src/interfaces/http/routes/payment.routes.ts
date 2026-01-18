import { Hono } from 'hono';
import { PaymentController } from '../controllers/PaymentController.js';
import { authMiddleware } from '../middleware/authMiddleware.js';

export const createPaymentRoutes = (controller: PaymentController) => {
  const router = new Hono();

  router.use('*', authMiddleware);

  router.post('/orders', (c) => controller.createOrder(c));
  router.post('/verify', (c) => controller.verifyPayment(c));

  return router;
};

import { WebhookController } from '../controllers/WebhookController.js';

export const createWebhookRoutes = (controller: WebhookController) => {
  const router = new Hono();
  // No Auth Middleware for Webhooks (Public, Signature Verified)
  router.post('/razorpay', (c) => controller.handleRazorpayWebhook(c));
  return router;
};
