import { Hono } from 'hono';
import { logger } from 'hono/logger';

const app = new Hono();

app.use('*', logger());

app.get('/health', (c) => {
  return c.json({ status: 'healthy', service: 'gym-service' });
});

const port = process.env.PORT || 8080;

console.log(`🚀 gym-service running on http://localhost:${port}`);

export default {
  port,
  fetch: app.fetch,
};
