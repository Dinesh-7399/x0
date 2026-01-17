// src/config/index.ts
import { z } from 'zod';

/**
 * Environment configuration schema with Zod validation
 */
const configSchema = z.object({
  // Server
  port: z.coerce.number().default(8080),
  nodeEnv: z.enum(['development', 'production', 'test']).default('development'),

  // Database (PostgreSQL)
  databaseUrl: z.string().min(1, 'DATABASE_URL is required'),

  // JWT
  jwtSecret: z.string().min(32, 'JWT_SECRET must be at least 32 characters'),
  jwtAccessExpiry: z.string().default('15m'),
  jwtRefreshExpiry: z.coerce.number().default(30), // days

  // bcrypt
  bcryptRounds: z.coerce.number().default(12),

  // Service info
  serviceName: z.string().default('identity-service'),
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
      jwtAccessExpiry: process.env.JWT_ACCESS_EXPIRY,
      jwtRefreshExpiry: process.env.JWT_REFRESH_EXPIRY,
      bcryptRounds: process.env.BCRYPT_ROUNDS,
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
