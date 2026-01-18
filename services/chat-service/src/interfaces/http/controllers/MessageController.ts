// src/interfaces/http/controllers/MessageController.ts

import type { Context } from 'hono';
import type { MessageService } from '../../../application/services/MessageService.js';
import {
  SendMessageSchema,
  EditMessageSchema,
  MessagePaginationSchema,
  SearchMessagesSchema,
  MarkAsReadSchema,
} from '../validation/schemas.js';

export class MessageController {
  constructor(private readonly messageService: MessageService) { }

  // POST /conversations/:id/messages
  async send(c: Context) {
    const userId = c.req.header('x-user-id');
    if (!userId) return c.json({ error: 'Unauthorized' }, 401);

    const conversationId = c.req.param('id');
    const body = SendMessageSchema.parse(await c.req.json());

    const message = await this.messageService.sendMessage(conversationId, userId, body);
    return c.json(message, 201);
  }

  // GET /conversations/:id/messages
  async list(c: Context) {
    const userId = c.req.header('x-user-id');
    if (!userId) return c.json({ error: 'Unauthorized' }, 401);

    const conversationId = c.req.param('id');
    const options = MessagePaginationSchema.parse({
      limit: c.req.query('limit'),
      before: c.req.query('before'),
      after: c.req.query('after'),
    });

    const result = await this.messageService.getMessages(conversationId, userId, options);
    return c.json(result);
  }

  // GET /conversations/:id/messages/search
  async search(c: Context) {
    const userId = c.req.header('x-user-id');
    if (!userId) return c.json({ error: 'Unauthorized' }, 401);

    const conversationId = c.req.param('id');
    const { query, limit } = SearchMessagesSchema.parse({
      query: c.req.query('query'),
      limit: c.req.query('limit'),
    });

    const messages = await this.messageService.searchMessages(conversationId, userId, query, limit);
    return c.json({ messages });
  }

  // PUT /messages/:id
  async edit(c: Context) {
    const userId = c.req.header('x-user-id');
    if (!userId) return c.json({ error: 'Unauthorized' }, 401);

    const messageId = c.req.param('id');
    const body = EditMessageSchema.parse(await c.req.json());

    const message = await this.messageService.editMessage(messageId, userId, body);
    return c.json(message);
  }

  // DELETE /messages/:id
  async delete(c: Context) {
    const userId = c.req.header('x-user-id');
    if (!userId) return c.json({ error: 'Unauthorized' }, 401);

    const messageId = c.req.param('id');
    await this.messageService.deleteMessage(messageId, userId);
    return c.json({ message: 'Message deleted' });
  }

  // POST /conversations/:id/read
  async markAsRead(c: Context) {
    const userId = c.req.header('x-user-id');
    if (!userId) return c.json({ error: 'Unauthorized' }, 401);

    const conversationId = c.req.param('id');
    const { messageId } = MarkAsReadSchema.parse(await c.req.json());

    await this.messageService.markAsRead(conversationId, userId, messageId);
    return c.json({ message: 'Marked as read' });
  }
}
