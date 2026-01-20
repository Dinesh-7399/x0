// src/infrastructure/cache/redis.ts

import { createClient, type RedisClientType } from "redis";
import { getConfig } from "../../config/index.js";

let client: RedisClientType | null = null;

export async function getRedisClient(): Promise<RedisClientType> {
  if (!client) {
    const config = getConfig();
    client = createClient({
      url: config.redisUrl,
    });

    client.on("error", (err) => {
      console.error("Redis client error:", err);
    });

    await client.connect();
  }
  return client;
}

export async function closeRedis(): Promise<void> {
  if (client) {
    await client.quit();
    client = null;
  }
}

// Cache helpers
export async function cacheGet<T>(key: string): Promise<T | null> {
  const redis = await getRedisClient();
  const value = await redis.get(key);
  if (!value) return null;
  try {
    return JSON.parse(value) as T;
  } catch {
    return null;
  }
}

export async function cacheSet<T>(
  key: string,
  value: T,
  ttlSeconds?: number
): Promise<void> {
  const redis = await getRedisClient();
  const config = getConfig();
  const ttl = ttlSeconds ?? config.cacheTtlSeconds;
  await redis.setEx(key, ttl, JSON.stringify(value));
}

export async function cacheDelete(key: string): Promise<void> {
  const redis = await getRedisClient();
  await redis.del(key);
}

export async function cacheDeletePattern(pattern: string): Promise<void> {
  const redis = await getRedisClient();
  const keys = await redis.keys(pattern);
  if (keys.length > 0) {
    await redis.del(keys);
  }
}

export async function checkRedisConnection(): Promise<boolean> {
  try {
    const redis = await getRedisClient();
    await redis.ping();
    return true;
  } catch {
    return false;
  }
}

// Analytics-specific cache keys
export const CacheKeys = {
  metric: (type: string, gymId: string | null, period: string) =>
    `analytics:metrics:${type}:${gymId || "platform"}:${period}`,
  report: (type: string, gymId: string | null) =>
    `analytics:reports:${type}:${gymId || "platform"}`,
  realtime: (gymId: string) => `analytics:realtime:${gymId}`,
  dashboard: (dashboardId: string) => `analytics:dashboard:${dashboardId}:data`,
};
