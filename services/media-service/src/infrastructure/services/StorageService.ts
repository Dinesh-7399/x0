// src/infrastructure/services/StorageService.ts

import * as fs from 'node:fs';
import * as path from 'node:path';
import { StorageError, UploadFailedError } from '../../application/errors/MediaErrors.js';
import { getConfig } from '../../config/index.js';

export interface UploadedFile {
  filename: string;
  mimeType: string;
  size: number;
  buffer: Buffer;
}

export interface StorageResult {
  url: string;
  key: string;
  thumbnailUrl?: string;
  metadata?: Record<string, unknown>;
}

export interface PresignedUploadResult {
  uploadUrl: string;
  objectUrl: string;
  key: string;
  expiresAt: Date;
  fields?: Record<string, string>;
}

export interface IStorageService {
  upload(file: UploadedFile, userId: string): Promise<StorageResult>;
  delete(url: string): Promise<void>;
  generatePresignedUploadUrl(
    filename: string,
    mimeType: string,
    userId: string,
  ): Promise<PresignedUploadResult>;
  getSignedUrl(key: string, expiresInSeconds?: number): Promise<string>;
}

// Local filesystem storage for development
export class LocalStorageService implements IStorageService {
  private basePath: string;
  private baseUrl: string;

  constructor() {
    const config = getConfig();
    this.basePath = config.storagePath;
    this.baseUrl = config.publicBaseUrl;

    // Ensure storage directory exists
    if (!fs.existsSync(this.basePath)) {
      fs.mkdirSync(this.basePath, { recursive: true });
    }
  }

  async upload(file: UploadedFile, userId: string): Promise<StorageResult> {
    try {
      // Create user directory
      const userDir = path.join(this.basePath, userId);
      if (!fs.existsSync(userDir)) {
        fs.mkdirSync(userDir, { recursive: true });
      }

      // Generate unique filename
      const timestamp = Date.now();
      const ext = path.extname(file.filename);
      const baseName = path.basename(file.filename, ext).replace(/[^a-zA-Z0-9]/g, '_');
      const uniqueFilename = `${timestamp}_${baseName}${ext}`;
      const key = `${userId}/${uniqueFilename}`;
      const filePath = path.join(this.basePath, key);

      // Write file
      fs.writeFileSync(filePath, file.buffer);

      return {
        url: `${this.baseUrl}/files/${key}`,
        key,
      };
    } catch (error) {
      throw new UploadFailedError(error instanceof Error ? error.message : 'Unknown error');
    }
  }

  async delete(url: string): Promise<void> {
    try {
      // Extract key from URL
      const key = url.replace(`${this.baseUrl}/files/`, '');
      const filePath = path.join(this.basePath, key);

      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }
    } catch (error) {
      throw new StorageError('delete', error instanceof Error ? error.message : 'Unknown error');
    }
  }

  async generatePresignedUploadUrl(
    filename: string,
    mimeType: string,
    userId: string,
  ): Promise<PresignedUploadResult> {
    // For local storage, we don't really need presigned URLs
    // but we'll simulate the interface
    const timestamp = Date.now();
    const ext = path.extname(filename);
    const baseName = path.basename(filename, ext).replace(/[^a-zA-Z0-9]/g, '_');
    const uniqueFilename = `${timestamp}_${baseName}${ext}`;
    const key = `${userId}/${uniqueFilename}`;

    return {
      uploadUrl: `${this.baseUrl}/upload/direct`,
      objectUrl: `${this.baseUrl}/files/${key}`,
      key,
      expiresAt: new Date(Date.now() + 3600000), // 1 hour
    };
  }

  async getSignedUrl(key: string, expiresInSeconds = 3600): Promise<string> {
    // For local storage, just return the public URL
    return `${this.baseUrl}/files/${key}`;
  }
}

// S3-compatible storage for production
export class S3StorageService implements IStorageService {
  private bucket: string;
  private region: string;
  private endpoint?: string;

  constructor() {
    const config = getConfig();
    this.bucket = config.s3Bucket;
    this.region = config.s3Region;
    this.endpoint = config.s3Endpoint;

    // Note: In a real implementation, you would initialize the S3 client here
    // using @aws-sdk/client-s3 or similar
  }

  async upload(file: UploadedFile, userId: string): Promise<StorageResult> {
    // Generate unique key
    const timestamp = Date.now();
    const ext = path.extname(file.filename);
    const baseName = path.basename(file.filename, ext).replace(/[^a-zA-Z0-9]/g, '_');
    const key = `uploads/${userId}/${timestamp}_${baseName}${ext}`;

    // TODO: Implement actual S3 upload using @aws-sdk/client-s3
    // For now, throw an error indicating S3 is not yet implemented
    console.log(`S3 upload to ${this.bucket}/${key} (${file.size} bytes)`);

    // Placeholder implementation
    const url = this.endpoint
      ? `${this.endpoint}/${this.bucket}/${key}`
      : `https://${this.bucket}.s3.${this.region}.amazonaws.com/${key}`;

    return {
      url,
      key,
    };
  }

  async delete(url: string): Promise<void> {
    // TODO: Implement actual S3 delete
    console.log(`S3 delete: ${url}`);
  }

  async generatePresignedUploadUrl(
    filename: string,
    mimeType: string,
    userId: string,
  ): Promise<PresignedUploadResult> {
    const timestamp = Date.now();
    const ext = path.extname(filename);
    const baseName = path.basename(filename, ext).replace(/[^a-zA-Z0-9]/g, '_');
    const key = `uploads/${userId}/${timestamp}_${baseName}${ext}`;

    // TODO: Implement actual presigned URL generation using @aws-sdk/s3-request-presigner
    const expiresAt = new Date(Date.now() + 3600000);
    const objectUrl = this.endpoint
      ? `${this.endpoint}/${this.bucket}/${key}`
      : `https://${this.bucket}.s3.${this.region}.amazonaws.com/${key}`;

    return {
      uploadUrl: objectUrl, // Placeholder
      objectUrl,
      key,
      expiresAt,
    };
  }

  async getSignedUrl(key: string, expiresInSeconds = 3600): Promise<string> {
    // TODO: Implement actual signed URL generation
    return this.endpoint
      ? `${this.endpoint}/${this.bucket}/${key}`
      : `https://${this.bucket}.s3.${this.region}.amazonaws.com/${key}`;
  }
}

// Factory function to create appropriate storage service
export function createStorageService(): IStorageService {
  const config = getConfig();

  if (config.storageType === 's3') {
    return new S3StorageService();
  }

  return new LocalStorageService();
}
