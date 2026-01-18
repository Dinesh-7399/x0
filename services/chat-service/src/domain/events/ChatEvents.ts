// src/domain/events/ChatEvents.ts

import { ConversationType } from '../entities/Conversation.js';
import { MessageType } from '../entities/Message.js';

// Base event interface
export interface ChatDomainEvent {
  eventId: string;
  eventType: string;
  timestamp: Date;
  payload: unknown;
}

// Event factory
function createEvent<T>(type: string, payload: T): ChatDomainEvent {
  return {
    eventId: crypto.randomUUID(),
    eventType: type,
    timestamp: new Date(),
    payload,
  };
}

// Message Events
export interface MessageSentPayload {
  messageId: string;
  conversationId: string;
  senderId: string;
  type: MessageType;
  content: string;
  replyToId?: string;
}

export const MessageSent = (payload: MessageSentPayload) =>
  createEvent('chat.message.sent', payload);

export interface MessageEditedPayload {
  messageId: string;
  conversationId: string;
  editedBy: string;
  newContent: string;
}

export const MessageEdited = (payload: MessageEditedPayload) =>
  createEvent('chat.message.edited', payload);

export interface MessageDeletedPayload {
  messageId: string;
  conversationId: string;
  deletedBy: string;
}

export const MessageDeleted = (payload: MessageDeletedPayload) =>
  createEvent('chat.message.deleted', payload);

// Conversation Events
export interface ConversationCreatedPayload {
  conversationId: string;
  type: ConversationType;
  createdBy: string;
  participants: string[];
  name?: string;
  gymId?: string;
}

export const ConversationCreated = (payload: ConversationCreatedPayload) =>
  createEvent('chat.conversation.created', payload);

// Participant Events
export interface ParticipantJoinedPayload {
  conversationId: string;
  userId: string;
  addedBy: string;
}

export const ParticipantJoined = (payload: ParticipantJoinedPayload) =>
  createEvent('chat.participant.joined', payload);

export interface ParticipantLeftPayload {
  conversationId: string;
  userId: string;
  reason: 'left' | 'removed' | 'kicked';
}

export const ParticipantLeft = (payload: ParticipantLeftPayload) =>
  createEvent('chat.participant.left', payload);

// Typing Events (real-time only, not persisted)
export interface TypingPayload {
  conversationId: string;
  userId: string;
  isTyping: boolean;
}

export const TypingUpdate = (payload: TypingPayload) =>
  createEvent('chat.typing.update', payload);

// Read Receipt Events
export interface ReadReceiptPayload {
  conversationId: string;
  userId: string;
  messageId: string;
}

export const ReadReceipt = (payload: ReadReceiptPayload) =>
  createEvent('chat.read.receipt', payload);
