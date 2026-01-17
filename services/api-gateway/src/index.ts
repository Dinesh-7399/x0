// src/index.ts
import { Hono } from 'hono';
import { logger as honoLogger } from 'hono/logger';
import { cors } from 'hono/cors';
import { getConfig } from './config/config.js';
import { logger } from './core/logger.js';
import { getRoutes } from './config/routes.config.js';
import { RouteMatcher } from './core/RouteMatcher.js';
import { HttpProxy } from './proxy/HttpProxy.js';
import { verifyToken, extractTokenFromHeader } from './utils/jwt.utils.js';

// Define context variables for type-safe c.set() and c.get()
type AppVariables = {
  requestId: string;
  userId?: string;
  email?: string;
  roles?: string[];
  gymId?: string;
  authenticated?: boolean;
};

// Load config
const config = getConfig();

// Load routes
const routes = getRoutes();
const routeMatcher = new RouteMatcher(routes);
const httpProxy = new HttpProxy();

logger.info({ routeCount: routes.length }, 'Routes loaded');

// Create Hono app with typed variables
const app = new Hono<{ Variables: AppVariables }>();

/**
 * MIDDLEWARE STACK
 */

// 1. Request ID generation
app.use('*', async (c, next) => {
  const requestId =
    c.req.header('x-request-id') ||
    `req-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
  c.set('requestId', requestId);
  await next();
});

// 2. Request logging
app.use('*', honoLogger());

// 3. CORS
app.use(
  '*',
  cors({
    origin:
      config.nodeEnv === 'development'
        ? ['http://localhost:3000', 'http://localhost:5173']
        : ['https://gymato.com', 'https://app.gymato.com'],
    credentials: true,
    allowMethods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowHeaders: ['Content-Type', 'Authorization', 'X-Request-ID'],
    maxAge: 86400,
  }),
);

/**
 * ROUTES
 */

// Health check
app.get('/health', (c) => {
  return c.json({
    status: 'healthy',
    service: 'api-gateway',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: config.nodeEnv,
    routes: routes.length,
  });
});

// Readiness check
app.get('/ready', (c) => {
  return c.json({
    status: 'ready',
    checks: {
      routes: routes.length > 0 ? 'loaded' : 'missing',
    },
  });
});

// Liveness check
app.get('/live', (c) => {
  return c.json({ status: 'alive' });
});

// Metrics endpoint
app.get('/metrics', (c) => {
  return c.text('# API Gateway Metrics\n# TODO: Implement Prometheus metrics');
});

// Debug: List all routes (only in development)
if (config.nodeEnv === 'development') {
  app.get('/routes', (c) => {
    return c.json({
      routes: routes.map((route) => ({
        path: route.path,
        method: route.method,
        target: route.target,
        auth: route.auth,
      })),
    });
  });
}

/**
 * API ROUTING WITH AUTHENTICATION
 */
app.all('/api/*', async (c) => {
  const method = c.req.method as any;
  const path = c.req.path;

  const requestLogger = logger.child({
    requestId: c.get('requestId'),
    method,
    path,
  });

  // Match route
  const matchedRoute = routeMatcher.match(method, path);

  if (!matchedRoute) {
    requestLogger.warn('No route matched');
    return c.json(
      {
        error: 'NOT_FOUND',
        message: `No route configured for ${method} ${path}`,
      },
      404,
    );
  }

  requestLogger.debug({ target: matchedRoute.target, auth: matchedRoute.auth }, 'Route matched');

  // ✨ CHECK IF ROUTE REQUIRES AUTHENTICATION
  if (matchedRoute.auth) {
    // Extract and verify token
    const authHeader = c.req.header('Authorization');
    const token = extractTokenFromHeader(authHeader);

    if (!token) {
      requestLogger.warn('Missing authentication token');
      return c.json(
        {
          error: 'TOKEN_MISSING',
          message: 'Authentication token is required',
        },
        401,
      );
    }

    const decoded = verifyToken(token);

    if (decoded.expired) {
      requestLogger.warn('Token expired');
      return c.json(
        {
          error: 'TOKEN_EXPIRED',
          message: 'Authentication token has expired',
          hint: 'Use refresh token to get a new access token',
        },
        401,
      );
    }

    if (!decoded.valid) {
      requestLogger.warn('Invalid token');
      return c.json(
        {
          error: 'TOKEN_INVALID',
          message: 'Authentication token is invalid',
        },
        401,
      );
    }

    // Set user context
    c.set('userId', decoded.payload.sub);
    c.set('email', decoded.payload.email);
    c.set('roles', decoded.payload.roles || []);
    c.set('gymId', decoded.payload.gymId);
    c.set('authenticated', true);

    requestLogger.debug({ userId: decoded.payload.sub }, 'User authenticated');
  }

  // Forward request to backend service
  try {
    const response = await httpProxy.forward(c, matchedRoute);
    return response;
  } catch (error) {
    requestLogger.error({ error }, 'Proxy error');
    return c.json(
      {
        error: 'PROXY_ERROR',
        message: 'Failed to proxy request',
      },
      502,
    );
  }
});

// 404 handler
app.notFound((c) => {
  return c.json(
    {
      error: 'NOT_FOUND',
      message: `Route ${c.req.method} ${c.req.path} not found`,
    },
    404,
  );
});

// Error handler
app.onError((err, c) => {
  logger.error({ err, path: c.req.path }, 'Unhandled error');

  return c.json(
    {
      error: 'INTERNAL_SERVER_ERROR',
      message: config.nodeEnv === 'development' ? err.message : 'Internal server error',
    },
    500,
  );
});

/**
 * START SERVER
 */
const server = Bun.serve({
  port: config.port,
  fetch: app.fetch,
});

logger.info(
  {
    port: config.port,
    env: config.nodeEnv,
    pid: process.pid,
    routes: routes.length,
  },
  '🚪 API Gateway started with JWT authentication',
);

logger.info(`📊 Health: http://localhost:${config.port}/health`);
logger.info(`📋 Routes: http://localhost:${config.port}/routes (dev only)`);

/**
 * GRACEFUL SHUTDOWN
 */
process.on('SIGTERM', async () => {
  logger.info('SIGTERM received, shutting down gracefully');
  server.stop();
  process.exit(0);
});

process.on('SIGINT', async () => {
  logger.info('SIGINT received, shutting down gracefully');
  server.stop();
  process.exit(0);
});

process.on('unhandledRejection', (reason, promise) => {
  logger.error({ reason, promise }, 'Unhandled Rejection');
});

process.on('uncaughtException', (error) => {
  logger.fatal({ error }, 'Uncaught Exception');
  process.exit(1);
});

// Named export for testing purposes (do not use default export to prevent Bun auto-serve)
export { app };