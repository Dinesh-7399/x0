// src/infrastructure/container/Container.ts

export class Container {
  private instances = new Map<string, unknown>();
  private factories = new Map<string, () => unknown>();

  register<T>(key: string, factory: () => T): void {
    this.factories.set(key, factory);
  }

  registerInstance<T>(key: string, instance: T): void {
    this.instances.set(key, instance);
  }

  resolve<T>(key: string): T {
    // Check if already instantiated (singleton)
    if (this.instances.has(key)) {
      return this.instances.get(key) as T;
    }

    // Check if factory exists
    const factory = this.factories.get(key);
    if (!factory) {
      throw new Error(`No registration found for key: ${key}`);
    }

    // Create instance and cache it (singleton by default)
    const instance = factory() as T;
    this.instances.set(key, instance);
    return instance;
  }

  has(key: string): boolean {
    return this.instances.has(key) || this.factories.has(key);
  }
}

// Service keys
export const ServiceKeys = {
  // Repositories
  ConversationRepository: 'ConversationRepository',
  MessageRepository: 'MessageRepository',

  // Services
  ConversationService: 'ConversationService',
  MessageService: 'MessageService',
  PresenceService: 'PresenceService',

  // Controllers
  ConversationController: 'ConversationController',
  MessageController: 'MessageController',

  // Infrastructure
  EventPublisher: 'EventPublisher',
  WebSocketManager: 'WebSocketManager',
} as const;
