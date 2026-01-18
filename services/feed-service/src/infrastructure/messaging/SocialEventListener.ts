import { createRedisBus, Subscriber, Message } from '@gymato/messaging';
import { getConfig } from '../../config/index.js';
import { FeedService } from '../../application/services/FeedService.js';

export class SocialEventListener {
  private subscriber: Subscriber;

  constructor(private feedService: FeedService) {
    const config = getConfig();
    this.subscriber = createRedisBus(config.redisUrl); // Assuming createRedisBus returns Subscriber interface too (it does)
  }

  async start() {
    console.log('🎧 Starting Social Event Listener...');

    // Social Follow: { followerId, followingId, targetType }
    await this.subscriber.subscribe('social.follow', async (msg: Message<any>) => {
      const { followerId, followingId, targetType } = msg.payload;
      if (targetType === 'USER') {
        // "followerId followed followingId"
        // 1. Notify followingId
        await this.feedService.handleFollow(followerId, followingId);
      }
    });

    // Social Interaction: { userId, targetId, targetType, interactionType }
    await this.subscriber.subscribe('social.interaction.created', async (msg: Message<any>) => {
      const { userId, targetId, targetType, interactionType } = msg.payload;
      // "userId liked targetId"
      await this.feedService.handleActivity(userId, `LIKE_${targetType}`, targetId, targetType);
    });
  }
}
