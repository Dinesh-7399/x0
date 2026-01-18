// src/infrastructure/database/PostgresConversationRepository.ts

import type { IConversationRepository, PaginationOptions, ConversationWithParticipants } from '../../domain/repositories/IConversationRepository.js';
import { Conversation, ConversationType } from '../../domain/entities/Conversation.js';
import { Participant, ParticipantRole } from '../../domain/entities/Participant.js';
import { query, queryOne, execute, withTransaction } from './postgres.js';

interface ConversationRow {
  id: string;
  type: string;
  name: string | null;
  avatar_url: string | null;
  created_by: string;
  gym_id: string | null;
  metadata: Record<string, unknown>;
  created_at: Date;
  updated_at: Date;
}

interface ParticipantRow {
  id: string;
  conversation_id: string;
  user_id: string;
  role: string;
  nickname: string | null;
  last_read_at: Date | null;
  muted_until: Date | null;
  joined_at: Date;
  left_at: Date | null;
}

export class PostgresConversationRepository implements IConversationRepository {

  private mapRowToConversation(row: ConversationRow): Conversation {
    return Conversation.fromPersistence({
      id: row.id,
      type: row.type as ConversationType,
      name: row.name || undefined,
      avatarUrl: row.avatar_url || undefined,
      createdBy: row.created_by,
      gymId: row.gym_id || undefined,
      metadata: row.metadata,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    });
  }

  private mapRowToParticipant(row: ParticipantRow): Participant {
    return Participant.fromPersistence({
      id: row.id,
      conversationId: row.conversation_id,
      userId: row.user_id,
      role: row.role as ParticipantRole,
      nickname: row.nickname || undefined,
      lastReadAt: row.last_read_at || undefined,
      mutedUntil: row.muted_until || undefined,
      joinedAt: row.joined_at,
      leftAt: row.left_at || undefined,
    });
  }

  async findById(id: string): Promise<Conversation | null> {
    const row = await queryOne<ConversationRow>(
      'SELECT * FROM conversations WHERE id = $1',
      [id]
    );
    return row ? this.mapRowToConversation(row) : null;
  }

  async findByIdWithParticipants(id: string): Promise<ConversationWithParticipants | null> {
    const convRow = await queryOne<ConversationRow>(
      'SELECT * FROM conversations WHERE id = $1',
      [id]
    );
    if (!convRow) return null;

    const participantRows = await query<ParticipantRow>(
      'SELECT * FROM participants WHERE conversation_id = $1 AND left_at IS NULL',
      [id]
    );

    const lastMessageRow = await queryOne<{
      id: string;
      content: string;
      sender_id: string;
      created_at: Date;
    }>(
      `SELECT id, content, sender_id, created_at 
       FROM messages 
       WHERE conversation_id = $1 AND deleted_at IS NULL
       ORDER BY created_at DESC LIMIT 1`,
      [id]
    );

    return {
      conversation: this.mapRowToConversation(convRow),
      participants: participantRows.map(r => this.mapRowToParticipant(r)),
      lastMessage: lastMessageRow ? {
        id: lastMessageRow.id,
        content: lastMessageRow.content,
        senderId: lastMessageRow.sender_id,
        createdAt: lastMessageRow.created_at,
      } : undefined,
      unreadCount: 0, // TODO: Calculate based on last_read_at
    };
  }

  async save(conversation: Conversation): Promise<void> {
    await execute(
      `INSERT INTO conversations (id, type, name, avatar_url, created_by, gym_id, metadata, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
      [
        conversation.id,
        conversation.type,
        conversation.name,
        conversation.avatarUrl,
        conversation.createdBy,
        conversation.gymId,
        JSON.stringify(conversation.metadata),
        conversation.createdAt,
        conversation.updatedAt,
      ]
    );
  }

  async update(conversation: Conversation): Promise<void> {
    await execute(
      `UPDATE conversations 
       SET name = $2, avatar_url = $3, metadata = $4, updated_at = $5
       WHERE id = $1`,
      [
        conversation.id,
        conversation.name,
        conversation.avatarUrl,
        JSON.stringify(conversation.metadata),
        new Date(),
      ]
    );
  }

  async delete(id: string): Promise<void> {
    await execute('DELETE FROM conversations WHERE id = $1', [id]);
  }

  async findByUserId(userId: string, pagination: PaginationOptions): Promise<{
    conversations: ConversationWithParticipants[];
    total: number;
  }> {
    // Get conversation IDs where user is a participant
    const countResult = await queryOne<{ count: string }>(
      `SELECT COUNT(DISTINCT c.id) as count
       FROM conversations c
       JOIN participants p ON p.conversation_id = c.id
       WHERE p.user_id = $1 AND p.left_at IS NULL`,
      [userId]
    );
    const total = parseInt(countResult?.count || '0', 10);

    const convRows = await query<ConversationRow & { unread_count: string }>(
      `SELECT c.*, 
              COALESCE((
                SELECT COUNT(*) FROM messages m 
                WHERE m.conversation_id = c.id 
                  AND m.created_at > COALESCE(p.last_read_at, p.joined_at)
                  AND m.deleted_at IS NULL
                  AND m.sender_id != $1
              ), 0) as unread_count
       FROM conversations c
       JOIN participants p ON p.conversation_id = c.id AND p.user_id = $1 AND p.left_at IS NULL
       ORDER BY c.updated_at DESC
       LIMIT $2 OFFSET $3`,
      [userId, pagination.limit, pagination.offset]
    );

    const conversations: ConversationWithParticipants[] = [];

    for (const row of convRows) {
      const participantRows = await query<ParticipantRow>(
        'SELECT * FROM participants WHERE conversation_id = $1 AND left_at IS NULL',
        [row.id]
      );

      const lastMessageRow = await queryOne<{
        id: string;
        content: string;
        sender_id: string;
        created_at: Date;
      }>(
        `SELECT id, content, sender_id, created_at 
         FROM messages 
         WHERE conversation_id = $1 AND deleted_at IS NULL
         ORDER BY created_at DESC LIMIT 1`,
        [row.id]
      );

      conversations.push({
        conversation: this.mapRowToConversation(row),
        participants: participantRows.map(r => this.mapRowToParticipant(r)),
        lastMessage: lastMessageRow ? {
          id: lastMessageRow.id,
          content: lastMessageRow.content,
          senderId: lastMessageRow.sender_id,
          createdAt: lastMessageRow.created_at,
        } : undefined,
        unreadCount: parseInt(row.unread_count, 10),
      });
    }

    return { conversations, total };
  }

  async findDirectConversation(userId1: string, userId2: string): Promise<Conversation | null> {
    const row = await queryOne<ConversationRow>(
      `SELECT c.* FROM conversations c
       WHERE c.type = 'direct'
         AND EXISTS (SELECT 1 FROM participants WHERE conversation_id = c.id AND user_id = $1 AND left_at IS NULL)
         AND EXISTS (SELECT 1 FROM participants WHERE conversation_id = c.id AND user_id = $2 AND left_at IS NULL)
         AND (SELECT COUNT(*) FROM participants WHERE conversation_id = c.id AND left_at IS NULL) = 2`,
      [userId1, userId2]
    );
    return row ? this.mapRowToConversation(row) : null;
  }

  async findByGymId(gymId: string, pagination: PaginationOptions): Promise<{
    conversations: Conversation[];
    total: number;
  }> {
    const countResult = await queryOne<{ count: string }>(
      'SELECT COUNT(*) as count FROM conversations WHERE gym_id = $1',
      [gymId]
    );
    const total = parseInt(countResult?.count || '0', 10);

    const rows = await query<ConversationRow>(
      `SELECT * FROM conversations 
       WHERE gym_id = $1 
       ORDER BY updated_at DESC 
       LIMIT $2 OFFSET $3`,
      [gymId, pagination.limit, pagination.offset]
    );

    return {
      conversations: rows.map(r => this.mapRowToConversation(r)),
      total,
    };
  }

  async addParticipant(participant: Participant): Promise<void> {
    await execute(
      `INSERT INTO participants (id, conversation_id, user_id, role, nickname, joined_at)
       VALUES ($1, $2, $3, $4, $5, $6)
       ON CONFLICT (conversation_id, user_id) 
       DO UPDATE SET left_at = NULL, role = $4, joined_at = $6`,
      [
        participant.id,
        participant.conversationId,
        participant.userId,
        participant.role,
        participant.nickname,
        participant.joinedAt,
      ]
    );
  }

  async findParticipant(conversationId: string, userId: string): Promise<Participant | null> {
    const row = await queryOne<ParticipantRow>(
      'SELECT * FROM participants WHERE conversation_id = $1 AND user_id = $2 AND left_at IS NULL',
      [conversationId, userId]
    );
    return row ? this.mapRowToParticipant(row) : null;
  }

  async findParticipants(conversationId: string): Promise<Participant[]> {
    const rows = await query<ParticipantRow>(
      'SELECT * FROM participants WHERE conversation_id = $1 AND left_at IS NULL ORDER BY joined_at',
      [conversationId]
    );
    return rows.map(r => this.mapRowToParticipant(r));
  }

  async updateParticipant(participant: Participant): Promise<void> {
    await execute(
      `UPDATE participants 
       SET role = $3, nickname = $4, last_read_at = $5, muted_until = $6, left_at = $7
       WHERE conversation_id = $1 AND user_id = $2`,
      [
        participant.conversationId,
        participant.userId,
        participant.role,
        participant.nickname,
        participant.lastReadAt,
        participant.mutedUntil,
        participant.leftAt,
      ]
    );
  }

  async removeParticipant(conversationId: string, userId: string): Promise<void> {
    await execute(
      'UPDATE participants SET left_at = NOW() WHERE conversation_id = $1 AND user_id = $2',
      [conversationId, userId]
    );
  }

  async getParticipantCount(conversationId: string): Promise<number> {
    const result = await queryOne<{ count: string }>(
      'SELECT COUNT(*) as count FROM participants WHERE conversation_id = $1 AND left_at IS NULL',
      [conversationId]
    );
    return parseInt(result?.count || '0', 10);
  }
}
