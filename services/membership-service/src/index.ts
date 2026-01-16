import { Hono } from 'hono';
import { logger } from 'hono/logger';

const app = new Hono();

app.use('*', logger());

app.get('/health', (c) => {
  return c.json({ status: 'healthy', service: 'membership-service' });
});

const port = process.env.PORT || 8080;

console.log(`🚀 membership-service running on http://localhost:${port}`);

export default {
  port,
  fetch: app.fetch,
};
