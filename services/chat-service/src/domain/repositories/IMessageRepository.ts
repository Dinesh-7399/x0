// src/domain/repositories/IMessageRepository.ts

import { Message } from '../entities/Message.js';

export interface MessagePaginationOptions {
  limit: number;
  before?: string;  // Cursor-based: messages before this ID
  after?: string;   // Cursor-based: messages after this ID
}

export interface MessageSearchOptions {
  query: string;
  limit: number;
}

export interface IMessageRepository {
  // Message CRUD
  findById(id: string): Promise<Message | null>;
  save(message: Message): Promise<void>;
  update(message: Message): Promise<void>;
  delete(id: string): Promise<void>;

  // Conversation messages (cursor-based pagination)
  findByConversationId(
    conversationId: string,
    options: MessagePaginationOptions
  ): Promise<{
    messages: Message[];
    hasMore: boolean;
    nextCursor?: string;
  }>;

  // Get latest message for each conversation (for inbox preview)
  findLatestByConversationIds(conversationIds: string[]): Promise<Map<string, Message>>;

  // Search within conversation
  searchInConversation(
    conversationId: string,
    options: MessageSearchOptions
  ): Promise<Message[]>;

  // Read receipts
  markAsRead(messageId: string, userId: string): Promise<void>;
  getReadReceipts(messageId: string): Promise<{ userId: string; readAt: Date }[]>;
  getUnreadCount(conversationId: string, userId: string, since: Date): Promise<number>;

  // Bulk operations
  deleteByConversationId(conversationId: string): Promise<void>;
}
