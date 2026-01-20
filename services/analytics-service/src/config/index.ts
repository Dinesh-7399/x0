// src/config/index.ts

import { z } from "zod";

/**
 * Environment configuration schema with Zod validation
 */
const configSchema = z.object({
  // Server
  port: z.coerce.number().default(8080),
  nodeEnv: z.enum(["development", "production", "test"]).default("development"),

  // Database (PostgreSQL)
  databaseUrl: z.string().min(1, "DATABASE_URL is required"),

  // Redis
  redisUrl: z.string().default("redis://localhost:6379"),

  // JWT
  jwtSecret: z.string().min(16, "JWT_SECRET must be at least 16 characters"),

  // Service info
  serviceName: z.string().default("analytics-service"),

  // Analytics specific
  aggregationIntervalMinutes: z.coerce.number().default(5),
  cacheTtlSeconds: z.coerce.number().default(300),
  enableRealtimeSync: z.coerce.boolean().default(true),
});

export type AnalyticsConfig = z.infer<typeof configSchema>;

let config: AnalyticsConfig | null = null;

/**
 * Load and validate configuration from environment
 */
export function loadConfig(): AnalyticsConfig {
  try {
    const rawConfig = {
      port: process.env.PORT,
      nodeEnv: process.env.NODE_ENV,
      databaseUrl: process.env.DATABASE_URL,
      redisUrl: process.env.REDIS_URL,
      jwtSecret: process.env.JWT_SECRET,
      serviceName: process.env.SERVICE_NAME,
      aggregationIntervalMinutes: process.env.AGGREGATION_INTERVAL_MINUTES,
      cacheTtlSeconds: process.env.CACHE_TTL_SECONDS,
      enableRealtimeSync: process.env.ENABLE_REALTIME_SYNC,
    };

    return configSchema.parse(rawConfig);
  } catch (error) {
    if (error instanceof z.ZodError) {
      console.error("❌ Configuration validation failed:");
      error.issues.forEach((issue) => {
        console.error(`  - ${issue.path.join(".")}: ${issue.message}`);
      });
      process.exit(1);
    }
    throw error;
  }
}

/**
 * Get configuration (singleton)
 */
export function getConfig(): AnalyticsConfig {
  if (!config) {
    config = loadConfig();
  }
  return config;
}

/**
 * Validate config on startup
 */
export function validateConfig(): void {
  getConfig(); // Will throw if invalid
}
