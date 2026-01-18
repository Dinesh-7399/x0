import dotenv from 'dotenv';
import { z } from 'zod';

dotenv.config();

const ConfigSchema = z.object({
  nodeEnv: z.enum(['development', 'test', 'production']).default('development'),
  port: z.coerce.number().default(8080),
  databaseUrl: z.string().url(),
  jwtSecret: z.string().min(1),
  redisUrl: z.string().url().default('redis://localhost:6379'),
});

export type Config = z.infer<typeof ConfigSchema>;

let config: Config;

export function getConfig(): Config {
  if (!config) {
    const result = ConfigSchema.safeParse({
      nodeEnv: process.env.NODE_ENV,
      port: process.env.PORT,
      databaseUrl: process.env.DATABASE_URL,
      jwtSecret: process.env.JWT_SECRET,
      redisUrl: process.env.REDIS_URL,
    });

    if (!result.success) {
      console.error('❌ Invalid configuration:', result.error.format());
      throw new Error('Invalid configuration');
    }

    config = result.data;
  }
  return config;
}
