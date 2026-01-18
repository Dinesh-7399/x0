// src/domain/repositories/IConversationRepository.ts

import { Conversation, ConversationType } from '../entities/Conversation.js';
import { Participant } from '../entities/Participant.js';

export interface PaginationOptions {
  limit: number;
  offset: number;
}

export interface ConversationWithParticipants {
  conversation: Conversation;
  participants: Participant[];
  lastMessage?: {
    id: string;
    content: string;
    senderId: string;
    createdAt: Date;
  };
  unreadCount: number;
}

export interface IConversationRepository {
  // Conversation CRUD
  findById(id: string): Promise<Conversation | null>;
  findByIdWithParticipants(id: string): Promise<ConversationWithParticipants | null>;
  save(conversation: Conversation): Promise<void>;
  update(conversation: Conversation): Promise<void>;
  delete(id: string): Promise<void>;

  // User's conversations
  findByUserId(userId: string, pagination: PaginationOptions): Promise<{
    conversations: ConversationWithParticipants[];
    total: number;
  }>;

  // Find direct conversation between two users
  findDirectConversation(userId1: string, userId2: string): Promise<Conversation | null>;

  // Gym-scoped conversations
  findByGymId(gymId: string, pagination: PaginationOptions): Promise<{
    conversations: Conversation[];
    total: number;
  }>;

  // Participant management
  addParticipant(participant: Participant): Promise<void>;
  findParticipant(conversationId: string, userId: string): Promise<Participant | null>;
  findParticipants(conversationId: string): Promise<Participant[]>;
  updateParticipant(participant: Participant): Promise<void>;
  removeParticipant(conversationId: string, userId: string): Promise<void>;
  getParticipantCount(conversationId: string): Promise<number>;
}
