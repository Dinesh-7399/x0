import { Hono } from 'hono';
import { serve } from '@hono/node-server';
import { cors } from 'hono/cors';
import { getConfig } from './config/index.js';
import { createPaymentRoutes, createWebhookRoutes } from './interfaces/http/routes/payment.routes.js';
import { PaymentController } from './interfaces/http/controllers/PaymentController.js';
import { WebhookController } from './interfaces/http/controllers/WebhookController.js';
import { PaymentService } from './application/services/PaymentService.js';
import { PostgresPaymentRepository } from './infrastructure/database/PostgresPaymentRepository.js';
import { RazorpayGateway } from './infrastructure/gateways/RazorpayGateway.js';
import { MockRazorpayGateway } from './infrastructure/gateways/MockRazorpayGateway.js';

const app = new Hono();
const config = getConfig();

app.use('*', cors());

// Health Check
app.get('/health', (c) => c.json({ status: 'OK', service: 'payment-service' }));

// Dependency Injection (Manual)
const repo = new PostgresPaymentRepository();
const gateway = config.useMockGateway ? new MockRazorpayGateway() : new RazorpayGateway();
const service = new PaymentService(repo, gateway);

const controller = new PaymentController(service);
const webhookController = new WebhookController(service);

// Routes
const paymentRoutes = createPaymentRoutes(controller);
const webhookRoutes = createWebhookRoutes(webhookController);

app.route('/payments', paymentRoutes);
app.route('/webhooks', webhookRoutes);

console.log(`🚀 Payment Service running on port ${config.port} (Mock: ${config.useMockGateway})`);

serve({
  fetch: app.fetch,
  port: config.port,
});
