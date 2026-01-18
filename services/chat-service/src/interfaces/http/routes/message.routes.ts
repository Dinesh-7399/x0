// src/interfaces/http/routes/message.routes.ts

import { Hono } from 'hono';
import type { MessageController } from '../controllers/MessageController.js';

export function createMessageRoutes(controller: MessageController): Hono {
  const router = new Hono();

  // Message operations on messages directly
  router.put('/:id', (c) => controller.edit(c));
  router.delete('/:id', (c) => controller.delete(c));

  return router;
}

export function createConversationMessageRoutes(controller: MessageController): Hono {
  const router = new Hono();

  // Messages within a conversation
  router.get('/:id/messages', (c) => controller.list(c));
  router.get('/:id/messages/search', (c) => controller.search(c));
  router.post('/:id/messages', (c) => controller.send(c));
  router.post('/:id/read', (c) => controller.markAsRead(c));

  return router;
}
