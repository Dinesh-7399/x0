import { Hono } from 'hono';
import { logger } from 'hono/logger';
import { cors } from 'hono/cors';

const app = new Hono();

// Middleware
app.use('*', logger());
app.use('*', cors());

// Health check
app.get('/health', (c) => {
  return c.json({ 
    status: 'healthy', 
    service: 'api-gateway',
    timestamp: new Date().toISOString()
  });
});

// Metrics endpoint (for Prometheus)
app.get('/metrics', (c) => {
  return c.text('# API Gateway Metrics\n# TODO: Implement metrics');
});

// API routes will be dynamically loaded from routes.yaml
app.all('/api/*', (c) => {
  return c.json({ 
    error: 'Route configuration not loaded',
    message: 'Implement route loading from config/routes.yaml'
  }, 503);
});

const port = process.env.PORT || 80;

console.log(`🚪 API Gateway running on http://localhost:${port}`);
console.log(`📊 Metrics available at http://localhost:${port}/metrics`);

export default {
  port,
  fetch: app.fetch,
};
