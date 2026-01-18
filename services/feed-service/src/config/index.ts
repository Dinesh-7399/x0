import dotenv from 'dotenv';
import { z } from 'zod';

dotenv.config();

const configSchema = z.object({
  nodeEnv: z.enum(['development', 'production', 'test']).default('development'),
  port: z.string().transform(Number).default('8080'),
  serviceName: z.string().default('feed-service'),
  databaseUrl: z.string(),
  redisUrl: z.string().default('redis://localhost:6379'),
  jwtSecret: z.string(),
});

export type Config = z.infer<typeof configSchema>;

export const getConfig = (): Config => {
  const result = configSchema.safeParse({
    nodeEnv: process.env.NODE_ENV,
    port: process.env.PORT,
    serviceName: process.env.SERVICE_NAME,
    databaseUrl: process.env.DATABASE_URL,
    redisUrl: process.env.REDIS_URL,
    jwtSecret: process.env.JWT_SECRET,
  });

  if (!result.success) {
    console.error('❌ Invalid configuration:', result.error.format());
    throw new Error('Invalid configuration');
  }

  return result.data;
};
