import { Hono } from 'hono';
import { logger } from 'hono/logger';
import { getClient } from './infrastructure/database/postgres.js'; // Ensure DB connection works
import { createRoutes } from './interfaces/http/routes/routes.js';

const app = new Hono();

app.use('*', logger());

// Health Check
app.get('/health', async (c) => {
  try {
    const client = await getClient();
    await client.query('SELECT 1');
    client.release();
    return c.json({ status: 'healthy', service: 'trainer-service', database: 'connected' });
  } catch (err) {
    return c.json({ status: 'unhealthy', service: 'trainer-service', error: (err as Error).message }, 503);
  }
});

// Register Routes
const routes = createRoutes();
app.route('/', routes);

const port = process.env.PORT || 8080;

console.log(`🚀 trainer-service running on http://localhost:${port}`);

export default {
  port,
  fetch: app.fetch,
};
