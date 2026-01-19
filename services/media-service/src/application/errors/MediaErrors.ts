// src/application/errors/MediaErrors.ts

export class MediaError extends Error {
  constructor(
    public readonly code: string,
    message: string,
    public readonly statusCode: number = 400,
  ) {
    super(message);
    this.name = 'MediaError';
  }
}

// Not Found Errors
export class MediaNotFoundError extends MediaError {
  constructor(mediaId?: string) {
    super('MEDIA_NOT_FOUND', mediaId ? `Media ${mediaId} not found` : 'Media not found', 404);
  }
}

// Upload Errors
export class FileTooLargeError extends MediaError {
  constructor(maxSize: number) {
    const maxMB = Math.round(maxSize / (1024 * 1024));
    super('FILE_TOO_LARGE', `File exceeds maximum size of ${maxMB}MB`, 413);
  }
}

export class UnsupportedMediaTypeError extends MediaError {
  constructor(mimeType: string) {
    super('UNSUPPORTED_MEDIA_TYPE', `File type ${mimeType} is not supported`, 415);
  }
}

export class TooManyFilesError extends MediaError {
  constructor(maxFiles: number) {
    super('TOO_MANY_FILES', `Maximum of ${maxFiles} files allowed per upload`, 400);
  }
}

export class UploadFailedError extends MediaError {
  constructor(reason?: string) {
    super('UPLOAD_FAILED', reason || 'File upload failed', 500);
  }
}

export class StorageQuotaExceededError extends MediaError {
  constructor(quotaBytes: number) {
    const quotaGB = Math.round(quotaBytes / (1024 * 1024 * 1024));
    super('STORAGE_QUOTA_EXCEEDED', `Storage quota of ${quotaGB}GB exceeded`, 403);
  }
}

// Permission Errors
export class MediaAccessDeniedError extends MediaError {
  constructor() {
    super('MEDIA_ACCESS_DENIED', 'You do not have access to this media', 403);
  }
}

export class CannotDeleteMediaError extends MediaError {
  constructor() {
    super('CANNOT_DELETE_MEDIA', 'You cannot delete this media', 403);
  }
}

// Processing Errors
export class MediaProcessingError extends MediaError {
  constructor(mediaId: string, reason?: string) {
    super('MEDIA_PROCESSING_FAILED', reason || `Failed to process media ${mediaId}`, 500);
  }
}

// Storage Errors
export class StorageError extends MediaError {
  constructor(operation: string, reason?: string) {
    super('STORAGE_ERROR', reason || `Storage ${operation} operation failed`, 500);
  }
}
