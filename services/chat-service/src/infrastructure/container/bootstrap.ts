// src/infrastructure/container/bootstrap.ts

import { Container, ServiceKeys } from './Container.js';
import { PostgresConversationRepository } from '../database/PostgresConversationRepository.js';
import { PostgresMessageRepository } from '../database/PostgresMessageRepository.js';
import { ConversationService } from '../../application/services/ConversationService.js';
import { MessageService } from '../../application/services/MessageService.js';
import { ConversationController } from '../../interfaces/http/controllers/ConversationController.js';
import { MessageController } from '../../interfaces/http/controllers/MessageController.js';
import { EventPublisher } from '../messaging/EventPublisher.js';

export function bootstrap(): Container {
  const container = new Container();

  // Register repositories
  container.register(ServiceKeys.ConversationRepository, () =>
    new PostgresConversationRepository()
  );

  container.register(ServiceKeys.MessageRepository, () =>
    new PostgresMessageRepository()
  );

  // Register event publisher
  container.register(ServiceKeys.EventPublisher, () =>
    new EventPublisher()
  );

  // Register services
  container.register(ServiceKeys.ConversationService, () =>
    new ConversationService(
      container.resolve(ServiceKeys.ConversationRepository),
      container.resolve(ServiceKeys.EventPublisher)
    )
  );

  container.register(ServiceKeys.MessageService, () =>
    new MessageService(
      container.resolve(ServiceKeys.MessageRepository),
      container.resolve(ServiceKeys.ConversationRepository),
      container.resolve(ServiceKeys.EventPublisher)
    )
  );

  // Register controllers
  container.register(ServiceKeys.ConversationController, () =>
    new ConversationController(
      container.resolve(ServiceKeys.ConversationService)
    )
  );

  container.register(ServiceKeys.MessageController, () =>
    new MessageController(
      container.resolve(ServiceKeys.MessageService)
    )
  );

  return container;
}
