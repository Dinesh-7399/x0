// src/application/dtos/media.dtos.ts

import type { MediaMetadata, MediaStatus, MediaType } from '../../domain/entities/Media.js';

// Request DTOs
export interface UploadMediaDto {
  entityType?: string;
  entityId?: string;
  isPublic?: boolean;
}

export interface UpdateMediaDto {
  entityType?: string;
  entityId?: string;
  isPublic?: boolean;
}

export interface ListMediaDto {
  limit?: number;
  offset?: number;
  type?: MediaType;
  entityType?: string;
  entityId?: string;
}

export interface GeneratePresignedUrlDto {
  filename: string;
  mimeType: string;
  size: number;
  entityType?: string;
  entityId?: string;
}

// Response DTOs
export interface MediaResponse {
  id: string;
  userId: string;
  type: MediaType;
  filename: string;
  mimeType: string;
  size: number;
  url: string;
  thumbnailUrl?: string;
  status: MediaStatus;
  metadata: MediaMetadata;
  entityType?: string;
  entityId?: string;
  isPublic: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface MediaListResponse {
  media: MediaResponse[];
  total: number;
  hasMore: boolean;
  limit: number;
  offset: number;
}

export interface PresignedUrlResponse {
  uploadUrl: string;
  mediaId: string;
  expiresAt: Date;
  fields?: Record<string, string>; // Additional fields for S3 form upload
}

export interface UploadResultResponse {
  media: MediaResponse;
  message: string;
}

export interface BatchUploadResultResponse {
  uploaded: MediaResponse[];
  failed: { filename: string; error: string }[];
  message: string;
}
