import dotenv from 'dotenv';
import { z } from 'zod';

dotenv.config();

// Use distinct service name
const configSchema = z.object({
  nodeEnv: z.enum(['development', 'production', 'test']).default('development'),
  port: z.string().transform(Number).default('8080'),
  serviceName: z.string().default('membership-service'),
  databaseUrl: z.string(),
  redisUrl: z.string().default('redis://localhost:6379'),
  jwtSecret: z.string().default('dev-secret'),
  paymentServiceUrl: z.string().default('http://payment-service:8080/api/v1/payments'), // Gateway URL or Internal?
  // Internal: http://payment-service:8080/payments
  // The client uses this.baseUrl.
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
    paymentServiceUrl: process.env.PAYMENT_SERVICE_URL,
  });

  if (!result.success) {
    console.error('❌ Invalid configuration:', result.error.format());
    throw new Error('Invalid configuration');
  }

  return result.data;
};
