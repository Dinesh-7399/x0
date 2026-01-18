// tests/unit/services/ConversationService.test.ts

import { describe, it, expect, beforeEach, mock } from 'bun:test';
import { ConversationService } from '../../../src/application/services/ConversationService.js';
import { Conversation, ConversationType } from '../../../src/domain/entities/Conversation.js';
import { Participant, ParticipantRole } from '../../../src/domain/entities/Participant.js';
import { MaxParticipantsReachedError } from '../../../src/application/errors/ChatErrors.js';

// Mocks
const mockRepo = {
  findDirectConversation: mock(() => Promise.resolve(null as any)),
  findByIdWithParticipants: mock(() => Promise.resolve(null as any)),
  save: mock(() => Promise.resolve()),
  addParticipant: mock(() => Promise.resolve()),
  findParticipant: mock(() => Promise.resolve(null as any)),
  getParticipantCount: mock(() => Promise.resolve(0)),
  removeParticipant: mock(() => Promise.resolve()),
  findByUserId: mock(() => Promise.resolve({ conversations: [], total: 0 })),
};

const mockEventPublisher = {
  publish: mock(() => Promise.resolve()),
  publishToConversation: mock(() => Promise.resolve()),
};

describe('ConversationService', () => {
  let service: ConversationService;

  beforeEach(() => {
    service = new ConversationService(mockRepo as any, mockEventPublisher as any);
    Object.values(mockRepo).forEach(m => m.mockClear());
    Object.values(mockEventPublisher).forEach(m => m.mockClear());
  });

  describe('createDirectConversation', () => {
    it('should create a new direct conversation if none exists', async () => {
      mockRepo.findDirectConversation.mockResolvedValue(null);
      mockRepo.save.mockResolvedValue(undefined);

      // Mock finding the created conversation to return it
      const newConv = Conversation.create('user1', ConversationType.DIRECT);
      const owner = Participant.createOwner(newConv.id, 'user1');
      const target = Participant.create(newConv.id, 'user2');

      mockRepo.findByIdWithParticipants.mockResolvedValue({
        conversation: newConv,
        participants: [owner, target],
        unreadCount: 0
      });

      const result = await service.createDirectConversation('user1', { targetUserId: 'user2' });

      expect(result).toBeDefined();
      expect(mockRepo.save).toHaveBeenCalled();
      expect(mockRepo.addParticipant).toHaveBeenCalledTimes(2);
      expect(mockEventPublisher.publish).toHaveBeenCalled();
    });

    it('should return existing conversation if one exists', async () => {
      const existing = Conversation.create('user1', ConversationType.DIRECT);
      mockRepo.findDirectConversation.mockResolvedValue(existing);

      mockRepo.findByIdWithParticipants.mockResolvedValue({
        conversation: existing,
        participants: [],
        unreadCount: 0
      });

      await service.createDirectConversation('user1', { targetUserId: 'user2' });

      expect(mockRepo.save).not.toHaveBeenCalled();
    });
  });

  describe('createGroupConversation', () => {
    it('should create group with participants', async () => {
      mockRepo.save.mockResolvedValue(undefined);

      // Mock return
      const conv = Conversation.create('user1', ConversationType.GROUP);
      mockRepo.findByIdWithParticipants.mockResolvedValue({
        conversation: conv,
        participants: [],
        unreadCount: 0
      });

      await service.createGroupConversation('user1', {
        name: 'Gym Buddies',
        participantIds: ['user2', 'user3']
      });

      expect(mockRepo.save).toHaveBeenCalled();
      // Owner + 2 participants
      expect(mockRepo.addParticipant).toHaveBeenCalledTimes(3);
    });

    it('should throw if max participants reached', async () => {
      const manyUsers = Array(300).fill('user');

      await expect(
        service.createGroupConversation('user1', {
          name: 'Huge Group',
          participantIds: manyUsers
        })
      ).rejects.toThrow(MaxParticipantsReachedError);
    });
  });
});
