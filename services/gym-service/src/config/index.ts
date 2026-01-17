// src/config/index.ts

interface Config {
  port: number;
  nodeEnv: string;
  serviceName: string;
  databaseUrl: string;
  redisUrl: string;
  jwtSecret: string;
}

let config: Config | null = null;

export function getConfig(): Config {
  if (config) return config;

  config = {
    port: parseInt(process.env.PORT || '8080', 10),
    nodeEnv: process.env.NODE_ENV || 'development',
    serviceName: 'gym-service',
    databaseUrl: process.env.DATABASE_URL || 'postgresql://gymato:gymato_dev@localhost:5432/gymato',
    redisUrl: process.env.REDIS_URL || 'redis://localhost:6379',
    jwtSecret: process.env.JWT_SECRET || 'dev-jwt-secret-change-in-production',
  };

  return config;
}
