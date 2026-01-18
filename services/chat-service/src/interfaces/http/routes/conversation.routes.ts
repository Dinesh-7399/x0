// src/interfaces/http/routes/conversation.routes.ts

import { Hono } from 'hono';
import type { ConversationController } from '../controllers/ConversationController.js';

export function createConversationRoutes(controller: ConversationController): Hono {
  const router = new Hono();

  // Create conversations
  router.post('/direct', (c) => controller.createDirect(c));
  router.post('/group', (c) => controller.createGroup(c));

  // List user's conversations
  router.get('/', (c) => controller.list(c));
  router.get('', (c) => controller.list(c));

  // Get single conversation
  router.get('/:id', (c) => controller.get(c));

  // Leave conversation
  router.delete('/:id', (c) => controller.leave(c));

  // Participant management
  router.post('/:id/participants', (c) => controller.addParticipant(c));
  router.delete('/:id/participants/:userId', (c) => controller.removeParticipant(c));

  return router;
}
