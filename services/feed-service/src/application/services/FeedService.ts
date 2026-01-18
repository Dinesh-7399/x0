import { FeedItem } from '../../domain/entities/FeedItem.js';
import { PostgresFeedRepository } from '../../infrastructure/database/PostgresFeedRepository.js';
import { SocialServiceClient } from '../../infrastructure/clients/SocialServiceClient.js';

export class FeedService {
  constructor(
    private repo: PostgresFeedRepository,
    private socialClient: SocialServiceClient
  ) { }

  // Called when Actor follows Target
  async handleFollow(actorId: string, targetId: string) {
    // Notify the target that Actor followed them
    const item = new FeedItem(
      '', targetId, actorId, 'FOLLOW', actorId, 'USER',
      { message: 'started following you' }, new Date()
    );
    await this.repo.createFeedItems([item]);
  }

  // Called when Actor performs an action (Like, Post)
  async handleActivity(actorId: string, actionType: string, targetId: string, targetType: string) {
    // 1. Get Followers of Actor
    const followerIds = await this.socialClient.getFollowers(actorId);

    // 2. Create Feed Items for all followers (Fan-out)
    const items = followerIds.map(userId => new FeedItem(
      '', userId, actorId, actionType, targetId, targetType,
      {}, new Date()
    ));

    // 3. Insert Bulk
    await this.repo.createFeedItems(items);
  }

  async getUserFeed(userId: string, limit = 20, offset = 0) {
    return await this.repo.getFeed(userId, limit, offset);
  }
}
