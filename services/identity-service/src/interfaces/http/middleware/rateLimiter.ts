// src/interfaces/http/middleware/rateLimiter.ts

import type { Context } from 'hono';
import type { RateLimiterService, RateLimitConfig, RateLimitPreset } from '../../../infrastructure/services/RateLimiterService.js';

/**
 * Create Rate Limit Middleware
 * 
 * Factory function to create rate limit middleware for specific endpoints.
 */
export function createRateLimitMiddleware(
  rateLimiter: RateLimiterService,
  configOrPreset: RateLimitPreset | RateLimitConfig,
  keyExtractor?: (c: Context) => string,
) {
  return rateLimiter.createMiddleware(configOrPreset);
}

/**
 * Extract rate limit key from context
 */
export function getClientKey(c: Context): string {
  // Try various headers for the real IP
  const forwarded = c.req.header('x-forwarded-for');
  if (forwarded) {
    return forwarded.split(',')[0].trim();
  }

  const realIp = c.req.header('x-real-ip');
  if (realIp) {
    return realIp;
  }

  return 'unknown';
}

/**
 * Combine IP + user for authenticated rate limiting
 */
export function getUserKey(c: Context, userId?: string): string {
  const ip = getClientKey(c);
  return userId ? `${userId}:${ip}` : ip;
}
