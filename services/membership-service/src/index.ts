import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { getConfig } from './config/index.js';
import { PostgresMembershipRepository } from './infrastructure/database/PostgresMembershipRepository.js';
import { MembershipService } from './application/services/MembershipService.js';
import { PaymentServiceClient } from './infrastructure/clients/PaymentServiceClient.js';
import { MembershipController } from './interfaces/http/controllers/MembershipController.js';
import { createMembershipRoutes } from './interfaces/http/routes/membership.routes.js';
import { PaymentEventListener } from './infrastructure/messaging/PaymentEventListener.js';

const app = new Hono();
const config = getConfig();

app.use('*', cors());

app.get('/health', (c) => c.json({ status: 'OK', service: 'membership-service' }));

// Dependencies
const repo = new PostgresMembershipRepository();
const paymentClient = new PaymentServiceClient();
const service = new MembershipService(repo);
const controller = new MembershipController(service, paymentClient);

// Event Listener
const eventListener = new PaymentEventListener(service); // Starts automatically

// Routes
const routes = createMembershipRoutes(controller);
app.route('/memberships', routes);

console.log(`🚀 Membership Service running on port ${config.port}`);

export default {
  port: config.port,
  fetch: app.fetch,
};
