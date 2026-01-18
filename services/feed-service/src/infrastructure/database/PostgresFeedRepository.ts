import { query } from './postgres.js';
import { FeedItem } from '../../domain/entities/FeedItem.js';

export class PostgresFeedRepository {
  async createFeedItems(items: FeedItem[]): Promise<void> {
    if (items.length === 0) return;

    // Bulk Insert
    const values: any[] = [];
    const placeholders: string[] = [];
    let counter = 1;

    for (const item of items) {
      placeholders.push(`($${counter++}, $${counter++}, $${counter++}, $${counter++}, $${counter++}, $${counter++}, $${counter++})`);
      values.push(
        item.userId,
        item.actorId,
        item.actionType,
        item.targetId,
        item.targetType,
        JSON.stringify(item.metadata),
        item.createdAt
      );
    }

    const sql = `
      INSERT INTO feed_items (user_id, actor_id, action_type, target_id, target_type, metadata, created_at)
      VALUES ${placeholders.join(', ')}
    `;

    await query(sql, values);
  }

  async getFeed(userId: string, limit: number, offset: number): Promise<FeedItem[]> {
    const res = await query(
      `SELECT * FROM feed_items 
       WHERE user_id = $1
       ORDER BY created_at DESC
       LIMIT $2 OFFSET $3`,
      [userId, limit, offset]
    );

    return res.rows.map((row: any) => new FeedItem(
      row.id,
      row.user_id,
      row.actor_id,
      row.action_type,
      row.target_id,
      row.target_type,
      row.metadata,
      row.created_at
    ));
  }
}
