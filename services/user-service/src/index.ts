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
import type { AdminController } from './interfaces/http/controllers/AdminController.js';
import type { UserProfileService } from './application/services/UserProfileService.js';

// Load configuration
const config = getConfig();

// Bootstrap DI container
const container = bootstrap();

// Resolve controllers
const profileController = container.resolve<ProfileController>(ServiceKeys.ProfileController);
const adminController = container.resolve<AdminController>(ServiceKeys.AdminController);

// Subscribe to events
import { EventTypes } from '@gymato/messaging';
import type { Publisher, Subscriber } from '@gymato/messaging';

const messageBus = container.resolve<Publisher & Subscriber>(ServiceKeys.MessageBus);
const userProfileService = container.resolve<UserProfileService>(ServiceKeys.UserProfileService);

// Subscribe to user registration (non-blocking)
messageBus.subscribe(EventTypes.USER_REGISTERED, async (message: any) => {
  const { userId, email } = message.payload;
  console.log(`[Event] Received USER_REGISTERED for ${email}`);

  try {
    await userProfileService.createProfile(userId, {
      firstName: 'New',
      lastName: 'User',
    });
    console.log(`[Event] Created profile for ${userId}`);
  } catch (error) {
    console.error(`[Event] Failed to create profile for ${userId}:`, error);
  }
}).then(() => {
  console.log('[Messaging] Subscribed to USER_REGISTERED events');
}).catch((err) => {
  console.error('[Messaging] Failed to subscribe to events:', err);
});

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

// Admin routes
import { createAdminRoutes } from './interfaces/http/routes/admin.routes.js';
const adminRouter = new Hono();
adminRouter.route('/', createAdminRoutes(adminController));
app.route('/users/admin', adminRouter);

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
   Admin:          /users/admin/*
`);

// Graceful shutdown
process.on('SIGTERM', async () => { server.stop(); await closePool(); process.exit(0); });
process.on('SIGINT', async () => { server.stop(); await closePool(); process.exit(0); });

// Named export for testing purposes (do not use default export to prevent Bun auto-serve)
export { app };
