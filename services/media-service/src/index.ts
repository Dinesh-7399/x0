// src/index.ts

import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { logger } from 'hono/logger';
import { getConfig, validateConfig } from './config/index.js';
import { ServiceKeys } from './infrastructure/container/Container.js';
import { bootstrap } from './infrastructure/container/bootstrap.js';
import { checkConnection, closePool } from './infrastructure/database/postgres.js';
import type { MediaController } from './interfaces/http/controllers/MediaController.js';
import {
  authMiddleware,
  optionalAuthMiddleware,
} from './interfaces/http/middleware/authMiddleware.js';
import { errorHandler } from './interfaces/http/middleware/errorHandler.js';
import { createMediaRoutes } from './interfaces/http/routes/media.routes.js';

// Load and validate configuration
const config = getConfig();
validateConfig();

// Bootstrap DI container
const container = bootstrap();

// Resolve controllers
const mediaController = container.resolve<MediaController>(ServiceKeys.MediaController);

// Create Hono app
const app = new Hono();

// Global middleware
app.use('*', logger());
app.use('*', errorHandler);
app.use(
  '*',
  cors({
    origin: config.nodeEnv === 'development' ? '*' : ['https://gymato.com'],
    credentials: true,
  }),
);

// Health checks
app.get('/health', async (c) => {
  const dbHealthy = await checkConnection();
  return c.json(
    {
      status: dbHealthy ? 'healthy' : 'degraded',
      service: config.serviceName,
      uptime: process.uptime(),
      database: dbHealthy ? 'connected' : 'disconnected',
    },
    dbHealthy ? 200 : 503,
  );
});
app.get('/ready', (c) => c.json({ status: 'ready' }));
app.get('/live', (c) => c.json({ status: 'alive' }));

// Media routes (all require authentication)
app.use('/media/*', authMiddleware);
app.route('/media', createMediaRoutes(mediaController));

// Serve uploaded files (local storage only, development)
if (config.storageType === 'local') {
  app.get('/files/:userId/:filename', optionalAuthMiddleware, async (c) => {
    const userId = c.req.param('userId');
    const filename = c.req.param('filename');
    const filePath = `${config.storagePath}/${userId}/${filename}`;

    try {
      const file = Bun.file(filePath);
      if (await file.exists()) {
        return new Response(file.stream(), {
          headers: {
            'Content-Type': file.type || 'application/octet-stream',
            'Cache-Control': 'public, max-age=31536000',
          },
        });
      }
    } catch (error) {
      console.error('File serve error:', error);
    }

    return c.json({ error: 'NOT_FOUND', message: 'File not found' }, 404);
  });
}

// 404 handler
app.notFound((c) =>
  c.json(
    {
      error: 'NOT_FOUND',
      message: `Route ${c.req.method} ${c.req.path} not found`,
    },
    404,
  ),
);

// Start server
const server = Bun.serve({
  port: config.port,
  fetch: app.fetch,
});

console.log(`
📁 Media Service v1.0
   Port: ${config.port}
   Environment: ${config.nodeEnv}
   Storage: ${config.storageType}
   
   Media:     /media/*
   Files:     /files/*
`);

// Graceful shutdown
process.on('SIGTERM', async () => {
  server.stop();
  await closePool();
  process.exit(0);
});

process.on('SIGINT', async () => {
  server.stop();
  await closePool();
  process.exit(0);
});

// Named export for testing
export { app };
