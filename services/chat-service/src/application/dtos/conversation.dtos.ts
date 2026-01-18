// src/application/dtos/conversation.dtos.ts

import { ConversationType } from '../../domain/entities/Conversation.js';
import { ParticipantRole } from '../../domain/entities/Participant.js';

// Request DTOs
export interface CreateDirectConversationDto {
  targetUserId: string;
}

export interface CreateGroupConversationDto {
  name: string;
  participantIds: string[];
  avatarUrl?: string;
  gymId?: string;
}

export interface CreateTrainerClientConversationDto {
  clientId: string;
  programId?: string;
}

export interface UpdateConversationDto {
  name?: string;
  avatarUrl?: string;
}

export interface AddParticipantDto {
  userId: string;
  role?: ParticipantRole;
}

// Response DTOs
export interface ParticipantResponse {
  id: string;
  userId: string;
  role: ParticipantRole;
  nickname?: string;
  joinedAt: Date;
  isActive: boolean;
}

export interface ConversationResponse {
  id: string;
  type: ConversationType;
  name?: string;
  avatarUrl?: string;
  createdBy: string;
  gymId?: string;
  createdAt: Date;
  updatedAt: Date;
  participants: ParticipantResponse[];
  lastMessage?: {
    id: string;
    content: string;
    senderId: string;
    createdAt: Date;
  };
  unreadCount: number;
}

export interface ConversationListResponse {
  conversations: ConversationResponse[];
  total: number;
  limit: number;
  offset: number;
}
