// src/domain/entities/Notification.ts

export enum NotificationChannel {
  PUSH = "push",
  EMAIL = "email",
  SMS = "sms",
  IN_APP = "in_app",
}

export enum NotificationPriority {
  LOW = "low",
  NORMAL = "normal",
  HIGH = "high",
  CRITICAL = "critical",
}

export enum NotificationStatus {
  PENDING = "pending",
  QUEUED = "queued",
  DELIVERED = "delivered",
  READ = "read",
  FAILED = "failed",
  EXPIRED = "expired",
}

export enum NotificationType {
  // System
  WELCOME = "welcome",
  EMAIL_VERIFIED = "email_verified",
  PASSWORD_RESET = "password_reset",

  // Chat
  NEW_MESSAGE = "new_message",
  NEW_CONVERSATION = "new_conversation",

  // Workout
  WORKOUT_REMINDER = "workout_reminder",
  WORKOUT_COMPLETED = "workout_completed",
  PERSONAL_RECORD = "personal_record",

  // Trainer
  SESSION_BOOKED = "session_booked",
  SESSION_REMINDER = "session_reminder",
  SESSION_CANCELLED = "session_cancelled",

  // Social
  NEW_FOLLOWER = "new_follower",
  POST_LIKED = "post_liked",
  POST_COMMENTED = "post_commented",

  // Payment
  PAYMENT_SUCCESS = "payment_success",
  PAYMENT_FAILED = "payment_failed",
  SUBSCRIPTION_EXPIRING = "subscription_expiring",

  // Gym
  GYM_ANNOUNCEMENT = "gym_announcement",
  CLASS_REMINDER = "class_reminder",

  // Generic
  CUSTOM = "custom",
}

export interface NotificationProps {
  id: string;
  userId: string;
  type: NotificationType;
  title: string;
  body: string;
  data: Record<string, unknown>;
  imageUrl: string | null;
  actionUrl: string | null;
  priority: NotificationPriority;
  channels: NotificationChannel[];
  templateId: string | null;
  sourceService: string;
  sourceEventId: string | null;
  expiresAt: Date | null;
  groupId: string | null;
  status: NotificationStatus;
  readAt: Date | null;
  deletedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

// Validation limits
const MAX_TITLE_LENGTH = 200;
const MAX_BODY_LENGTH = 2000;
const MAX_DATA_SIZE = 4096;

export class Notification {
  private constructor(public readonly props: NotificationProps) { }

  get id(): string {
    return this.props.id;
  }
  get userId(): string {
    return this.props.userId;
  }
  get type(): NotificationType {
    return this.props.type;
  }
  get title(): string {
    return this.props.title;
  }
  get body(): string {
    return this.props.body;
  }
  get data(): Record<string, unknown> {
    return this.props.data;
  }
  get imageUrl(): string | null {
    return this.props.imageUrl;
  }
  get actionUrl(): string | null {
    return this.props.actionUrl;
  }
  get priority(): NotificationPriority {
    return this.props.priority;
  }
  get channels(): NotificationChannel[] {
    return this.props.channels;
  }
  get templateId(): string | null {
    return this.props.templateId;
  }
  get sourceService(): string {
    return this.props.sourceService;
  }
  get sourceEventId(): string | null {
    return this.props.sourceEventId;
  }
  get expiresAt(): Date | null {
    return this.props.expiresAt;
  }
  get groupId(): string | null {
    return this.props.groupId;
  }
  get status(): NotificationStatus {
    return this.props.status;
  }
  get readAt(): Date | null {
    return this.props.readAt;
  }
  get deletedAt(): Date | null {
    return this.props.deletedAt;
  }
  get createdAt(): Date {
    return this.props.createdAt;
  }
  get updatedAt(): Date {
    return this.props.updatedAt;
  }

  get isDeleted(): boolean {
    return this.props.deletedAt !== null;
  }
  get isRead(): boolean {
    return this.props.readAt !== null;
  }
  get isExpired(): boolean {
    return this.props.expiresAt !== null && this.props.expiresAt < new Date();
  }

  static create(
    userId: string,
    type: NotificationType,
    title: string,
    body: string,
    options: {
      data?: Record<string, unknown>;
      imageUrl?: string;
      actionUrl?: string;
      priority?: NotificationPriority;
      channels?: NotificationChannel[];
      templateId?: string;
      sourceService: string;
      sourceEventId?: string;
      expiresAt?: Date;
      groupId?: string;
    },
  ): Notification {
    // Validate UUID
    if (!Notification.isValidUuid(userId)) {
      throw new Error("Invalid user ID");
    }

    // Validate type
    if (!Object.values(NotificationType).includes(type)) {
      throw new Error("Invalid notification type");
    }

    // Validate and sanitize title
    const sanitizedTitle = Notification.sanitize(title);
    if (sanitizedTitle.length < 1) {
      throw new Error("Title is required");
    }
    if (sanitizedTitle.length > MAX_TITLE_LENGTH) {
      throw new Error(`Title cannot exceed ${MAX_TITLE_LENGTH} characters`);
    }

    // Validate and sanitize body
    const sanitizedBody = Notification.sanitize(body);
    if (sanitizedBody.length > MAX_BODY_LENGTH) {
      throw new Error(`Body cannot exceed ${MAX_BODY_LENGTH} characters`);
    }

    // Validate data size
    const data = options.data || {};
    const dataSize = JSON.stringify(data).length;
    if (dataSize > MAX_DATA_SIZE) {
      throw new Error(`Data payload cannot exceed ${MAX_DATA_SIZE} bytes`);
    }

    // Validate URLs
    if (options.imageUrl && !Notification.isValidUrl(options.imageUrl)) {
      throw new Error("Invalid image URL");
    }
    if (options.actionUrl && !Notification.isValidActionUrl(options.actionUrl)) {
      throw new Error("Invalid action URL");
    }

    // Validate channels
    const channels = options.channels || [NotificationChannel.IN_APP];
    for (const channel of channels) {
      if (!Object.values(NotificationChannel).includes(channel)) {
        throw new Error(`Invalid channel: ${channel}`);
      }
    }

    return new Notification({
      id: crypto.randomUUID(),
      userId,
      type,
      title: sanitizedTitle,
      body: sanitizedBody,
      data,
      imageUrl: options.imageUrl || null,
      actionUrl: options.actionUrl || null,
      priority: options.priority || NotificationPriority.NORMAL,
      channels,
      templateId: options.templateId || null,
      sourceService: options.sourceService,
      sourceEventId: options.sourceEventId || null,
      expiresAt: options.expiresAt || null,
      groupId: options.groupId || null,
      status: NotificationStatus.PENDING,
      readAt: null,
      deletedAt: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    });
  }

  static fromPersistence(props: NotificationProps): Notification {
    return new Notification(props);
  }

  markAsQueued(): void {
    (this.props as { status: NotificationStatus }).status =
      NotificationStatus.QUEUED;
    this.touch();
  }

  markAsDelivered(): void {
    (this.props as { status: NotificationStatus }).status =
      NotificationStatus.DELIVERED;
    this.touch();
  }

  markAsFailed(): void {
    (this.props as { status: NotificationStatus }).status =
      NotificationStatus.FAILED;
    this.touch();
  }

  markAsRead(): void {
    (this.props as { readAt: Date }).readAt = new Date();
    (this.props as { status: NotificationStatus }).status =
      NotificationStatus.READ;
    this.touch();
  }

  softDelete(): void {
    (this.props as { deletedAt: Date }).deletedAt = new Date();
    this.touch();
  }

  belongsTo(userId: string): boolean {
    return this.userId === userId;
  }

  private touch(): void {
    (this.props as { updatedAt: Date }).updatedAt = new Date();
  }

  private static sanitize(input: string): string {
    if (typeof input !== "string") return "";
    return input
      .replace(/\0/g, "")
      .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, "")
      .trim();
  }

  private static isValidUuid(id: string): boolean {
    return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
      id,
    );
  }

  private static isValidUrl(url: string): boolean {
    try {
      const parsed = new URL(url);
      return ["http:", "https:"].includes(parsed.protocol);
    } catch {
      return false;
    }
  }

  private static isValidActionUrl(url: string): boolean {
    // Allow deep links like gymato://workouts/123
    if (url.startsWith("gymato://")) return true;
    return Notification.isValidUrl(url);
  }
}
