// src/interfaces/http/validation/schemas.ts

import { z } from 'zod';

// Conversation Schemas
export const CreateDirectConversationSchema = z.object({
  targetUserId: z.string().uuid('Invalid user ID'),
});

export const CreateGroupConversationSchema = z.object({
  name: z.string().min(1, 'Name is required').max(100, 'Name too long'),
  participantIds: z.array(z.string().uuid()).min(1, 'At least one participant required'),
  avatarUrl: z.string().url().optional(),
  gymId: z.string().uuid().optional(),
});

export const UpdateConversationSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  avatarUrl: z.string().url().optional(),
});

export const AddParticipantSchema = z.object({
  userId: z.string().uuid('Invalid user ID'),
  role: z.enum(['admin', 'member', 'readonly']).optional(),
});

// Message Schemas
export const SendMessageSchema = z.object({
  type: z.enum(['text', 'image', 'video', 'file', 'workout_share', 'location']).optional(),
  content: z.string().min(1, 'Message cannot be empty'),
  mediaUrl: z.string().url().optional(),
  replyToId: z.string().uuid().optional(),
});

export const EditMessageSchema = z.object({
  content: z.string().min(1, 'Message cannot be empty'),
});

export const MarkAsReadSchema = z.object({
  messageId: z.string().uuid('Invalid message ID'),
});

// Pagination Schemas
export const PaginationSchema = z.object({
  limit: z.coerce.number().min(1).max(100).optional().default(50),
  offset: z.coerce.number().min(0).optional().default(0),
});

export const MessagePaginationSchema = z.object({
  limit: z.coerce.number().min(1).max(100).optional().default(50),
  before: z.string().uuid().optional(),
  after: z.string().uuid().optional(),
});

export const SearchMessagesSchema = z.object({
  query: z.string().min(1, 'Search query required'),
  limit: z.coerce.number().min(1).max(50).optional().default(20),
});
