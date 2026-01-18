// src/application/services/MessageService.ts

import type { IMessageRepository, MessagePaginationOptions } from '../../domain/repositories/IMessageRepository.js';
import type { IConversationRepository } from '../../domain/repositories/IConversationRepository.js';
import type { IEventPublisher } from '../../infrastructure/messaging/EventPublisher.js';
import { Message, MessageType } from '../../domain/entities/Message.js';
import { MessageSent, MessageEdited, MessageDeleted, ReadReceipt } from '../../domain/events/ChatEvents.js';
import {
  MessageNotFoundError,
  ConversationNotFoundError,
  NotAParticipantError,
  CannotEditMessageError,
  CannotDeleteMessageError,
  CannotSendMessageError,
  MessageTooLongError,
} from '../errors/ChatErrors.js';
import type {
  SendMessageDto,
  EditMessageDto,
  MessageResponse,
  MessageListResponse,
} from '../dtos/message.dtos.js';
import { getConfig } from '../../config/index.js';

export class MessageService {
  constructor(
    private readonly messageRepo: IMessageRepository,
    private readonly conversationRepo: IConversationRepository,
    private readonly eventPublisher: IEventPublisher
  ) { }

  async sendMessage(
    conversationId: string,
    senderId: string,
    dto: SendMessageDto
  ): Promise<MessageResponse> {
    const config = getConfig();

    // Validate message length
    if (dto.content.length > config.maxMessageLength) {
      throw new MessageTooLongError(config.maxMessageLength);
    }

    // Check conversation exists and user is participant
    const participant = await this.conversationRepo.findParticipant(conversationId, senderId);
    if (!participant) {
      throw new NotAParticipantError();
    }

    if (!participant.canSendMessages) {
      throw new CannotSendMessageError('You do not have permission to send messages in this conversation');
    }

    // Validate reply-to if provided
    if (dto.replyToId) {
      const replyTo = await this.messageRepo.findById(dto.replyToId);
      if (!replyTo || replyTo.conversationId !== conversationId) {
        throw new MessageNotFoundError(dto.replyToId);
      }
    }

    // Create and save message
    // Map string type to enum (enum values match string values)
    const messageType = dto.type
      ? MessageType[dto.type.toUpperCase() as keyof typeof MessageType] || MessageType.TEXT
      : MessageType.TEXT;

    const message = Message.create(conversationId, senderId, dto.content, {
      type: messageType,
      mediaUrl: dto.mediaUrl,
      replyToId: dto.replyToId,
    });

    await this.messageRepo.save(message);

    // Publish event for real-time delivery
    await this.eventPublisher.publishToConversation(conversationId, MessageSent({
      messageId: message.id,
      conversationId,
      senderId,
      type: message.type,
      content: message.content,
      replyToId: message.replyToId,
    }));

    return this.toMessageResponse(message);
  }

  async editMessage(
    messageId: string,
    userId: string,
    dto: EditMessageDto
  ): Promise<MessageResponse> {
    const message = await this.messageRepo.findById(messageId);
    if (!message) {
      throw new MessageNotFoundError(messageId);
    }

    if (!message.canBeEditedBy(userId)) {
      throw new CannotEditMessageError();
    }

    const config = getConfig();
    if (dto.content.length > config.maxMessageLength) {
      throw new MessageTooLongError(config.maxMessageLength);
    }

    message.edit(dto.content);
    await this.messageRepo.update(message);

    await this.eventPublisher.publishToConversation(message.conversationId, MessageEdited({
      messageId: message.id,
      conversationId: message.conversationId,
      editedBy: userId,
      newContent: dto.content,
    }));

    return this.toMessageResponse(message);
  }

  async deleteMessage(
    messageId: string,
    userId: string
  ): Promise<void> {
    const message = await this.messageRepo.findById(messageId);
    if (!message) {
      throw new MessageNotFoundError(messageId);
    }

    // Check if user can delete (owner or conversation admin)
    const participant = await this.conversationRepo.findParticipant(message.conversationId, userId);
    const isAdmin = participant?.isAdmin || false;

    if (!message.canBeDeletedBy(userId, isAdmin)) {
      throw new CannotDeleteMessageError();
    }

    message.softDelete();
    await this.messageRepo.update(message);

    await this.eventPublisher.publishToConversation(message.conversationId, MessageDeleted({
      messageId: message.id,
      conversationId: message.conversationId,
      deletedBy: userId,
    }));
  }

  async getMessages(
    conversationId: string,
    userId: string,
    options: MessagePaginationOptions
  ): Promise<MessageListResponse> {
    // Verify user is participant
    const participant = await this.conversationRepo.findParticipant(conversationId, userId);
    if (!participant) {
      throw new NotAParticipantError();
    }

    const config = getConfig();
    const result = await this.messageRepo.findByConversationId(conversationId, {
      ...options,
      limit: Math.min(options.limit, config.messagePageSize),
    });

    return {
      messages: result.messages.map(m => this.toMessageResponse(m)),
      hasMore: result.hasMore,
      nextCursor: result.nextCursor,
    };
  }

  async searchMessages(
    conversationId: string,
    userId: string,
    query: string,
    limit: number = 20
  ): Promise<MessageResponse[]> {
    const participant = await this.conversationRepo.findParticipant(conversationId, userId);
    if (!participant) {
      throw new NotAParticipantError();
    }

    const messages = await this.messageRepo.searchInConversation(conversationId, {
      query,
      limit: Math.min(limit, 50),
    });

    return messages.map(m => this.toMessageResponse(m));
  }

  async markAsRead(
    conversationId: string,
    userId: string,
    messageId: string
  ): Promise<void> {
    const participant = await this.conversationRepo.findParticipant(conversationId, userId);
    if (!participant) {
      throw new NotAParticipantError();
    }

    const message = await this.messageRepo.findById(messageId);
    if (!message || message.conversationId !== conversationId) {
      throw new MessageNotFoundError(messageId);
    }

    await this.messageRepo.markAsRead(messageId, userId);

    // Update participant's last_read_at
    participant.markAsRead(messageId);
    await this.conversationRepo.updateParticipant(participant);

    await this.eventPublisher.publishToConversation(conversationId, ReadReceipt({
      conversationId,
      userId,
      messageId,
    }));
  }

  private toMessageResponse(message: Message): MessageResponse {
    return {
      id: message.id,
      conversationId: message.conversationId,
      senderId: message.senderId,
      type: message.type,
      content: message.content,
      mediaUrl: message.mediaUrl,
      replyToId: message.replyToId,
      isEdited: message.isEdited,
      isDeleted: message.isDeleted,
      createdAt: message.createdAt,
      editedAt: message.editedAt,
    };
  }
}
