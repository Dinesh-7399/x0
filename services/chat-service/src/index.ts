// src/index.ts

import { Hono } from 'hono';
import { logger } from 'hono/logger';
import { cors } from 'hono/cors';
import { getConfig, validateConfig } from './config/index.js';
import { bootstrap } from './infrastructure/container/bootstrap.js';
import { ServiceKeys } from './infrastructure/container/Container.js';
import { createConversationRoutes } from './interfaces/http/routes/conversation.routes.js';
import { createMessageRoutes, createConversationMessageRoutes } from './interfaces/http/routes/message.routes.js';
import { errorHandler } from './interfaces/http/middleware/errorHandler.js';
import { closePool, checkConnection } from './infrastructure/database/postgres.js';
import type { ConversationController } from './interfaces/http/controllers/ConversationController.js';
import type { MessageController } from './interfaces/http/controllers/MessageController.js';

// Load and validate configuration
const config = getConfig();
validateConfig();

// Bootstrap DI container
const container = bootstrap();

// Resolve controllers
const conversationController = container.resolve<ConversationController>(ServiceKeys.ConversationController);
const messageController = container.resolve<MessageController>(ServiceKeys.MessageController);

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
app.get('/health', async (c) => {
  const dbHealthy = await checkConnection();
  return c.json({
    status: dbHealthy ? 'healthy' : 'degraded',
    service: config.serviceName,
    uptime: process.uptime(),
    database: dbHealthy ? 'connected' : 'disconnected',
  }, dbHealthy ? 200 : 503);
});
app.get('/ready', (c) => c.json({ status: 'ready' }));
app.get('/live', (c) => c.json({ status: 'alive' }));

// Auth middleware
import { authMiddleware } from './interfaces/http/middleware/authMiddleware.js';

// Flattened Routes (to avoid sub-router issues and ensure middleware application)

// Conversations
app.get('/conversations', authMiddleware, (c) => conversationController.list(c));
app.get('/conversations/', authMiddleware, (c) => conversationController.list(c)); // Handle trailing slash
app.post('/conversations/direct', authMiddleware, (c) => conversationController.createDirect(c));
app.post('/conversations/group', authMiddleware, (c) => conversationController.createGroup(c));
app.get('/conversations/:id', authMiddleware, (c) => conversationController.get(c));
app.delete('/conversations/:id', authMiddleware, (c) => conversationController.leave(c));
app.post('/conversations/:id/participants', authMiddleware, (c) => conversationController.addParticipant(c));
app.delete('/conversations/:id/participants/:userId', authMiddleware, (c) => conversationController.removeParticipant(c));

// Messages
app.get('/conversations/:id/messages', authMiddleware, (c) => messageController.list(c));
app.post('/conversations/:id/messages', authMiddleware, (c) => messageController.send(c));
app.put('/messages/:id', authMiddleware, (c) => messageController.edit(c));
app.delete('/messages/:id', authMiddleware, (c) => messageController.delete(c));
app.post('/messages/:id/read', authMiddleware, (c) => messageController.markAsRead(c));

// 404 handler
app.notFound((c) => c.json({
  error: 'NOT_FOUND',
  message: `Route ${c.req.method} ${c.req.path} not found`,
}, 404));

// Start server
const server = Bun.serve({
  port: config.port,
  fetch: app.fetch,
});

console.log(`
💬 Chat Service v1.0
   Port: ${config.port}
   Environment: ${config.nodeEnv}
   
   Conversations: /conversations/*
   Messages:      /messages/*
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
