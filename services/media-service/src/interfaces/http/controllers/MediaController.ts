// src/interfaces/http/controllers/MediaController.ts

import type { Context } from 'hono';
import type { MediaService } from '../../../application/services/MediaService.js';
import type { MediaType } from '../../../domain/entities/Media.js';
import type { UploadedFile } from '../../../infrastructure/services/StorageService.js';
import {
  GeneratePresignedUrlSchema,
  ListMediaQuerySchema,
  UpdateMediaSchema,
  UploadMediaSchema,
} from '../validation/schemas.js';

export class MediaController {
  constructor(private readonly mediaService: MediaService) {}

  // POST /media/upload
  async upload(c: Context) {
    const userId = c.get('userId') as string;

    // Parse multipart form data
    const formData = await c.req.formData();
    const file = formData.get('file') as File;

    if (!file) {
      return c.json({ error: 'FILE_REQUIRED', message: 'No file provided' }, 400);
    }

    // Convert File to UploadedFile
    const buffer = Buffer.from(await file.arrayBuffer());
    const uploadedFile: UploadedFile = {
      filename: file.name,
      mimeType: file.type,
      size: file.size,
      buffer,
    };

    // Parse optional metadata
    const entityType = formData.get('entityType') as string | null;
    const entityId = formData.get('entityId') as string | null;
    const isPublicStr = formData.get('isPublic') as string | null;

    const dto = UploadMediaSchema.parse({
      entityType: entityType || undefined,
      entityId: entityId || undefined,
      isPublic: isPublicStr === 'true',
    });

    const media = await this.mediaService.uploadMedia(userId, uploadedFile, dto);

    return c.json({ media, message: 'Upload successful' }, 201);
  }

  // POST /media/upload/multiple
  async uploadMultiple(c: Context) {
    const userId = c.get('userId') as string;

    const formData = await c.req.formData();
    const files = formData.getAll('files') as File[];

    if (files.length === 0) {
      return c.json({ error: 'FILES_REQUIRED', message: 'No files provided' }, 400);
    }

    // Convert Files to UploadedFiles
    const uploadedFiles: UploadedFile[] = await Promise.all(
      files.map(async (file) => ({
        filename: file.name,
        mimeType: file.type,
        size: file.size,
        buffer: Buffer.from(await file.arrayBuffer()),
      })),
    );

    const entityType = formData.get('entityType') as string | null;
    const entityId = formData.get('entityId') as string | null;
    const isPublicStr = formData.get('isPublic') as string | null;

    const dto = UploadMediaSchema.parse({
      entityType: entityType || undefined,
      entityId: entityId || undefined,
      isPublic: isPublicStr === 'true',
    });

    const result = await this.mediaService.uploadMultiple(userId, uploadedFiles, dto);

    return c.json(
      {
        uploaded: result.uploaded,
        failed: result.failed,
        message: `${result.uploaded.length} files uploaded, ${result.failed.length} failed`,
      },
      201,
    );
  }

  // GET /media/:id
  async get(c: Context) {
    const userId = c.get('userId') as string;
    const mediaId = c.req.param('id');

    const media = await this.mediaService.getMedia(mediaId, userId);

    return c.json({ media });
  }

  // GET /media
  async list(c: Context) {
    const userId = c.get('userId') as string;

    const query = ListMediaQuerySchema.parse({
      limit: c.req.query('limit'),
      offset: c.req.query('offset'),
      type: c.req.query('type'),
      entityType: c.req.query('entityType'),
      entityId: c.req.query('entityId'),
    });

    const result = await this.mediaService.listUserMedia(userId, {
      ...query,
      type: query.type as MediaType | undefined,
    });

    return c.json(result);
  }

  // GET /media/entity/:entityType/:entityId
  async getEntityMedia(c: Context) {
    const userId = c.get('userId') as string;
    const entityType = c.req.param('entityType');
    const entityId = c.req.param('entityId');

    const media = await this.mediaService.getEntityMedia(entityType, entityId, userId);

    return c.json({ media });
  }

  // PATCH /media/:id
  async update(c: Context) {
    const userId = c.get('userId') as string;
    const mediaId = c.req.param('id');
    const body = UpdateMediaSchema.parse(await c.req.json());

    const media = await this.mediaService.updateMedia(mediaId, userId, body);

    return c.json({ media });
  }

  // DELETE /media/:id
  async delete(c: Context) {
    const userId = c.get('userId') as string;
    const mediaId = c.req.param('id');

    await this.mediaService.deleteMedia(mediaId, userId);

    return c.json({ message: 'Media deleted successfully' });
  }

  // POST /media/presigned-url
  async generatePresignedUrl(c: Context) {
    const userId = c.get('userId') as string;
    const body = GeneratePresignedUrlSchema.parse(await c.req.json());

    const result = await this.mediaService.generatePresignedUrl(userId, body);

    return c.json(result);
  }

  // GET /media/stats
  async getStats(c: Context) {
    const userId = c.get('userId') as string;

    const stats = await this.mediaService.getUserStorageStats(userId);

    return c.json({
      totalSize: stats.totalSize,
      totalSizeMB: Math.round((stats.totalSize / (1024 * 1024)) * 100) / 100,
      fileCount: stats.fileCount,
    });
  }
}
