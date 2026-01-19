// src/application/services/MediaService.ts

import { getAllowedMimeTypes, getConfig } from '../../config/index.js';
import { Media, MediaType } from '../../domain/entities/Media.js';
import type {
  IMediaRepository,
  MediaPaginationOptions,
} from '../../domain/repositories/IMediaRepository.js';
import type {
  IStorageService,
  UploadedFile,
} from '../../infrastructure/services/StorageService.js';
import type {
  GeneratePresignedUrlDto,
  ListMediaDto,
  MediaListResponse,
  MediaResponse,
  PresignedUrlResponse,
  UpdateMediaDto,
  UploadMediaDto,
} from '../dtos/media.dtos.js';
import {
  CannotDeleteMediaError,
  FileTooLargeError,
  MediaAccessDeniedError,
  MediaNotFoundError,
  TooManyFilesError,
  UnsupportedMediaTypeError,
} from '../errors/MediaErrors.js';

export class MediaService {
  constructor(
    private readonly mediaRepo: IMediaRepository,
    private readonly storageService: IStorageService,
  ) {}

  async uploadMedia(
    userId: string,
    file: UploadedFile,
    dto: UploadMediaDto,
  ): Promise<MediaResponse> {
    const config = getConfig();

    // Validate file size
    if (file.size > config.maxFileSize) {
      throw new FileTooLargeError(config.maxFileSize);
    }

    // Validate mime type
    const allowedTypes = getAllowedMimeTypes();
    if (!allowedTypes.includes(file.mimeType)) {
      throw new UnsupportedMediaTypeError(file.mimeType);
    }

    // Upload to storage
    const storageResult = await this.storageService.upload(file, userId);

    // Create media entity
    const media = Media.create(userId, file.filename, file.mimeType, file.size, storageResult.url, {
      type: Media.inferTypeFromMime(file.mimeType),
      entityType: dto.entityType,
      entityId: dto.entityId,
      isPublic: dto.isPublic,
      metadata: {
        originalFilename: file.filename,
        ...storageResult.metadata,
      },
    });

    // Set thumbnail if available
    if (storageResult.thumbnailUrl) {
      media.setThumbnail(storageResult.thumbnailUrl);
    }

    await this.mediaRepo.save(media);

    return this.toMediaResponse(media);
  }

  async uploadMultiple(
    userId: string,
    files: UploadedFile[],
    dto: UploadMediaDto,
  ): Promise<{ uploaded: MediaResponse[]; failed: { filename: string; error: string }[] }> {
    const config = getConfig();

    if (files.length > config.maxFilesPerUpload) {
      throw new TooManyFilesError(config.maxFilesPerUpload);
    }

    const uploaded: MediaResponse[] = [];
    const failed: { filename: string; error: string }[] = [];

    for (const file of files) {
      try {
        const result = await this.uploadMedia(userId, file, dto);
        uploaded.push(result);
      } catch (error) {
        failed.push({
          filename: file.filename,
          error: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    }

    return { uploaded, failed };
  }

  async getMedia(mediaId: string, userId: string): Promise<MediaResponse> {
    const media = await this.mediaRepo.findById(mediaId);
    if (!media || media.isDeleted) {
      throw new MediaNotFoundError(mediaId);
    }

    if (!media.canBeAccessedBy(userId)) {
      throw new MediaAccessDeniedError();
    }

    return this.toMediaResponse(media);
  }

  async listUserMedia(userId: string, dto: ListMediaDto): Promise<MediaListResponse> {
    const config = getConfig();
    const limit = Math.min(dto.limit || 20, 100);
    const offset = dto.offset || 0;

    const options: MediaPaginationOptions = {
      limit,
      offset,
      type: dto.type,
      entityType: dto.entityType,
      entityId: dto.entityId,
    };

    const result = await this.mediaRepo.findByUserId(userId, options);

    return {
      media: result.media.map((m) => this.toMediaResponse(m)),
      total: result.total,
      hasMore: result.hasMore,
      limit,
      offset,
    };
  }

  async getEntityMedia(
    entityType: string,
    entityId: string,
    userId: string,
  ): Promise<MediaResponse[]> {
    const mediaList = await this.mediaRepo.findByEntity(entityType, entityId);

    // Filter to only accessible media
    return mediaList.filter((m) => m.canBeAccessedBy(userId)).map((m) => this.toMediaResponse(m));
  }

  async updateMedia(mediaId: string, userId: string, dto: UpdateMediaDto): Promise<MediaResponse> {
    const media = await this.mediaRepo.findById(mediaId);
    if (!media || media.isDeleted) {
      throw new MediaNotFoundError(mediaId);
    }

    if (!media.canBeModifiedBy(userId)) {
      throw new MediaAccessDeniedError();
    }

    if (dto.entityType !== undefined && dto.entityId !== undefined) {
      media.attachToEntity(dto.entityType, dto.entityId);
    }

    if (dto.isPublic !== undefined) {
      if (dto.isPublic) {
        media.makePublic();
      } else {
        media.makePrivate();
      }
    }

    await this.mediaRepo.update(media);

    return this.toMediaResponse(media);
  }

  async deleteMedia(mediaId: string, userId: string): Promise<void> {
    const media = await this.mediaRepo.findById(mediaId);
    if (!media) {
      throw new MediaNotFoundError(mediaId);
    }

    if (!media.canBeModifiedBy(userId)) {
      throw new CannotDeleteMediaError();
    }

    // Delete from storage
    await this.storageService.delete(media.url);
    if (media.thumbnailUrl) {
      await this.storageService.delete(media.thumbnailUrl);
    }

    // Soft delete in database
    media.softDelete();
    await this.mediaRepo.update(media);
  }

  async generatePresignedUrl(
    userId: string,
    dto: GeneratePresignedUrlDto,
  ): Promise<PresignedUrlResponse> {
    const config = getConfig();

    // Validate file size
    if (dto.size > config.maxFileSize) {
      throw new FileTooLargeError(config.maxFileSize);
    }

    // Validate mime type
    const allowedTypes = getAllowedMimeTypes();
    if (!allowedTypes.includes(dto.mimeType)) {
      throw new UnsupportedMediaTypeError(dto.mimeType);
    }

    // Generate presigned URL
    const presigned = await this.storageService.generatePresignedUploadUrl(
      dto.filename,
      dto.mimeType,
      userId,
    );

    // Create pending media entry
    const media = Media.create(userId, dto.filename, dto.mimeType, dto.size, presigned.objectUrl, {
      entityType: dto.entityType,
      entityId: dto.entityId,
    });
    media.setStatus(Media.fromPersistence(media.props).props.status); // Keep as READY for now

    await this.mediaRepo.save(media);

    return {
      uploadUrl: presigned.uploadUrl,
      mediaId: media.id,
      expiresAt: presigned.expiresAt,
      fields: presigned.fields,
    };
  }

  async getUserStorageStats(userId: string): Promise<{ totalSize: number; fileCount: number }> {
    const [totalSize, fileCount] = await Promise.all([
      this.mediaRepo.getTotalSizeByUserId(userId),
      this.mediaRepo.getCountByUserId(userId),
    ]);

    return { totalSize, fileCount };
  }

  private toMediaResponse(media: Media): MediaResponse {
    return {
      id: media.id,
      userId: media.userId,
      type: media.type,
      filename: media.filename,
      mimeType: media.mimeType,
      size: media.size,
      url: media.url,
      thumbnailUrl: media.thumbnailUrl,
      status: media.status,
      metadata: media.metadata,
      entityType: media.entityType,
      entityId: media.entityId,
      isPublic: media.isPublic,
      createdAt: media.createdAt,
      updatedAt: media.updatedAt,
    };
  }
}
