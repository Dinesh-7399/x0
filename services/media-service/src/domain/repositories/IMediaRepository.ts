// src/domain/repositories/IMediaRepository.ts

import type { Media, MediaType } from '../entities/Media.js';

export interface MediaPaginationOptions {
  limit: number;
  offset: number;
  type?: MediaType;
  entityType?: string;
  entityId?: string;
}

export interface MediaListResult {
  media: Media[];
  total: number;
  hasMore: boolean;
}

export interface IMediaRepository {
  // CRUD operations
  save(media: Media): Promise<void>;
  findById(id: string): Promise<Media | null>;
  findByIds(ids: string[]): Promise<Media[]>;
  update(media: Media): Promise<void>;
  delete(id: string): Promise<void>;

  // User media
  findByUserId(userId: string, options: MediaPaginationOptions): Promise<MediaListResult>;

  // Entity-related media
  findByEntity(entityType: string, entityId: string): Promise<Media[]>;

  // Bulk operations
  deleteByUserId(userId: string): Promise<number>;
  deleteByEntity(entityType: string, entityId: string): Promise<number>;

  // Statistics
  getTotalSizeByUserId(userId: string): Promise<number>;
  getCountByUserId(userId: string): Promise<number>;
}
