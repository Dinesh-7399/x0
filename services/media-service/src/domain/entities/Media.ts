// src/domain/entities/Media.ts

export enum MediaType {
  IMAGE = 'image',
  VIDEO = 'video',
  DOCUMENT = 'document',
  AUDIO = 'audio',
}

export enum MediaStatus {
  PENDING = 'pending',
  PROCESSING = 'processing',
  READY = 'ready',
  FAILED = 'failed',
}

export interface MediaMetadata {
  width?: number;
  height?: number;
  duration?: number; // For video/audio in seconds
  thumbnailUrl?: string;
  originalFilename?: string;
  encoding?: string;
  bitrate?: number;
}

export interface MediaProps {
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
  entityType?: string; // 'workout', 'profile', 'gym', 'post', etc.
  entityId?: string; // Related entity ID
  isPublic: boolean;
  deletedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

export class Media {
  private constructor(public readonly props: MediaProps) {}

  get id(): string {
    return this.props.id;
  }
  get userId(): string {
    return this.props.userId;
  }
  get type(): MediaType {
    return this.props.type;
  }
  get filename(): string {
    return this.props.filename;
  }
  get mimeType(): string {
    return this.props.mimeType;
  }
  get size(): number {
    return this.props.size;
  }
  get url(): string {
    return this.props.url;
  }
  get thumbnailUrl(): string | undefined {
    return this.props.thumbnailUrl;
  }
  get status(): MediaStatus {
    return this.props.status;
  }
  get metadata(): MediaMetadata {
    return this.props.metadata;
  }
  get entityType(): string | undefined {
    return this.props.entityType;
  }
  get entityId(): string | undefined {
    return this.props.entityId;
  }
  get isPublic(): boolean {
    return this.props.isPublic;
  }
  get deletedAt(): Date | undefined {
    return this.props.deletedAt;
  }
  get createdAt(): Date {
    return this.props.createdAt;
  }
  get updatedAt(): Date {
    return this.props.updatedAt;
  }

  get isDeleted(): boolean {
    return !!this.props.deletedAt;
  }
  get isReady(): boolean {
    return this.props.status === MediaStatus.READY;
  }
  get isImage(): boolean {
    return this.props.type === MediaType.IMAGE;
  }
  get isVideo(): boolean {
    return this.props.type === MediaType.VIDEO;
  }

  static create(
    userId: string,
    filename: string,
    mimeType: string,
    size: number,
    url: string,
    options?: {
      type?: MediaType;
      entityType?: string;
      entityId?: string;
      isPublic?: boolean;
      metadata?: MediaMetadata;
    },
  ): Media {
    const type = options?.type || Media.inferTypeFromMime(mimeType);

    return new Media({
      id: crypto.randomUUID(),
      userId,
      type,
      filename,
      mimeType,
      size,
      url,
      status: MediaStatus.READY,
      metadata: options?.metadata || { originalFilename: filename },
      entityType: options?.entityType,
      entityId: options?.entityId,
      isPublic: options?.isPublic ?? false,
      createdAt: new Date(),
      updatedAt: new Date(),
    });
  }

  static fromPersistence(props: MediaProps): Media {
    return new Media(props);
  }

  static inferTypeFromMime(mimeType: string): MediaType {
    if (mimeType.startsWith('image/')) return MediaType.IMAGE;
    if (mimeType.startsWith('video/')) return MediaType.VIDEO;
    if (mimeType.startsWith('audio/')) return MediaType.AUDIO;
    return MediaType.DOCUMENT;
  }

  setThumbnail(thumbnailUrl: string): void {
    (this.props as { thumbnailUrl: string }).thumbnailUrl = thumbnailUrl;
    this.touch();
  }

  setStatus(status: MediaStatus): void {
    (this.props as { status: MediaStatus }).status = status;
    this.touch();
  }

  attachToEntity(entityType: string, entityId: string): void {
    (this.props as { entityType: string }).entityType = entityType;
    (this.props as { entityId: string }).entityId = entityId;
    this.touch();
  }

  makePublic(): void {
    (this.props as { isPublic: boolean }).isPublic = true;
    this.touch();
  }

  makePrivate(): void {
    (this.props as { isPublic: boolean }).isPublic = false;
    this.touch();
  }

  softDelete(): void {
    (this.props as { deletedAt: Date }).deletedAt = new Date();
    this.touch();
  }

  canBeAccessedBy(userId: string): boolean {
    return this.isPublic || this.userId === userId;
  }

  canBeModifiedBy(userId: string): boolean {
    return this.userId === userId && !this.isDeleted;
  }

  private touch(): void {
    (this.props as { updatedAt: Date }).updatedAt = new Date();
  }
}
