// src/types/route.types.ts

/**
 * Route configuration types
 * Defines the structure of routes loaded from routes.yaml
 */

export type HttpMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE' | 'OPTIONS' | 'HEAD';

export interface RateLimitConfig {
  points: number;     // Max requests
  duration: number;   // Time window in seconds
}

export interface CacheConfig {
  enabled: boolean;
  ttl: number;        // Time to live in seconds
}

export interface RouteConfig {
  path: string;                    // URL pattern: /api/v1/auth/*
  method: HttpMethod | HttpMethod[]; // HTTP methods
  target: string;                  // Backend service: identity-service:8080
  stripPrefix?: string;            // Remove this prefix before forwarding
  auth: boolean;                   // Require authentication?
  rateLimit?: RateLimitConfig;     // Rate limiting rules
  timeout?: number;                // Request timeout in ms
  cache?: CacheConfig;             // Response caching
  protocol?: 'http' | 'websocket'; // Protocol type
  maxBodySize?: string;            // Max request body size: "10MB"
}

export interface RoutesConfig {
  version: string;
  routes: RouteConfig[];
}

/**
 * Matched route with additional context
 */
export interface MatchedRoute extends RouteConfig {
  params: Record<string, string>;  // URL parameters (if any)
  pathPattern: RegExp;             // Compiled regex pattern
}