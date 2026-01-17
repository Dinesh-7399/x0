// src/config/config.ts
import { z } from 'zod';

/**
 * Configuration Schema
 * Uses Zod for runtime validation of environment variables
 */
const ConfigSchema = z.object({
  // Server
  port: z.coerce.number().default(80),
  httpsPort: z.coerce.number().default(443),
  nodeEnv: z.enum(['development', 'production', 'test']).default('development'),

  // JWT
  jwtSecret: z.string().min(32, 'JWT secret must be at least 32 characters'),

  // Redis
  redisUrl: z.string().url(),

  // Service Discovery
  serviceRegistryTtl: z.coerce.number().default(60), // seconds

  // Circuit Breaker
  circuitBreakerThreshold: z.coerce.number().default(5),
  circuitBreakerTimeout: z.coerce.number().default(30000), // ms

  // Rate Limiting
  rateLimitWindow: z.coerce.number().default(60000), // 1 minute
  rateLimitMaxRequests: z.coerce.number().default(100),

  // Timeouts
  defaultTimeout: z.coerce.number().default(5000), // 5 seconds
  uploadTimeout: z.coerce.number().default(30000), // 30 seconds

  // Observability
  logLevel: z.enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace']).default('info'),
  metricsPort: z.coerce.number().default(9090),
});

export type Config = z.infer<typeof ConfigSchema>;

/**
 * Load and validate configuration from environment variables
 */
export function loadConfig(): Config {
  const config = {
    port: process.env.PORT,
    httpsPort: process.env.HTTPS_PORT,
    nodeEnv: process.env.NODE_ENV,
    jwtSecret: process.env.JWT_SECRET,
    redisUrl: process.env.REDIS_URL,
    serviceRegistryTtl: process.env.SERVICE_REGISTRY_TTL,
    circuitBreakerThreshold: process.env.CIRCUIT_BREAKER_THRESHOLD,
    circuitBreakerTimeout: process.env.CIRCUIT_BREAKER_TIMEOUT,
    rateLimitWindow: process.env.RATE_LIMIT_WINDOW,
    rateLimitMaxRequests: process.env.RATE_LIMIT_MAX_REQUESTS,
    defaultTimeout: process.env.DEFAULT_TIMEOUT,
    uploadTimeout: process.env.UPLOAD_TIMEOUT,
    logLevel: process.env.LOG_LEVEL,
    metricsPort: process.env.METRICS_PORT,
  };

  try {
    return ConfigSchema.parse(config);
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

// Singleton instance
let configInstance: Config | null = null;

export function getConfig(): Config {
  if (!configInstance) {
    configInstance = loadConfig();
  }
  return configInstance;
}