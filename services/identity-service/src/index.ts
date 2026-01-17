// src/index.ts

import { Hono } from 'hono';
import { logger } from 'hono/logger';
import { cors } from 'hono/cors';
import { getConfig } from './config/index.js';
import { bootstrap, ExtendedServiceKeys } from './infrastructure/container/bootstrap.js';
import { ServiceKeys } from './infrastructure/container/Container.js';
import { createAuthRoutes } from './interfaces/http/routes/auth.routes.js';
import { createSessionRoutes } from './interfaces/http/routes/session.routes.js';
import { createTwoFactorRoutes } from './interfaces/http/routes/twoFactor.routes.js';
import { createLoginHistoryRoutes } from './interfaces/http/routes/loginHistory.routes.js';
import { errorHandler } from './interfaces/http/middleware/errorHandler.js';
import { closePool } from './infrastructure/database/postgres.js';
import { RateLimitPresets } from './infrastructure/services/RateLimiterService.js';
import type { AuthController } from './interfaces/http/controllers/AuthController.js';
import type { SessionController } from './interfaces/http/controllers/SessionController.js';
import type { TwoFactorController } from './interfaces/http/controllers/TwoFactorController.js';
import type { LoginHistoryController } from './interfaces/http/controllers/LoginHistoryController.js';
import type { RateLimiterService } from './infrastructure/services/RateLimiterService.js';

// Load configuration
const config = getConfig();

// Bootstrap DI container
const container = bootstrap();

// Resolve controllers
const authController = container.resolve<AuthController>(ServiceKeys.AuthController);
const sessionController = container.resolve<SessionController>(ExtendedServiceKeys.SessionController);
const twoFactorController = container.resolve<TwoFactorController>(ExtendedServiceKeys.TwoFactorController);
const loginHistoryController = container.resolve<LoginHistoryController>(ExtendedServiceKeys.LoginHistoryController);
const rateLimiter = container.resolve<RateLimiterService>(ExtendedServiceKeys.RateLimiterService);

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

// Auth routes with rate limiting
const authRouter = new Hono();
authRouter.post('/login', rateLimiter.createMiddleware(RateLimitPresets.login));
authRouter.post('/register', rateLimiter.createMiddleware(RateLimitPresets.register));
authRouter.post('/forgot-password', rateLimiter.createMiddleware(RateLimitPresets.forgotPassword));
authRouter.post('/send-verification', rateLimiter.createMiddleware(RateLimitPresets.verification));
authRouter.route('/', createAuthRoutes(authController));
app.route('/auth', authRouter);

// Session routes
const sessionRouter = new Hono();
sessionRouter.use('*', rateLimiter.createMiddleware(RateLimitPresets.api));
sessionRouter.route('/', createSessionRoutes(sessionController));
app.route('/auth/sessions', sessionRouter);

// 2FA routes
const twoFactorRouter = new Hono();
twoFactorRouter.use('*', rateLimiter.createMiddleware(RateLimitPresets.verification));
twoFactorRouter.route('/', createTwoFactorRoutes(twoFactorController));
app.route('/auth/2fa', twoFactorRouter);

// Login history routes
const historyRouter = new Hono();
historyRouter.use('*', rateLimiter.createMiddleware(RateLimitPresets.api));
historyRouter.route('/', createLoginHistoryRoutes(loginHistoryController));
app.route('/auth/login-history', historyRouter);

// 404 handler
app.notFound((c) => c.json({ error: 'NOT_FOUND', message: `Route ${c.req.method} ${c.req.path} not found` }, 404));

// Start server
const server = Bun.serve({
  port: config.port,
  fetch: app.fetch,
});

console.log(`
🔐 Identity Service v2.0
   Port: ${config.port}
   Environment: ${config.nodeEnv}
   
   Auth:           /auth/*
   Sessions:       /auth/sessions/*
   2FA:            /auth/2fa/*
   Login History:  /auth/login-history/*
`);

// Graceful shutdown
process.on('SIGTERM', async () => { server.stop(); await closePool(); process.exit(0); });
process.on('SIGINT', async () => { server.stop(); await closePool(); process.exit(0); });

// Named export for testing purposes (do not use default export to prevent Bun auto-serve)
export { app };
