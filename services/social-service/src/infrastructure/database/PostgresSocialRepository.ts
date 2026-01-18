import { query } from '../../infrastructure/database/postgres.js';
import { Follow, Interaction, Comment, TargetType, InteractionTargetType, ReactionType } from '../../domain/entities/index.js';

export class PostgresSocialRepository {

  // --- Graph (Follows) ---
  async createFollow(follow: Follow): Promise<void> {
    console.log('[PostgresSocialRepository] createFollow', JSON.stringify(follow));
    await query(
      `INSERT INTO follows (follower_id, following_id, target_type, status)
       VALUES ($1, $2, $3, $4)
       ON CONFLICT (follower_id, following_id, target_type) DO NOTHING`,
      [follow.followerId, follow.followingId, follow.targetType, follow.status]
    );
  }

  async removeFollow(followerId: string, followingId: string, targetType: TargetType): Promise<void> {
    await query(
      `DELETE FROM follows WHERE follower_id = $1 AND following_id = $2 AND target_type = $3`,
      [followerId, followingId, targetType]
    );
  }

  async getFollowers(userId: string, targetType: TargetType, limit: number, offset: number): Promise<Follow[]> {
    const res = await query(
      `SELECT * FROM follows 
       WHERE following_id = $1 AND target_type = $2
       ORDER BY created_at DESC LIMIT $3 OFFSET $4`,
      [userId, targetType, limit, offset]
    );
    return res.rows.map(this.mapFollow);
  }

  // --- Interactions (Likes) ---
  async addInteraction(interaction: Interaction): Promise<void> {
    await query(
      `INSERT INTO interactions (user_id, target_id, target_type, type)
       VALUES ($1, $2, $3, $4)
       ON CONFLICT (user_id, target_id, target_type, type) DO NOTHING`, // Idempotency
      [interaction.userId, interaction.targetId, interaction.targetType, interaction.type]
    );
  }

  async removeInteraction(userId: string, targetId: string, targetType: InteractionTargetType, type: ReactionType): Promise<void> {
    await query(
      `DELETE FROM interactions WHERE user_id = $1 AND target_id = $2 AND target_type = $3 AND type = $4`,
      [userId, targetId, targetType, type]
    );
  }

  async getInteractionCount(targetId: string, targetType: InteractionTargetType): Promise<number> {
    const res = await query(
      `SELECT COUNT(*) as count FROM interactions WHERE target_id = $1 AND target_type = $2`,
      [targetId, targetType]
    );
    return parseInt(res.rows[0].count, 10);
  }

  // --- Mappers ---
  private mapFollow(row: any): Follow {
    return new Follow(row.id, row.follower_id, row.following_id, row.target_type, row.status, row.created_at);
  }
}
