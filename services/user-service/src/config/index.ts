// src/config/index.ts
import { z } from 'zod';

/**
 * Environment configuration schema with Zod validation
 */
const configSchema = z.object({
  // Server
  port: z.coerce.number().default(8080),
  nodeEnv: z.enum(['development', 'production', 'test']).default('development'),

  // Database (PostgreSQL - Shared with Identity Service)
  databaseUrl: z.string().min(1, 'DATABASE_URL is required'),

  // JWT (For verification)
  jwtSecret: z.string().min(32, 'JWT_SECRET must be at least 32 characters'),

  // Redis
  redisUrl: z.string().default('redis://localhost:6379'),

  // Service info
  serviceName: z.string().default('user-service'),
});

export type Config = z.infer<typeof configSchema>;

let config: Config | null = null;

/**
 * Load and validate configuration from environment
 */
export function loadConfig(): Config {
  try {
    const rawConfig = {
      port: process.env.PORT,
      nodeEnv: process.env.NODE_ENV,
      databaseUrl: process.env.DATABASE_URL,
      jwtSecret: process.env.JWT_SECRET,
      redisUrl: process.env.REDIS_URL,
      serviceName: process.env.SERVICE_NAME,
    };

    return configSchema.parse(rawConfig);
  } catch (error) {
    if (error instanceof z.ZodError) {
      console.error('❌ Configuration validation failed:');
      error.issues.forEach((issue) => {
        console.error(`  - ${issue.path.join('.')}: ${issue.message}`);
      });
      process.exit(1);
    }
    throw error;
  }
}

/**
 * Get configuration (singleton)
 */
export function getConfig(): Config {
  if (!config) {
    config = loadConfig();
  }
  return config;
}
