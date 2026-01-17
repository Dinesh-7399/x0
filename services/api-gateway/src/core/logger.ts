// src/core/logger.ts
import pino from 'pino';
import { getConfig } from '../config/config.js';

const config = getConfig();

/**
 * Structured logger using Pino
 * Logs in JSON format for easy parsing by log aggregators
 */
export const logger = pino({
  level: config.logLevel,
  
  // Pretty print in development
  transport: config.nodeEnv === 'development' 
    ? {
        target: 'pino-pretty',
        options: {
          colorize: true,
          translateTime: 'HH:MM:ss',
          ignore: 'pid,hostname',
        },
      }
    : undefined,

  // Base fields included in every log
  base: {
    service: 'api-gateway',
    env: config.nodeEnv,
  },

  // Timestamp format
  timestamp: () => `,"time":"${new Date().toISOString()}"`,
});

/**
 * Create a child logger with additional context
 * @example
 * const log = createLogger({ requestId: 'abc123' });
 * log.info('Processing request');
 */
export function createLogger(context: Record<string, unknown>) {
  return logger.child(context);
}