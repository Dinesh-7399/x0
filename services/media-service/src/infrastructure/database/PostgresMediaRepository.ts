// src/infrastructure/database/PostgresMediaRepository.ts

import {
  Media,
  type MediaMetadata,
  type MediaProps,
  type MediaStatus,
  type MediaType,
} from '../../domain/entities/Media.js';
import type {
  IMediaRepository,
  MediaListResult,
  MediaPaginationOptions,
} from '../../domain/repositories/IMediaRepository.js';
import { execute, query, queryOne } from './postgres.js';

interface MediaRow {
  id: string;
  user_id: string;
  type: string;
  filename: string;
  mime_type: string;
  size: number;
  url: string;
  thumbnail_url: string | null;
  status: string;
  metadata: MediaMetadata;
  entity_type: string | null;
  entity_id: string | null;
  is_public: boolean;
  deleted_at: Date | null;
  created_at: Date;
  updated_at: Date;
}

export class PostgresMediaRepository implements IMediaRepository {
  async save(media: Media): Promise<void> {
    await execute(
      `INSERT INTO media (
        id, user_id, type, filename, mime_type, size, url, thumbnail_url,
        status, metadata, entity_type, entity_id, is_public, deleted_at,
        created_at, updated_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16)`,
      [
        media.id,
        media.userId,
        media.type,
        media.filename,
        media.mimeType,
        media.size,
        media.url,
        media.thumbnailUrl || null,
        media.status,
        JSON.stringify(media.metadata),
        media.entityType || null,
        media.entityId || null,
        media.isPublic,
        media.deletedAt || null,
        media.createdAt,
        media.updatedAt,
      ],
    );
  }

  async findById(id: string): Promise<Media | null> {
    const row = await queryOne<MediaRow>('SELECT * FROM media WHERE id = $1', [id]);

    return row ? this.rowToMedia(row) : null;
  }

  async findByIds(ids: string[]): Promise<Media[]> {
    if (ids.length === 0) return [];

    const rows = await query<MediaRow>(
      'SELECT * FROM media WHERE id = ANY($1) AND deleted_at IS NULL',
      [ids],
    );

    return rows.map((row) => this.rowToMedia(row));
  }

  async update(media: Media): Promise<void> {
    await execute(
      `UPDATE media SET
        type = $2,
        filename = $3,
        mime_type = $4,
        size = $5,
        url = $6,
        thumbnail_url = $7,
        status = $8,
        metadata = $9,
        entity_type = $10,
        entity_id = $11,
        is_public = $12,
        deleted_at = $13,
        updated_at = $14
      WHERE id = $1`,
      [
        media.id,
        media.type,
        media.filename,
        media.mimeType,
        media.size,
        media.url,
        media.thumbnailUrl || null,
        media.status,
        JSON.stringify(media.metadata),
        media.entityType || null,
        media.entityId || null,
        media.isPublic,
        media.deletedAt || null,
        media.updatedAt,
      ],
    );
  }

  async delete(id: string): Promise<void> {
    await execute('DELETE FROM media WHERE id = $1', [id]);
  }

  async findByUserId(userId: string, options: MediaPaginationOptions): Promise<MediaListResult> {
    let whereClause = 'user_id = $1 AND deleted_at IS NULL';
    const params: unknown[] = [userId];
    let paramIndex = 2;

    if (options.type) {
      whereClause += ` AND type = $${paramIndex}`;
      params.push(options.type);
      paramIndex++;
    }

    if (options.entityType) {
      whereClause += ` AND entity_type = $${paramIndex}`;
      params.push(options.entityType);
      paramIndex++;
    }

    if (options.entityId) {
      whereClause += ` AND entity_id = $${paramIndex}`;
      params.push(options.entityId);
      paramIndex++;
    }

    // Get total count
    const countResult = await queryOne<{ count: string }>(
      `SELECT COUNT(*) as count FROM media WHERE ${whereClause}`,
      params,
    );
    const total = Number.parseInt(countResult?.count || '0', 10);

    // Get paginated results
    params.push(options.limit, options.offset);
    const rows = await query<MediaRow>(
      `SELECT * FROM media WHERE ${whereClause}
       ORDER BY created_at DESC
       LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`,
      params,
    );

    return {
      media: rows.map((row) => this.rowToMedia(row)),
      total,
      hasMore: options.offset + rows.length < total,
    };
  }

  async findByEntity(entityType: string, entityId: string): Promise<Media[]> {
    const rows = await query<MediaRow>(
      `SELECT * FROM media 
       WHERE entity_type = $1 AND entity_id = $2 AND deleted_at IS NULL
       ORDER BY created_at DESC`,
      [entityType, entityId],
    );

    return rows.map((row) => this.rowToMedia(row));
  }

  async deleteByUserId(userId: string): Promise<number> {
    return execute(
      'UPDATE media SET deleted_at = NOW() WHERE user_id = $1 AND deleted_at IS NULL',
      [userId],
    );
  }

  async deleteByEntity(entityType: string, entityId: string): Promise<number> {
    return execute(
      'UPDATE media SET deleted_at = NOW() WHERE entity_type = $1 AND entity_id = $2 AND deleted_at IS NULL',
      [entityType, entityId],
    );
  }

  async getTotalSizeByUserId(userId: string): Promise<number> {
    const result = await queryOne<{ total: string | null }>(
      'SELECT SUM(size) as total FROM media WHERE user_id = $1 AND deleted_at IS NULL',
      [userId],
    );
    return Number.parseInt(result?.total || '0', 10);
  }

  async getCountByUserId(userId: string): Promise<number> {
    const result = await queryOne<{ count: string }>(
      'SELECT COUNT(*) as count FROM media WHERE user_id = $1 AND deleted_at IS NULL',
      [userId],
    );
    return Number.parseInt(result?.count || '0', 10);
  }

  private rowToMedia(row: MediaRow): Media {
    const props: MediaProps = {
      id: row.id,
      userId: row.user_id,
      type: row.type as MediaType,
      filename: row.filename,
      mimeType: row.mime_type,
      size: row.size,
      url: row.url,
      thumbnailUrl: row.thumbnail_url || undefined,
      status: row.status as MediaStatus,
      metadata: row.metadata || {},
      entityType: row.entity_type || undefined,
      entityId: row.entity_id || undefined,
      isPublic: row.is_public,
      deletedAt: row.deleted_at || undefined,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };

    return Media.fromPersistence(props);
  }
}
