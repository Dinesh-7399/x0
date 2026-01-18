import dotenv from 'dotenv';
import { z } from 'zod';

dotenv.config();

const configSchema = z.object({
  nodeEnv: z.enum(['development', 'production', 'test']).default('development'),
  port: z.string().transform(Number).default(8080),
  serviceName: z.string().default('payment-service'),
  databaseUrl: z.string(),
  redisUrl: z.string().default('redis://localhost:6379'),
  razorpayKeyId: z.string().optional().default('rzp_test_placeholder'),
  razorpayKeySecret: z.string().optional().default('rzp_secret_placeholder'),
  razorpayWebhookSecret: z.string().optional().default('webhook_secret_placeholder'),
  jwtSecret: z.string().default('dev-secret'),
  useMockGateway: z.string().optional().default('false').transform((val) => val === 'true'),
});

export type Config = z.infer<typeof configSchema>;

export const getConfig = (): Config => {
  const result = configSchema.safeParse({
    nodeEnv: process.env.NODE_ENV,
    port: process.env.PORT,
    serviceName: process.env.SERVICE_NAME,
    databaseUrl: process.env.DATABASE_URL,
    redisUrl: process.env.REDIS_URL,
    razorpayKeyId: process.env.RAZORPAY_KEY_ID,
    razorpayKeySecret: process.env.RAZORPAY_KEY_SECRET,
    razorpayWebhookSecret: process.env.RAZORPAY_WEBHOOK_SECRET,
    jwtSecret: process.env.JWT_SECRET,
    useMockGateway: process.env.USE_MOCK_GATEWAY,
  });

  if (!result.success) {
    if (process.env.NODE_ENV === 'test') {
      // Return mock for tests if needed, or fail
    }
    console.error('❌ Invalid configuration:', result.error.format());
    throw new Error('Invalid configuration');
  }

  return result.data;
};
