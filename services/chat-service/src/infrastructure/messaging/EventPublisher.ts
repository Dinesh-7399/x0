// src/infrastructure/messaging/EventPublisher.ts

import type { ChatDomainEvent } from '../../domain/events/ChatEvents.js';
import { getConfig } from '../../config/index.js';

export interface IEventPublisher {
  publish(event: ChatDomainEvent): Promise<void>;
  publishToConversation(conversationId: string, event: ChatDomainEvent): Promise<void>;
}

export class EventPublisher implements IEventPublisher {
  // TODO: Integrate with Redis Streams for production
  // For now, in-memory event logging for development

  private subscribers: Map<string, ((event: ChatDomainEvent) => void)[]> = new Map();

  async publish(event: ChatDomainEvent): Promise<void> {
    const config = getConfig();

    if (config.nodeEnv === 'development') {
      console.log(`[Event Published] ${event.eventType}:`, JSON.stringify(event.payload, null, 2));
    }

    // Notify local subscribers
    const allSubscribers = this.subscribers.get('*') || [];
    const typeSubscribers = this.subscribers.get(event.eventType) || [];

    [...allSubscribers, ...typeSubscribers].forEach(callback => {
      try {
        callback(event);
      } catch (err) {
        console.error('Event subscriber error:', err);
      }
    });

    // TODO: In production, publish to Redis Streams
    // await redis.xadd(`events:${event.eventType}`, '*', 'data', JSON.stringify(event));
  }

  async publishToConversation(conversationId: string, event: ChatDomainEvent): Promise<void> {
    // Publish to conversation-specific channel (for WebSocket broadcast)
    const config = getConfig();

    if (config.nodeEnv === 'development') {
      console.log(`[Conversation Event] conv:${conversationId} - ${event.eventType}`);
    }

    // TODO: In production, publish to Redis Pub/Sub for WebSocket distribution
    // await redis.publish(`chat:conv:${conversationId}`, JSON.stringify(event));

    await this.publish(event);
  }

  // For testing and internal subscriptions
  subscribe(eventType: string | '*', callback: (event: ChatDomainEvent) => void): () => void {
    if (!this.subscribers.has(eventType)) {
      this.subscribers.set(eventType, []);
    }
    this.subscribers.get(eventType)!.push(callback);

    // Return unsubscribe function
    return () => {
      const subs = this.subscribers.get(eventType) || [];
      const index = subs.indexOf(callback);
      if (index > -1) {
        subs.splice(index, 1);
      }
    };
  }
}
