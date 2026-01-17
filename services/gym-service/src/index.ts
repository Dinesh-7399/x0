// src/index.ts

import { Hono } from 'hono';
import { logger } from 'hono/logger';
import { cors } from 'hono/cors';
import { getConfig } from './config/index.js';
import { bootstrap } from './infrastructure/container/bootstrap.js';
import { ServiceKeys } from './infrastructure/container/Container.js';
import { createGymRoutes } from './interfaces/http/routes/gym.routes.js';
import { createVerificationRoutes, createPartnerVerificationRoutes } from './interfaces/http/routes/verification.routes.js';
import { errorHandler } from './interfaces/http/middleware/errorHandler.js';
import { closePool } from './infrastructure/database/postgres.js';
import { closeRedis } from './infrastructure/messaging/publisher.js';
import type { GymController } from './interfaces/http/controllers/GymController.js';
import type { VerificationController } from './interfaces/http/controllers/VerificationController.js';

// Load configuration
const config = getConfig();

// Bootstrap DI container
const container = bootstrap();

// Resolve controllers
const gymController = container.resolve<GymController>(ServiceKeys.GymController);
const verificationController = container.resolve<VerificationController>(ServiceKeys.VerificationController);

// Create Hono app
const app = new Hono();

// Global middleware
app.use('*', logger());
app.use('*', errorHandler);
app.use('*', cors({
  origin: config.nodeEnv === 'development' ? '*' : ['https://gymato.com'],
  credentials: true,
}));

// Health checks
app.get('/health', (c) => c.json({ status: 'healthy', service: config.serviceName, uptime: process.uptime() }));
app.get('/ready', (c) => c.json({ status: 'ready' }));
app.get('/live', (c) => c.json({ status: 'alive' }));

// Gym routes
app.route('/gyms', createGymRoutes(gymController));

// Verification routes (owner actions - submit, corrections)
app.route('/gyms', createVerificationRoutes(verificationController));

// Partner verification routes (queue, assign, review)
app.route('/verification', createPartnerVerificationRoutes(verificationController));

// 404 handler
app.notFound((c) => c.json({ error: 'NOT_FOUND', message: `Route ${c.req.method} ${c.req.path} not found` }, 404));

// Start server
const server = Bun.serve({
  port: config.port,
  fetch: app.fetch,
});

console.log(`
🏋️ Gym Service v1.1 (with Verification Queue)
   Port: ${config.port}
   Environment: ${config.nodeEnv}
   
   Gyms:           /gyms/*
   Search:         /gyms/search (only approved gyms)
   Submit:         /gyms/:id/submit
   Corrections:    /gyms/:id/corrections
   
   Partner Queue:  /verification/queue
   Assign Review:  /verification/:id/assign
   Submit Review:  /verification/:id/review
`);

// Graceful shutdown
process.on('SIGTERM', async () => {
  server.stop();
  await closePool();
  await closeRedis();
  process.exit(0);
});

process.on('SIGINT', async () => {
  server.stop();
  await closePool();
  await closeRedis();
  process.exit(0);
});

// Named export for testing (do not use default export to prevent Bun auto-serve)
export { app };
