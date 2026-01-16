// @gymato/types - Core type definitions
// This package contains shared types used across all services

/**
 * Standard API response wrapper
 */
export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
    details?: unknown;
  };
  meta?: {
    timestamp: string;
    requestId?: string;
  };
}

/**
 * Paginated response for list endpoints
 */
export interface PaginatedResponse<T> {
  items: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

/**
 * Service health check response
 */
export interface ServiceHealth {
  status: 'healthy' | 'degraded' | 'unhealthy';
  service: string;
  version?: string;
  timestamp: string;
  uptime?: number;
  dependencies?: Record<string, {
    status: 'up' | 'down';
    latencyMs?: number;
  }>;
}

/**
 * Base entity with common fields
 */
export interface BaseEntity {
  id: string;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * User roles in the system
 */
export type UserRole = 'user' | 'trainer' | 'gym_owner' | 'admin';

/**
 * Basic user information (shared across services)
 */
export interface BaseUser extends BaseEntity {
  email: string;
  role: UserRole;
  isActive: boolean;
}

/**
 * JWT payload structure
 */
export interface JwtPayload {
  sub: string; // user id
  email: string;
  role: UserRole;
  iat: number;
  exp: number;
}

/**
 * Environment configuration type
 */
export interface EnvConfig {
  NODE_ENV: 'development' | 'production' | 'test';
  PORT: number;
  LOG_LEVEL: 'debug' | 'info' | 'warn' | 'error';
}
