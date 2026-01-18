// tests/unit/services/MessageService.test.ts

import { describe, it, expect, beforeEach, mock } from 'bun:test';
import { MessageService } from '../../../src/application/services/MessageService.js';
import { Message, MessageType } from '../../../src/domain/entities/Message.js';
import { Participant, ParticipantRole } from '../../../src/domain/entities/Participant.js';
import {
  CannotSendMessageError,
  NotAParticipantError,
  MessageTooLongError
} from '../../../src/application/errors/ChatErrors.js';

const mockMessageRepo = {
  save: mock(() => Promise.resolve()),
  findById: mock(() => Promise.resolve(null as any)),
  update: mock(() => Promise.resolve()),
  findByConversationId: mock(() => Promise.resolve({ messages: [], hasMore: false } as any)),
  markAsRead: mock(() => Promise.resolve()),
};

const mockConvRepo = {
  findParticipant: mock(() => Promise.resolve(null as any)),
  updateParticipant: mock(() => Promise.resolve()),
};

const mockEventPublisher = {
  publish: mock(() => Promise.resolve()),
  publishToConversation: mock(() => Promise.resolve()),
};

describe('MessageService', () => {
  let service: MessageService;

  beforeEach(() => {
    service = new MessageService(
      mockMessageRepo as any,
      mockConvRepo as any,
      mockEventPublisher as any
    );
    mock.restore();
  });

  describe('sendMessage', () => {
    it('should send message if user is participant', async () => {
      const participant = Participant.create('conv-1', 'user-1', ParticipantRole.MEMBER);
      mockConvRepo.findParticipant.mockResolvedValue(participant);

      const result = await service.sendMessage('conv-1', 'user-1', {
        content: 'Hello world',
        type: 'text'
      });

      expect(result).toBeDefined();
      expect(result.content).toBe('Hello world');
      expect(mockMessageRepo.save).toHaveBeenCalled();
      expect(mockEventPublisher.publishToConversation).toHaveBeenCalled();
    });

    it('should throw if user is not participant', async () => {
      mockConvRepo.findParticipant.mockResolvedValue(null);

      await expect(
        service.sendMessage('conv-1', 'user-1', { content: 'Hi' })
      ).rejects.toThrow(NotAParticipantError);
    });

    it('should throw if message is too long', async () => {
      const longContent = 'a'.repeat(10001); // Config default is 10000

      await expect(
        service.sendMessage('conv-1', 'user-1', { content: longContent })
      ).rejects.toThrow(MessageTooLongError);
    });

    it('should throw if user is readonly', async () => {
      const participant = Participant.create('conv-1', 'user-1', ParticipantRole.READONLY);
      mockConvRepo.findParticipant.mockResolvedValue(participant);

      await expect(
        service.sendMessage('conv-1', 'user-1', { content: 'Hi' })
      ).rejects.toThrow(CannotSendMessageError);
    });
  });

  describe('markAsRead', () => {
    it('should mark message as read', async () => {
      const participant = Participant.create('conv-1', 'user-1');
      mockConvRepo.findParticipant.mockResolvedValue(participant);

      const message = Message.create('conv-1', 'user-2', 'Hi');
      mockMessageRepo.findById.mockResolvedValue(message);

      await service.markAsRead('conv-1', 'user-1', message.id);

      expect(mockMessageRepo.markAsRead).toHaveBeenCalledWith(message.id, 'user-1');
      expect(mockConvRepo.updateParticipant).toHaveBeenCalled();
      expect(mockEventPublisher.publishToConversation).toHaveBeenCalled();
    });
  });
});
