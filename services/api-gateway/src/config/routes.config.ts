// src/config/routes.config.ts
import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import YAML from 'yaml';
import { z } from 'zod';
import type { RouteConfig, RoutesConfig } from '../types/route.types.js';
import { logger } from '../core/logger.js';

// Get the directory of this module for relative path resolution
const __dirname = dirname(fileURLToPath(import.meta.url));

/**
 * Zod schema for route validation
 */
const HttpMethodSchema = z.enum(['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS', 'HEAD']);

const RateLimitConfigSchema = z.object({
  points: z.number().positive(),
  duration: z.number().positive(),
});

const CacheConfigSchema = z.object({
  enabled: z.boolean(),
  ttl: z.number().positive(),
});

const RouteConfigSchema = z.object({
  path: z.string().min(1),
  method: z.union([HttpMethodSchema, z.array(HttpMethodSchema)]),
  target: z.string().min(1),
  stripPrefix: z.string().optional(),
  auth: z.boolean(),
  rateLimit: RateLimitConfigSchema.optional(),
  timeout: z.number().positive().optional(),
  cache: CacheConfigSchema.optional(),
  protocol: z.enum(['http', 'websocket']).optional().default('http'),
  maxBodySize: z.string().optional(),
});

const RoutesConfigSchema = z.object({
  version: z.string(),
  routes: z.array(RouteConfigSchema),
});

/**
 * Load and parse routes.yaml file
 */
export function loadRoutesConfig(): RoutesConfig {
  try {
    // Read routes.yaml file - use env var or resolve relative to module
    const configPath = process.env.ROUTES_CONFIG_PATH
      || join(__dirname, '..', '..', 'config', 'routes.yaml');
    const fileContent = readFileSync(configPath, 'utf-8');

    // Parse YAML
    const parsed = YAML.parse(fileContent);

    // Validate with Zod
    const validated = RoutesConfigSchema.parse(parsed);

    logger.info(
      { routeCount: validated.routes.length, version: validated.version },
      'Routes configuration loaded',
    );

    return validated as RoutesConfig;
  } catch (error) {
    if (error instanceof z.ZodError) {
      logger.error({ errors: error.issues }, 'Invalid routes configuration');
      throw new Error('Routes configuration validation failed');
    }

    logger.error({ error }, 'Failed to load routes configuration');
    throw error;
  }
}

/**
 * Normalize routes (convert single methods to arrays)
 */
export function normalizeRoutes(config: RoutesConfig): RouteConfig[] {
  return config.routes.map((route) => ({
    ...route,
    method: Array.isArray(route.method) ? route.method : [route.method],
  }));
}

/**
 * Singleton route cache
 */
let routesCache: RouteConfig[] | null = null;

export function getRoutes(): RouteConfig[] {
  if (!routesCache) {
    const config = loadRoutesConfig();
    routesCache = normalizeRoutes(config);
  }
  return routesCache;
}