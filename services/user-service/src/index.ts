// src/index.ts

import { Hono } from 'hono';
import { logger } from 'hono/logger';
import { cors } from 'hono/cors';
import { getConfig } from './config/index.js';
import { bootstrap } from './infrastructure/container/bootstrap.js';
import { ServiceKeys } from './infrastructure/container/Container.js';
import { createProfileRoutes } from './interfaces/http/routes/profile.routes.js';
import { errorHandler } from './interfaces/http/middleware/errorHandler.js';
import { closePool } from './infrastructure/database/postgres.js';
import type { ProfileController } from './interfaces/http/controllers/ProfileController.js';

// Load configuration
const config = getConfig();

// Bootstrap DI container
const container = bootstrap();

// Resolve controllers
const profileController = container.resolve<ProfileController>(ServiceKeys.ProfileController);

// Create Hono app
const app = new Hono();

// Global middleware
app.use('*', logger());
app.use('*', errorHandler);
app.use('*', cors({
  origin: config.nodeEnv === 'development' ? '*' : ['https://gymato.com'],
}));

// Health checks
app.get('/health', (c) => c.json({ status: 'healthy', service: config.serviceName, uptime: process.uptime() }));
app.get('/ready', (c) => c.json({ status: 'ready' }));
app.get('/live', (c) => c.json({ status: 'alive' }));

// Profile routes
const profileRouter = new Hono();
profileRouter.route('/', createProfileRoutes(profileController));
app.route('/users', profileRouter);

// 404 handler
app.notFound((c) => c.json({ error: 'NOT_FOUND', message: `Route ${c.req.method} ${c.req.path} not found` }, 404));

// Start server
const server = Bun.serve({
  port: config.port,
  fetch: app.fetch,
});

console.log(`
👤 User Service v1.0
   Port: ${config.port}
   Environment: ${config.nodeEnv}
   
   Profiles:       /users/*
`);

// Graceful shutdown
process.on('SIGTERM', async () => { server.stop(); await closePool(); process.exit(0); });
process.on('SIGINT', async () => { server.stop(); await closePool(); process.exit(0); });

export default app;
