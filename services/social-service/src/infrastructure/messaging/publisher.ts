import { createRedisBus, Publisher } from '@gymato/messaging';
import { getConfig } from '../../config/index.js';
import { SocialEvent } from '../../domain/events/SocialEvents.js';

let bus: Publisher | null = null;

export const getEventBus = (): Publisher => {
  if (!bus) {
    const config = getConfig();
    // Default to a safe fallback if env missing? validation ensures it.
    const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379';
    bus = createRedisBus(redisUrl);
  }
  return bus;
};

export const publishSocialEvent = async (event: SocialEvent) => {
  const publisher = getEventBus();
  await publisher.publish(event.eventType, event.payload);
  console.log(`[SocialService] Published ${event.eventType}`);
};
