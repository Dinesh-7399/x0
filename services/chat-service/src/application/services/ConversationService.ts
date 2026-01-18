// src/application/services/ConversationService.ts

import type { IConversationRepository, PaginationOptions } from '../../domain/repositories/IConversationRepository.js';
import type { IEventPublisher } from '../../infrastructure/messaging/EventPublisher.js';
import { Conversation, ConversationType } from '../../domain/entities/Conversation.js';
import { Participant, ParticipantRole } from '../../domain/entities/Participant.js';
import { ConversationCreated, ParticipantJoined, ParticipantLeft } from '../../domain/events/ChatEvents.js';
import {
  ConversationNotFoundError,
  NotAParticipantError,
  MaxParticipantsReachedError,
  AlreadyParticipantError,
  InsufficientPermissionsError,
  CannotLeaveAsOwnerError,
} from '../errors/ChatErrors.js';
import type {
  CreateDirectConversationDto,
  CreateGroupConversationDto,
  ConversationResponse,
  ConversationListResponse,
  ParticipantResponse,
} from '../dtos/conversation.dtos.js';
import { getConfig } from '../../config/index.js';

export class ConversationService {
  constructor(
    private readonly conversationRepo: IConversationRepository,
    private readonly eventPublisher: IEventPublisher
  ) { }

  // === Conversation Creation ===

  async createDirectConversation(
    userId: string,
    dto: CreateDirectConversationDto
  ): Promise<ConversationResponse> {
    // Check if direct conversation already exists
    const existing = await this.conversationRepo.findDirectConversation(userId, dto.targetUserId);
    if (existing) {
      const withParticipants = await this.conversationRepo.findByIdWithParticipants(existing.id);
      return this.toConversationResponse(withParticipants!);
    }

    // Create new direct conversation
    const conversation = Conversation.create(userId, ConversationType.DIRECT);
    await this.conversationRepo.save(conversation);

    // Add both participants
    const ownerParticipant = Participant.createOwner(conversation.id, userId);
    const targetParticipant = Participant.create(conversation.id, dto.targetUserId);

    await this.conversationRepo.addParticipant(ownerParticipant);
    await this.conversationRepo.addParticipant(targetParticipant);

    // Publish event
    await this.eventPublisher.publish(ConversationCreated({
      conversationId: conversation.id,
      type: conversation.type,
      createdBy: userId,
      participants: [userId, dto.targetUserId],
    }));

    const result = await this.conversationRepo.findByIdWithParticipants(conversation.id);
    return this.toConversationResponse(result!);
  }

  async createGroupConversation(
    userId: string,
    dto: CreateGroupConversationDto
  ): Promise<ConversationResponse> {
    const config = getConfig();

    if (dto.participantIds.length + 1 > config.maxGroupParticipants) {
      throw new MaxParticipantsReachedError(config.maxGroupParticipants);
    }

    const conversation = Conversation.create(userId, ConversationType.GROUP, {
      name: dto.name,
      avatarUrl: dto.avatarUrl,
      gymId: dto.gymId,
    });
    await this.conversationRepo.save(conversation);

    // Add creator as owner
    const ownerParticipant = Participant.createOwner(conversation.id, userId);
    await this.conversationRepo.addParticipant(ownerParticipant);

    // Add other participants
    for (const participantId of dto.participantIds) {
      if (participantId !== userId) {
        const participant = Participant.create(conversation.id, participantId);
        await this.conversationRepo.addParticipant(participant);
      }
    }

    // Publish event
    await this.eventPublisher.publish(ConversationCreated({
      conversationId: conversation.id,
      type: conversation.type,
      createdBy: userId,
      participants: [userId, ...dto.participantIds.filter(id => id !== userId)],
      name: dto.name,
      gymId: dto.gymId,
    }));

    const result = await this.conversationRepo.findByIdWithParticipants(conversation.id);
    return this.toConversationResponse(result!);
  }

  // === Conversation Retrieval ===

  async getConversation(conversationId: string, userId: string): Promise<ConversationResponse> {
    const data = await this.conversationRepo.findByIdWithParticipants(conversationId);
    if (!data) {
      throw new ConversationNotFoundError(conversationId);
    }

    // Check if user is participant
    const isParticipant = data.participants.some(p => p.userId === userId && p.isActive);
    if (!isParticipant) {
      throw new NotAParticipantError();
    }

    return this.toConversationResponse(data);
  }

  async listUserConversations(
    userId: string,
    pagination: PaginationOptions
  ): Promise<ConversationListResponse> {
    const result = await this.conversationRepo.findByUserId(userId, pagination);

    return {
      conversations: result.conversations.map(c => this.toConversationResponse(c)),
      total: result.total,
      limit: pagination.limit,
      offset: pagination.offset,
    };
  }

  // === Participant Management ===

  async addParticipant(
    conversationId: string,
    userId: string,
    targetUserId: string,
    role: ParticipantRole = ParticipantRole.MEMBER
  ): Promise<ParticipantResponse> {
    const data = await this.conversationRepo.findByIdWithParticipants(conversationId);
    if (!data) throw new ConversationNotFoundError(conversationId);

    // Check if requester is admin
    const requester = data.participants.find(p => p.userId === userId && p.isActive);
    if (!requester || !requester.isAdmin) {
      throw new InsufficientPermissionsError('add participants');
    }

    // Check if target already exists
    const existingParticipant = await this.conversationRepo.findParticipant(conversationId, targetUserId);
    if (existingParticipant && existingParticipant.isActive) {
      throw new AlreadyParticipantError();
    }

    // Check max participants
    const config = getConfig();
    const count = await this.conversationRepo.getParticipantCount(conversationId);
    if (count >= config.maxGroupParticipants) {
      throw new MaxParticipantsReachedError(config.maxGroupParticipants);
    }

    const participant = Participant.create(conversationId, targetUserId, role);
    await this.conversationRepo.addParticipant(participant);

    await this.eventPublisher.publishToConversation(conversationId, ParticipantJoined({
      conversationId,
      userId: targetUserId,
      addedBy: userId,
    }));

    return this.toParticipantResponse(participant);
  }

  async removeParticipant(
    conversationId: string,
    userId: string,
    targetUserId: string
  ): Promise<void> {
    const data = await this.conversationRepo.findByIdWithParticipants(conversationId);
    if (!data) throw new ConversationNotFoundError(conversationId);

    const requester = data.participants.find(p => p.userId === userId && p.isActive);
    if (!requester) throw new NotAParticipantError();

    const target = data.participants.find(p => p.userId === targetUserId && p.isActive);
    if (!target) throw new NotAParticipantError();

    // Can only remove if admin OR removing self
    const canRemove = requester.isAdmin || userId === targetUserId;
    if (!canRemove) {
      throw new InsufficientPermissionsError('remove participants');
    }

    // Owner cannot be removed (must transfer ownership first)
    if (target.isOwner) {
      throw new CannotLeaveAsOwnerError();
    }

    await this.conversationRepo.removeParticipant(conversationId, targetUserId);

    await this.eventPublisher.publishToConversation(conversationId, ParticipantLeft({
      conversationId,
      userId: targetUserId,
      reason: userId === targetUserId ? 'left' : 'removed',
    }));
  }

  // === Helpers ===

  private toConversationResponse(data: {
    conversation: Conversation;
    participants: Participant[];
    lastMessage?: { id: string; content: string; senderId: string; createdAt: Date };
    unreadCount: number;
  }): ConversationResponse {
    return {
      id: data.conversation.id,
      type: data.conversation.type,
      name: data.conversation.name,
      avatarUrl: data.conversation.avatarUrl,
      createdBy: data.conversation.createdBy,
      gymId: data.conversation.gymId,
      createdAt: data.conversation.createdAt,
      updatedAt: data.conversation.updatedAt,
      participants: data.participants.map(p => this.toParticipantResponse(p)),
      lastMessage: data.lastMessage,
      unreadCount: data.unreadCount,
    };
  }

  private toParticipantResponse(p: Participant): ParticipantResponse {
    return {
      id: p.id,
      userId: p.userId,
      role: p.role,
      nickname: p.nickname,
      joinedAt: p.joinedAt,
      isActive: p.isActive,
    };
  }
}
