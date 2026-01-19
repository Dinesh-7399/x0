// src/config/index.ts

export interface MediaServiceConfig {
  serviceName: string;
  port: number;
  nodeEnv: string;

  // Database
  databaseUrl: string;

  // Redis
  redisUrl: string;

  // JWT (for auth validation)
  jwtSecret: string;

  // Storage
  storageType: 'local' | 's3';
  storagePath: string; // Local storage path
  s3Bucket: string;
  s3Region: string;
  s3AccessKeyId: string;
  s3SecretAccessKey: string;
  s3Endpoint?: string; // For S3-compatible services like MinIO

  // Upload limits
  maxFileSize: number; // In bytes
  maxFilesPerUpload: number;
  allowedImageTypes: string[];
  allowedVideoTypes: string[];
  allowedDocumentTypes: string[];

  // URLs
  publicBaseUrl: string; // Base URL for serving media
}

let config: MediaServiceConfig | null = null;

export function getConfig(): MediaServiceConfig {
  if (config) return config;

  config = {
    serviceName: 'media-service',
    port: Number.parseInt(process.env.PORT || '8080', 10),
    nodeEnv: process.env.NODE_ENV || 'development',

    // Database
    databaseUrl:
      process.env.DATABASE_URL || 'postgresql://gymato:password@localhost:5432/gymato_media',

    // Redis
    redisUrl: process.env.REDIS_URL || 'redis://localhost:6379',

    // JWT
    jwtSecret: process.env.JWT_SECRET || '',

    // Storage
    storageType: (process.env.STORAGE_TYPE as 'local' | 's3') || 'local',
    storagePath: process.env.STORAGE_PATH || './uploads',
    s3Bucket: process.env.S3_BUCKET || '',
    s3Region: process.env.S3_REGION || 'us-east-1',
    s3AccessKeyId: process.env.S3_ACCESS_KEY_ID || '',
    s3SecretAccessKey: process.env.S3_SECRET_ACCESS_KEY || '',
    s3Endpoint: process.env.S3_ENDPOINT,

    // Upload limits
    maxFileSize: Number.parseInt(process.env.MAX_FILE_SIZE || String(50 * 1024 * 1024), 10), // 50MB default
    maxFilesPerUpload: Number.parseInt(process.env.MAX_FILES_PER_UPLOAD || '10', 10),
    allowedImageTypes: ['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/heic'],
    allowedVideoTypes: ['video/mp4', 'video/webm', 'video/quicktime', 'video/x-msvideo'],
    allowedDocumentTypes: [
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    ],

    // URLs
    publicBaseUrl: process.env.PUBLIC_BASE_URL || 'http://localhost:8090',
  };

  return config;
}

export function validateConfig(): void {
  const cfg = getConfig();

  if (cfg.nodeEnv === 'production') {
    if (!cfg.jwtSecret) {
      throw new Error('JWT_SECRET is required in production');
    }
    if (cfg.storageType === 's3') {
      if (!cfg.s3Bucket || !cfg.s3AccessKeyId || !cfg.s3SecretAccessKey) {
        throw new Error('S3 configuration is incomplete for production');
      }
    }
    if (cfg.databaseUrl.includes('localhost')) {
      console.warn('WARNING: Using localhost database URL in production');
    }
  }
}

export function getAllowedMimeTypes(): string[] {
  const cfg = getConfig();
  return [...cfg.allowedImageTypes, ...cfg.allowedVideoTypes, ...cfg.allowedDocumentTypes];
}
