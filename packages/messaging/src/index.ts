// @gymato/messaging - Message queue utilities
// Placeholder implementations - actual connections need RabbitMQ/Redis

export interface Message<T = unknown> {
  id: string;
  type: string;
  payload: T;
  timestamp: string;
  correlationId?: string;
  metadata?: Record<string, string>;
}

export interface Publisher {
  publish: <T>(type: string, payload: T, options?: PublishOptions) => Promise<void>;
  close: () => Promise<void>;
}

export interface Subscriber {
  subscribe: <T>(type: string, handler: (message: Message<T>) => Promise<void>) => Promise<void>;
  unsubscribe: (type: string) => Promise<void>;
  close: () => Promise<void>;
}

export interface PublishOptions {
  correlationId?: string;
  delay?: number;
  priority?: number;
}

/**
 * Create a simple in-memory event bus (for development/testing)
 */
export function createInMemoryBus(): Publisher & Subscriber {
  const handlers = new Map<string, Array<(message: Message) => Promise<void>>>();

  return {
    async publish<T>(type: string, payload: T, options?: PublishOptions): Promise<void> {
      const message: Message<T> = {
        id: `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
        type,
        payload,
        timestamp: new Date().toISOString(),
        correlationId: options?.correlationId,
      };

      const typeHandlers = handlers.get(type) ?? [];
      await Promise.all(typeHandlers.map((h) => h(message as Message)));
    },

    async subscribe<T>(
      type: string,
      handler: (message: Message<T>) => Promise<void>
    ): Promise<void> {
      const typeHandlers = handlers.get(type) ?? [];
      typeHandlers.push(handler as (message: Message) => Promise<void>);
      handlers.set(type, typeHandlers);
    },

    async unsubscribe(type: string): Promise<void> {
      handlers.delete(type);
    },

    async close(): Promise<void> {
      handlers.clear();
    },
  };
}

/**
 * Common event types used across services
 */
export const EventTypes = {
  // User events
  USER_REGISTERED: 'user.registered',
  USER_UPDATED: 'user.updated',
  USER_DELETED: 'user.deleted',

  // Auth events
  USER_LOGGED_IN: 'auth.login',
  USER_LOGGED_OUT: 'auth.logout',

  // Gym events
  GYM_CREATED: 'gym.created',
  GYM_UPDATED: 'gym.updated',

  // Membership events
  MEMBERSHIP_CREATED: 'membership.created',
  MEMBERSHIP_EXPIRED: 'membership.expired',

  // Notification events
  NOTIFICATION_SEND: 'notification.send',
} as const;

export type EventType = typeof EventTypes[keyof typeof EventTypes];
