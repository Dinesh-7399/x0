// src/infrastructure/services/RateLimiterService.ts

import type { Context } from 'hono';

/**
 * Rate Limit Configuration
 */
export interface RateLimitConfig {
  windowMs: number;      // Time window in milliseconds
  maxRequests: number;   // Max requests per window
  keyPrefix?: string;    // Redis key prefix
  skipFailedRequests?: boolean;
  handler?: (c: Context) => Response;
}

/**
 * Rate Limit Store Interface (for DI)
 */
export interface IRateLimitStore {
  increment(key: string, windowMs: number): Promise<{ count: number; resetTime: number }>;
  reset(key: string): Promise<void>;
}

/**
 * In-Memory Rate Limit Store
 * 
 * Good for single-instance deployments.
 * For distributed systems, use Redis.
 */
export class InMemoryRateLimitStore implements IRateLimitStore {
  private store: Map<string, { count: number; resetTime: number }> = new Map();
  private cleanupInterval: Timer;

  constructor() {
    // Cleanup expired entries every minute
    this.cleanupInterval = setInterval(() => this.cleanup(), 60000);
  }

  async increment(key: string, windowMs: number): Promise<{ count: number; resetTime: number }> {
    const now = Date.now();
    const entry = this.store.get(key);

    if (entry && entry.resetTime > now) {
      // Window still active
      entry.count++;
      return { count: entry.count, resetTime: entry.resetTime };
    }

    // New window
    const newEntry = { count: 1, resetTime: now + windowMs };
    this.store.set(key, newEntry);
    return newEntry;
  }

  async reset(key: string): Promise<void> {
    this.store.delete(key);
  }

  private cleanup(): void {
    const now = Date.now();
    for (const [key, entry] of this.store.entries()) {
      if (entry.resetTime <= now) {
        this.store.delete(key);
      }
    }
  }

  destroy(): void {
    clearInterval(this.cleanupInterval);
    this.store.clear();
  }
}

/**
 * Rate Limit Presets
 */
export const RateLimitPresets = {
  // Auth endpoints - stricter
  login: {
    windowMs: 60 * 1000,  // 1 minute
    maxRequests: 5,
    keyPrefix: 'rl:login:',
  },
  register: {
    windowMs: 60 * 60 * 1000,  // 1 hour
    maxRequests: 3,
    keyPrefix: 'rl:register:',
  },
  forgotPassword: {
    windowMs: 60 * 60 * 1000,  // 1 hour
    maxRequests: 3,
    keyPrefix: 'rl:forgot:',
  },
  // API endpoints - more lenient
  api: {
    windowMs: 60 * 1000,  // 1 minute
    maxRequests: 100,
    keyPrefix: 'rl:api:',
  },
  // Verification codes
  verification: {
    windowMs: 60 * 1000,  // 1 minute
    maxRequests: 3,
    keyPrefix: 'rl:verify:',
  },
} as const;

export type RateLimitPreset = keyof typeof RateLimitPresets;

/**
 * RateLimiterService
 * 
 * Dynamic rate limiting with configurable presets.
 */
export class RateLimiterService {
  constructor(private readonly store: IRateLimitStore) { }

  /**
   * Check if request should be rate limited
   */
  async checkLimit(
    key: string,
    config: RateLimitConfig,
  ): Promise<{ allowed: boolean; remaining: number; resetTime: number }> {
    const fullKey = (config.keyPrefix || 'rl:') + key;
    const { count, resetTime } = await this.store.increment(fullKey, config.windowMs);

    const allowed = count <= config.maxRequests;
    const remaining = Math.max(0, config.maxRequests - count);

    return { allowed, remaining, resetTime };
  }

  /**
   * Get rate limit headers for response
   */
  getRateLimitHeaders(
    config: RateLimitConfig,
    remaining: number,
    resetTime: number,
  ): Record<string, string> {
    return {
      'X-RateLimit-Limit': config.maxRequests.toString(),
      'X-RateLimit-Remaining': remaining.toString(),
      'X-RateLimit-Reset': Math.ceil(resetTime / 1000).toString(),
    };
  }

  /**
   * Reset rate limit for a key (e.g., after successful login)
   */
  async resetLimit(key: string, prefix?: string): Promise<void> {
    await this.store.reset((prefix || 'rl:') + key);
  }

  /**
   * Create middleware for a specific preset
   */
  createMiddleware(presetOrConfig: RateLimitPreset | RateLimitConfig) {
    const config: RateLimitConfig = typeof presetOrConfig === 'string'
      ? { ...RateLimitPresets[presetOrConfig] }
      : presetOrConfig;

    return async (c: Context, next: () => Promise<void>) => {
      // Use IP as default key
      const ip = c.req.header('x-forwarded-for') ||
        c.req.header('x-real-ip') ||
        'unknown';

      const result = await this.checkLimit(ip, config);

      // Set rate limit headers
      const headers = this.getRateLimitHeaders(config, result.remaining, result.resetTime);
      Object.entries(headers).forEach(([key, value]) => {
        c.header(key, value);
      });

      if (!result.allowed) {
        const retryAfter = Math.ceil((result.resetTime - Date.now()) / 1000);
        c.header('Retry-After', retryAfter.toString());

        if (config.handler) {
          return config.handler(c);
        }

        return c.json({
          error: 'RATE_LIMIT_EXCEEDED',
          message: 'Too many requests. Please try again later.',
          retryAfter,
        }, 429);
      }

      await next();
    };
  }
}

/**
 * Service Interface for DI
 */
export interface IRateLimiterService {
  checkLimit(key: string, config: RateLimitConfig): Promise<{ allowed: boolean; remaining: number; resetTime: number }>;
  resetLimit(key: string, prefix?: string): Promise<void>;
  createMiddleware(presetOrConfig: RateLimitPreset | RateLimitConfig): (c: Context, next: () => Promise<void>) => Promise<Response | void>;
}
