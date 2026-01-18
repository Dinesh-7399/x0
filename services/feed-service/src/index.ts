import { Hono } from 'hono';
import { logger } from 'hono/logger';
import { getConfig } from './config/index.js';
import { checkConnection } from './infrastructure/database/postgres.js';
import { PostgresFeedRepository } from './infrastructure/database/PostgresFeedRepository.js';
import { SocialServiceClient } from './infrastructure/clients/SocialServiceClient.js';
import { FeedService } from './application/services/FeedService.js';
import { SocialEventListener } from './infrastructure/messaging/SocialEventListener.js';
import { FeedController } from './interfaces/http/controllers/FeedController.js';
import { createFeedRoutes } from './interfaces/http/routes/feed.routes.js';

// Load Config
const config = getConfig();

// Initialize Infrastructure
const repo = new PostgresFeedRepository();
const socialClient = new SocialServiceClient();

// Initialize Application Service
const feedService = new FeedService(repo, socialClient);

// Initialize Event Listener
const eventListener = new SocialEventListener(feedService);
eventListener.start().catch(console.error); // Start listening to Redis

// Initialize Controller & Routes
const controller = new FeedController(feedService);
const routes = createFeedRoutes(controller);

const app = new Hono();

// Global Middleware
app.use('*', logger());

// Health Check
app.get('/health', async (c) => {
  const dbHealth = await checkConnection();
  return c.json({
    status: dbHealth ? 'healthy' : 'unhealthy',
    service: 'feed-service',
    timestamp: new Date().toISOString()
  }, dbHealth ? 200 : 503);
});

// Mount Routes /api/v1/feed -> /feed (Gateway strips /api/v1)
// So mount at '/feed' if Gateway sends /feed/...? 
// Check Routes.yaml plan: /api/v1/feed/* -> feed-service (stripPrefix /api/v1) -> sends /feed/...
app.route('/feed', routes);

// Start Server
const port = Number(config.port);
console.log(`🚀 feed-service running on http://localhost:${port}`);

export default {
  port,
  fetch: app.fetch,
};
