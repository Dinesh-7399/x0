// src/infrastructure/database/PostgresMessageRepository.ts

import type { IMessageRepository, MessagePaginationOptions, MessageSearchOptions } from '../../domain/repositories/IMessageRepository.js';
import { Message, MessageType } from '../../domain/entities/Message.js';
import { query, queryOne, execute } from './postgres.js';

interface MessageRow {
  id: string;
  conversation_id: string;
  sender_id: string;
  type: string;
  content: string;
  media_url: string | null;
  reply_to_id: string | null;
  edited_at: Date | null;
  deleted_at: Date | null;
  created_at: Date;
}

export class PostgresMessageRepository implements IMessageRepository {

  private mapRowToMessage(row: MessageRow): Message {
    return Message.fromPersistence({
      id: row.id,
      conversationId: row.conversation_id,
      senderId: row.sender_id,
      type: row.type as MessageType,
      content: row.content,
      mediaUrl: row.media_url || undefined,
      replyToId: row.reply_to_id || undefined,
      editedAt: row.edited_at || undefined,
      deletedAt: row.deleted_at || undefined,
      createdAt: row.created_at,
    });
  }

  async findById(id: string): Promise<Message | null> {
    const row = await queryOne<MessageRow>(
      'SELECT * FROM messages WHERE id = $1',
      [id]
    );
    return row ? this.mapRowToMessage(row) : null;
  }

  async save(message: Message): Promise<void> {
    await execute(
      `INSERT INTO messages (id, conversation_id, sender_id, type, content, media_url, reply_to_id, created_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
      [
        message.id,
        message.conversationId,
        message.senderId,
        message.type,
        message.content,
        message.mediaUrl,
        message.replyToId,
        message.createdAt,
      ]
    );

    // Update conversation's updated_at to bubble it to top
    await execute(
      'UPDATE conversations SET updated_at = NOW() WHERE id = $1',
      [message.conversationId]
    );
  }

  async update(message: Message): Promise<void> {
    await execute(
      `UPDATE messages 
       SET content = $2, edited_at = $3, deleted_at = $4
       WHERE id = $1`,
      [
        message.id,
        message.content,
        message.editedAt,
        message.deletedAt,
      ]
    );
  }

  async delete(id: string): Promise<void> {
    await execute('DELETE FROM messages WHERE id = $1', [id]);
  }

  async findByConversationId(
    conversationId: string,
    options: MessagePaginationOptions
  ): Promise<{ messages: Message[]; hasMore: boolean; nextCursor?: string }> {
    let query_str: string;
    let params: unknown[];

    if (options.before) {
      // Get messages before this cursor (older)
      const cursorMessage = await this.findById(options.before);
      if (!cursorMessage) {
        return { messages: [], hasMore: false };
      }
      query_str = `
        SELECT * FROM messages 
        WHERE conversation_id = $1 
          AND deleted_at IS NULL
          AND created_at < $2
        ORDER BY created_at DESC 
        LIMIT $3
      `;
      params = [conversationId, cursorMessage.createdAt, options.limit + 1];
    } else if (options.after) {
      // Get messages after this cursor (newer)
      const cursorMessage = await this.findById(options.after);
      if (!cursorMessage) {
        return { messages: [], hasMore: false };
      }
      query_str = `
        SELECT * FROM messages 
        WHERE conversation_id = $1 
          AND deleted_at IS NULL
          AND created_at > $2
        ORDER BY created_at ASC 
        LIMIT $3
      `;
      params = [conversationId, cursorMessage.createdAt, options.limit + 1];
    } else {
      // Get latest messages
      query_str = `
        SELECT * FROM messages 
        WHERE conversation_id = $1 AND deleted_at IS NULL
        ORDER BY created_at DESC 
        LIMIT $2
      `;
      params = [conversationId, options.limit + 1];
    }

    const rows = await query<MessageRow>(query_str, params);

    const hasMore = rows.length > options.limit;
    const messages = rows.slice(0, options.limit).map(r => this.mapRowToMessage(r));

    // Reverse if fetching latest so oldest is first
    if (!options.after) {
      messages.reverse();
    }

    return {
      messages,
      hasMore,
      nextCursor: hasMore ? messages[0]?.id : undefined,
    };
  }

  async findLatestByConversationIds(conversationIds: string[]): Promise<Map<string, Message>> {
    if (conversationIds.length === 0) {
      return new Map();
    }

    const placeholders = conversationIds.map((_, i) => `$${i + 1}`).join(', ');
    const rows = await query<MessageRow>(
      `SELECT DISTINCT ON (conversation_id) *
       FROM messages
       WHERE conversation_id IN (${placeholders}) AND deleted_at IS NULL
       ORDER BY conversation_id, created_at DESC`,
      conversationIds
    );

    const result = new Map<string, Message>();
    for (const row of rows) {
      result.set(row.conversation_id, this.mapRowToMessage(row));
    }
    return result;
  }

  async searchInConversation(
    conversationId: string,
    options: MessageSearchOptions
  ): Promise<Message[]> {
    // Simple ILIKE search - for production, use full-text search with tsvector
    const rows = await query<MessageRow>(
      `SELECT * FROM messages 
       WHERE conversation_id = $1 
         AND deleted_at IS NULL
         AND type = 'text'
         AND content ILIKE $2
       ORDER BY created_at DESC 
       LIMIT $3`,
      [conversationId, `%${options.query}%`, options.limit]
    );
    return rows.map(r => this.mapRowToMessage(r));
  }

  async markAsRead(messageId: string, userId: string): Promise<void> {
    await execute(
      `INSERT INTO read_receipts (id, message_id, user_id, read_at)
       VALUES (gen_random_uuid(), $1, $2, NOW())
       ON CONFLICT (message_id, user_id) DO UPDATE SET read_at = NOW()`,
      [messageId, userId]
    );
  }

  async getReadReceipts(messageId: string): Promise<{ userId: string; readAt: Date }[]> {
    const rows = await query<{ user_id: string; read_at: Date }>(
      'SELECT user_id, read_at FROM read_receipts WHERE message_id = $1',
      [messageId]
    );
    return rows.map(r => ({ userId: r.user_id, readAt: r.read_at }));
  }

  async getUnreadCount(conversationId: string, userId: string, since: Date): Promise<number> {
    const result = await queryOne<{ count: string }>(
      `SELECT COUNT(*) as count FROM messages 
       WHERE conversation_id = $1 
         AND sender_id != $2
         AND created_at > $3
         AND deleted_at IS NULL`,
      [conversationId, userId, since]
    );
    return parseInt(result?.count || '0', 10);
  }

  async deleteByConversationId(conversationId: string): Promise<void> {
    await execute('DELETE FROM messages WHERE conversation_id = $1', [conversationId]);
  }
}
