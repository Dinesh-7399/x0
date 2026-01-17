// src/infrastructure/messaging/publisher.ts

import { createClient, RedisClientType } from 'redis';
import { getConfig } from '../../config/index.js';

const config = getConfig();

let redisClient: RedisClientType | null = null;

async function getRedisClient(): Promise<RedisClientType> {
  if (redisClient && redisClient.isOpen) {
    return redisClient;
  }

  redisClient = createClient({ url: config.redisUrl });
  redisClient.on('error', (err: Error) => console.error('[Redis] Client Error:', err));
  await redisClient.connect();
  return redisClient;
}

export async function publish(channel: string, message: any): Promise<void> {
  try {
    const client = await getRedisClient();
    const payload = JSON.stringify({
      ...message,
      timestamp: new Date().toISOString(),
      source: 'gym-service',
    });
    await client.publish(channel, payload);
    console.log(`[Messaging] Published to ${channel}`);
  } catch (error) {
    console.error('[Messaging] Failed to publish:', error);
  }
}

export async function closeRedis(): Promise<void> {
  if (redisClient) {
    await redisClient.quit();
    redisClient = null;
  }
}
