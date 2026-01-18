import { Context } from 'hono';
import { FeedService } from '../../../application/services/FeedService.js';

export class FeedController {
  constructor(private feedService: FeedService) { }

  async getFeed(c: Context) {
    const user = c.get('user'); // From Auth Middleware
    // Pagination
    const limit = Number(c.req.query('limit')) || 20;
    const offset = Number(c.req.query('offset')) || 0;

    const feed = await this.feedService.getUserFeed(user.userId, limit, offset);
    return c.json(feed);
  }
}
