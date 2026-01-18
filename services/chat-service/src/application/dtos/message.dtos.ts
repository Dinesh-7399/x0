// src/application/dtos/message.dtos.ts

import { MessageType } from '../../domain/entities/Message.js';

// Request DTOs
export interface SendMessageDto {
  type?: 'text' | 'image' | 'video' | 'file' | 'workout_share' | 'location';
  content: string;
  mediaUrl?: string;
  replyToId?: string;
}

export interface EditMessageDto {
  content: string;
}

export interface MessagePaginationDto {
  limit?: number;
  before?: string;
  after?: string;
}

export interface SearchMessagesDto {
  query: string;
  limit?: number;
}

// Response DTOs
export interface MessageResponse {
  id: string;
  conversationId: string;
  senderId: string;
  type: MessageType;
  content: string;
  mediaUrl?: string;
  replyToId?: string;
  isEdited: boolean;
  isDeleted: boolean;
  createdAt: Date;
  editedAt?: Date;
}

export interface MessageListResponse {
  messages: MessageResponse[];
  hasMore: boolean;
  nextCursor?: string;
}

export interface ReadReceiptResponse {
  userId: string;
  readAt: Date;
}
