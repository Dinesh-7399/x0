import { Hono } from 'hono';
import { logger } from 'hono/logger';
import { getConfig } from './config/index.js';
import { pool, checkConnection } from './infrastructure/database/postgres.js';
import { PostgresSocialRepository } from './infrastructure/database/PostgresSocialRepository.js';
import { SocialService } from './application/services/SocialService.js';
import { SocialController } from './interfaces/http/controllers/SocialController.js';
import { createSocialRoutes } from './interfaces/http/routes/social.routes.js';

// Load Config
const config = getConfig();

// Initialize DB and Services
const repository = new PostgresSocialRepository();
const service = new SocialService(repository);
const controller = new SocialController(service);

const app = new Hono();

// Global Middleware
app.use('*', logger());

app.onError((err, c) => {
  console.error('🔥 Global Error Handler:', err);
  return c.text(`Internal Server Error: ${err.message}`, 500);
});

// Health Check
app.get('/health', async (c) => {
  const dbHealth = await checkConnection();
  return c.json({
    status: dbHealth ? 'healthy' : 'unhealthy',
    service: 'social-service',
    timestamp: new Date().toISOString()
  }, dbHealth ? 200 : 503);
});

// Mount Routes with /social prefix
// Gateway forwards /social/* (after stripping /api/v1)
const routes = createSocialRoutes(controller);
app.route('/social', routes);


// Start Server
const port = Number(config.port);
console.log(`🚀 social-service running on http://localhost:${port}`);

export default {
  port,
  fetch: app.fetch,
};
