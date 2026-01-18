// src/interfaces/http/controllers/ConversationController.ts

import type { Context } from 'hono';
import type { ConversationService } from '../../../application/services/ConversationService.js';
import {
  CreateDirectConversationSchema,
  CreateGroupConversationSchema,
  UpdateConversationSchema,
  AddParticipantSchema,
  PaginationSchema,
} from '../validation/schemas.js';
import { ParticipantRole } from '../../../domain/entities/Participant.js';

export class ConversationController {
  constructor(private readonly conversationService: ConversationService) { }

  // POST /conversations/direct
  async createDirect(c: Context) {
    const userId = c.req.header('x-user-id');
    if (!userId) return c.json({ error: 'Unauthorized' }, 401);

    const body = CreateDirectConversationSchema.parse(await c.req.json());
    const conversation = await this.conversationService.createDirectConversation(userId, body);
    return c.json(conversation, 201);
  }

  // POST /conversations/group
  async createGroup(c: Context) {
    const userId = c.req.header('x-user-id');
    if (!userId) return c.json({ error: 'Unauthorized' }, 401);

    const body = CreateGroupConversationSchema.parse(await c.req.json());
    const conversation = await this.conversationService.createGroupConversation(userId, body);
    return c.json(conversation, 201);
  }

  // GET /conversations
  async list(c: Context) {
    const userId = c.req.header('x-user-id');
    if (!userId) return c.json({ error: 'Unauthorized' }, 401);

    const { limit, offset } = PaginationSchema.parse({
      limit: c.req.query('limit'),
      offset: c.req.query('offset'),
    });

    const result = await this.conversationService.listUserConversations(userId, { limit, offset });
    return c.json(result);
  }

  // GET /conversations/:id
  async get(c: Context) {
    const userId = c.req.header('x-user-id');
    if (!userId) return c.json({ error: 'Unauthorized' }, 401);

    const conversationId = c.req.param('id');
    const conversation = await this.conversationService.getConversation(conversationId, userId);
    return c.json(conversation);
  }

  // POST /conversations/:id/participants
  async addParticipant(c: Context) {
    const userId = c.req.header('x-user-id');
    if (!userId) return c.json({ error: 'Unauthorized' }, 401);

    const conversationId = c.req.param('id');
    const body = AddParticipantSchema.parse(await c.req.json());

    const participant = await this.conversationService.addParticipant(
      conversationId,
      userId,
      body.userId,
      body.role as ParticipantRole || ParticipantRole.MEMBER
    );
    return c.json(participant, 201);
  }

  // DELETE /conversations/:id/participants/:userId
  async removeParticipant(c: Context) {
    const userId = c.req.header('x-user-id');
    if (!userId) return c.json({ error: 'Unauthorized' }, 401);

    const conversationId = c.req.param('id');
    const targetUserId = c.req.param('userId');

    await this.conversationService.removeParticipant(conversationId, userId, targetUserId);
    return c.json({ message: 'Participant removed' });
  }

  // DELETE /conversations/:id (leave conversation)
  async leave(c: Context) {
    const userId = c.req.header('x-user-id');
    if (!userId) return c.json({ error: 'Unauthorized' }, 401);

    const conversationId = c.req.param('id');
    await this.conversationService.removeParticipant(conversationId, userId, userId);
    return c.json({ message: 'Left conversation' });
  }
}
