// src/index.ts

import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { logger } from 'hono/logger';
import { getConfig, validateConfig } from './config/index.js';
import { ServiceKeys } from './infrastructure/container/Container.js';
import { bootstrap } from './infrastructure/container/bootstrap.js';
import { checkConnection, closePool } from './infrastructure/database/postgres.js';
import type { ExerciseController } from './interfaces/http/controllers/ExerciseController.js';
import type { WorkoutController } from './interfaces/http/controllers/WorkoutController.js';
import { authMiddleware } from './interfaces/http/middleware/authMiddleware.js';
import { errorHandler } from './interfaces/http/middleware/errorHandler.js';
import { createExerciseRoutes } from './interfaces/http/routes/exercise.routes.js';
import { createWorkoutRoutes } from './interfaces/http/routes/workout.routes.js';

// Load and validate configuration
const config = getConfig();
validateConfig();

// Bootstrap DI container
const container = bootstrap();

// Resolve controllers
const exerciseController = container.resolve<ExerciseController>(ServiceKeys.ExerciseController);
const workoutController = container.resolve<WorkoutController>(ServiceKeys.WorkoutController);

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

// Health checks (no auth required)
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

// Protected routes - require authentication
app.use('/exercises/*', authMiddleware);
app.use('/workouts/*', authMiddleware);

// Mount routes
app.route('/exercises', createExerciseRoutes(exerciseController));
app.route('/workouts', createWorkoutRoutes(workoutController));

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
🏋️ Workout Service v1.0
   Port: ${config.port}
   Environment: ${config.nodeEnv}
   
   Exercises: /exercises/*
   Workouts:  /workouts/*
`);

// Graceful shutdown
process.on('SIGTERM', async () => {
  console.log('Shutting down...');
  server.stop();
  await closePool();
  process.exit(0);
});

process.on('SIGINT', async () => {
  console.log('Interrupted, shutting down...');
  server.stop();
  await closePool();
  process.exit(0);
});

// Named export for testing
export { app };
