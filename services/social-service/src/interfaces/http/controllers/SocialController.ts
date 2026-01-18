import { Context } from 'hono';
import { SocialService } from '../../../application/services/SocialService.js';

export class SocialController {
  constructor(private socialService: SocialService) { }

  // --- Follows ---
  async follow(c: Context) {
    const user = c.get('user');
    const userId = user.userId || user.id || user.sub;

    if (!userId) {
      return c.json({ error: 'Unauthorized', message: 'User ID not found in token' }, 401);
    }

    const { targetId } = c.req.param(); // Assuming targetId comes from route /:targetId
    // c.req.param() returns object if no arg? No, c.req.param('targetId') strictly.
    // My view_file showed: const { targetId } = c.req.param();
    // This implies c.req.param() returns { targetId: string }.
    // I'll stick to original destructuring but fixing param access if needed.
    // Wait, Hono c.req.param() returns object. c.req.param('key') returns string.

    await this.socialService.followUser(userId, targetId);
    return c.json({ success: true });
  }

  async unfollow(c: Context) {
    const user = c.get('user');
    const userId = user.userId || user.id || user.sub;
    const { targetId } = c.req.param();
    await this.socialService.unfollowUser(userId, targetId);
    return c.json({ success: true });
  }

  async getFollowers(c: Context) {
    const { userId } = c.req.param();
    const followers = await this.socialService.getFollowers(userId);
    return c.json(followers);
  }

  // --- Interactions ---
  async react(c: Context) {
    const user = c.get('user');
    const userId = user.userId || user.id || user.sub;
    const { targetType, targetId } = c.req.param();
    // Validate targetType enum if needed

    await this.socialService.reactToEntity(userId, targetId, targetType as any);
    return c.json({ success: true });
  }
}
