// src/config/index.ts

export interface ChatServiceConfig {
  serviceName: string;
  port: number;
  nodeEnv: string;

  // Database
  databaseUrl: string;

  // Redis
  redisUrl: string;

  // JWT (for WS auth)
  jwtSecret: string;

  // Service URLs
  identityServiceUrl: string;
  mediaServiceUrl: string;
  notificationChannel: string;

  // Limits
  maxMessageLength: number;
  maxGroupParticipants: number;
  messagePageSize: number;
}

let config: ChatServiceConfig | null = null;

export function getConfig(): ChatServiceConfig {
  if (config) return config;

  config = {
    serviceName: 'chat-service',
    port: parseInt(process.env.PORT || '8080', 10),
    nodeEnv: process.env.NODE_ENV || 'development',

    // Database
    databaseUrl: process.env.DATABASE_URL || 'postgresql://gymato:password@localhost:5432/gymato_chat',

    // Redis
    redisUrl: process.env.REDIS_URL || 'redis://localhost:6379',

    // JWT
    jwtSecret: process.env.JWT_SECRET || '',

    // Service URLs
    identityServiceUrl: process.env.IDENTITY_SERVICE_URL || 'http://localhost:8081',
    mediaServiceUrl: process.env.MEDIA_SERVICE_URL || 'http://localhost:8085',
    notificationChannel: process.env.NOTIFICATION_CHANNEL || 'notifications:push',

    // Limits
    maxMessageLength: parseInt(process.env.MAX_MESSAGE_LENGTH || '10000', 10),
    maxGroupParticipants: parseInt(process.env.MAX_GROUP_PARTICIPANTS || '256', 10),
    messagePageSize: parseInt(process.env.MESSAGE_PAGE_SIZE || '50', 10),
  };

  return config;
}

export function validateConfig(): void {
  const cfg = getConfig();

  if (cfg.nodeEnv === 'production') {
    if (!cfg.jwtSecret) {
      throw new Error('JWT_SECRET is required in production');
    }
    if (cfg.databaseUrl.includes('localhost')) {
      console.warn('WARNING: Using localhost database URL in production');
    }
  }
}
