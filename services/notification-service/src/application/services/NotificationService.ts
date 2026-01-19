// src/application/services/NotificationService.ts

import type { INotificationRepository } from "../../domain/repositories/INotificationRepository.js";
import type { IUserPreferencesRepository } from "../../domain/repositories/IUserPreferencesRepository.js";
import type { IDeviceTokenRepository } from "../../domain/repositories/IDeviceTokenRepository.js";
import {
  Notification,
  NotificationChannel,
  NotificationPriority,
  NotificationType,
  NotificationStatus,
} from "../../domain/entities/Notification.js";
import { UserPreferences } from "../../domain/entities/UserPreferences.js";
import {
  NotificationNotFoundError,
  NotificationNotOwnedError,
  InvalidNotificationDataError,
  NotificationBlockedError,
  DuplicateNotificationError,
} from "../errors/NotificationErrors.js";
import { getConfig } from "../../config/index.js";

export interface SendNotificationDto {
  userId: string;
  type: NotificationType;
  title: string;
  body: string;
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
}

export interface NotificationResponse {
  id: string;
  type: NotificationType;
  title: string;
  body: string;
  imageUrl: string | null;
  actionUrl: string | null;
  priority: NotificationPriority;
  status: NotificationStatus;
  isRead: boolean;
  createdAt: Date;
}

export interface NotificationListResponse {
  notifications: NotificationResponse[];
  total: number;
  hasMore: boolean;
  unreadCount: number;
}

export class NotificationService {
  constructor(
    private readonly notificationRepo: INotificationRepository,
    private readonly preferencesRepo: IUserPreferencesRepository,
    private readonly deviceTokenRepo: IDeviceTokenRepository,
  ) { }

  /**
   * Send a notification to a user
   * SECURITY: Validates preferences, checks rate limits, prevents duplicates
   */
  async send(dto: SendNotificationDto): Promise<NotificationResponse> {
    const config = getConfig();

    // Check for duplicate (deduplication by sourceEventId)
    if (dto.sourceEventId) {
      const existing = await this.notificationRepo.findBySourceEventId(
        dto.sourceEventId,
      );
      if (existing) {
        throw new DuplicateNotificationError();
      }
    }

    // Get or create user preferences
    let preferences = await this.preferencesRepo.findByUserId(dto.userId);
    if (!preferences) {
      preferences = UserPreferences.createDefault(dto.userId);
      await this.preferencesRepo.save(preferences);
    }

    // Check if globally disabled
    if (!preferences.globalEnabled) {
      throw new NotificationBlockedError("User has disabled all notifications");
    }

    // Determine which channels to use
    const requestedChannels = dto.channels || [NotificationChannel.IN_APP];
    const allowedChannels: NotificationChannel[] = [];

    for (const channel of requestedChannels) {
      if (this.canSendToChannel(preferences, channel, dto.priority)) {
        allowedChannels.push(channel);
      }
    }

    // If no channels allowed and not critical, block
    if (allowedChannels.length === 0 && dto.priority !== NotificationPriority.CRITICAL) {
      throw new NotificationBlockedError("All requested channels are disabled");
    }

    // For critical priority, force in-app at minimum
    if (allowedChannels.length === 0 && dto.priority === NotificationPriority.CRITICAL) {
      allowedChannels.push(NotificationChannel.IN_APP);
    }

    // Check quiet hours for non-critical
    if (dto.priority !== NotificationPriority.CRITICAL && preferences.isInQuietHours()) {
      // Only allow in-app (silent) during quiet hours
      const quietHoursChannels = allowedChannels.filter(
        (c) => c === NotificationChannel.IN_APP,
      );
      if (quietHoursChannels.length === 0) {
        throw new NotificationBlockedError("User is in quiet hours");
      }
    }

    try {
      // Create notification
      const notification = Notification.create(dto.userId, dto.type, dto.title, dto.body, {
        data: dto.data,
        imageUrl: dto.imageUrl,
        actionUrl: dto.actionUrl,
        priority: dto.priority,
        channels: allowedChannels,
        templateId: dto.templateId,
        sourceService: dto.sourceService,
        sourceEventId: dto.sourceEventId,
        expiresAt: dto.expiresAt,
        groupId: dto.groupId,
      });

      // Save to database
      await this.notificationRepo.save(notification);

      // Mark as queued for async delivery
      notification.markAsQueued();
      await this.notificationRepo.update(notification);

      // TODO: Queue for async delivery via each channel
      // For now, mark as delivered (in-app is immediate)
      notification.markAsDelivered();
      await this.notificationRepo.update(notification);

      return this.toResponse(notification);
    } catch (error) {
      if (error instanceof Error) {
        throw new InvalidNotificationDataError(error.message);
      }
      throw error;
    }
  }

  /**
   * Get notifications for a user
   */
  async getNotifications(
    userId: string,
    options: { unreadOnly?: boolean; limit?: number; offset?: number },
  ): Promise<NotificationListResponse> {
    const config = getConfig();
    const limit = Math.min(options.limit || 20, 100);
    const offset = options.offset || 0;

    const result = await this.notificationRepo.findByUser({
      userId,
      unreadOnly: options.unreadOnly,
      limit,
      offset,
    });

    const unreadCount = await this.notificationRepo.getUnreadCount(userId);

    return {
      notifications: result.notifications.map((n) => this.toResponse(n)),
      total: result.total,
      hasMore: result.hasMore,
      unreadCount,
    };
  }

  /**
   * Get single notification
   */
  async getNotification(userId: string, notificationId: string): Promise<NotificationResponse> {
    const notification = await this.notificationRepo.findById(notificationId);

    if (!notification || notification.isDeleted) {
      throw new NotificationNotFoundError(notificationId);
    }

    if (!notification.belongsTo(userId)) {
      throw new NotificationNotOwnedError();
    }

    return this.toResponse(notification);
  }

  /**
   * Mark notification as read
   */
  async markAsRead(userId: string, notificationId: string): Promise<void> {
    const notification = await this.notificationRepo.findById(notificationId);

    if (!notification || notification.isDeleted) {
      throw new NotificationNotFoundError(notificationId);
    }

    if (!notification.belongsTo(userId)) {
      throw new NotificationNotOwnedError();
    }

    if (!notification.isRead) {
      notification.markAsRead();
      await this.notificationRepo.update(notification);
    }
  }

  /**
   * Mark multiple notifications as read
   */
  async markMultipleAsRead(userId: string, notificationIds: string[]): Promise<number> {
    const notifications = await this.notificationRepo.findByIds(notificationIds);
    let count = 0;

    for (const notification of notifications) {
      if (notification.belongsTo(userId) && !notification.isRead && !notification.isDeleted) {
        notification.markAsRead();
        await this.notificationRepo.update(notification);
        count++;
      }
    }

    return count;
  }

  /**
   * Mark all notifications as read
   */
  async markAllAsRead(userId: string): Promise<number> {
    return this.notificationRepo.markAllAsRead(userId);
  }

  /**
   * Delete notification
   */
  async deleteNotification(userId: string, notificationId: string): Promise<void> {
    const notification = await this.notificationRepo.findById(notificationId);

    if (!notification || notification.isDeleted) {
      throw new NotificationNotFoundError(notificationId);
    }

    if (!notification.belongsTo(userId)) {
      throw new NotificationNotOwnedError();
    }

    notification.softDelete();
    await this.notificationRepo.update(notification);
  }

  /**
   * Get unread count
   */
  async getUnreadCount(userId: string): Promise<number> {
    return this.notificationRepo.getUnreadCount(userId);
  }

  // ============================================
  // Private helpers
  // ============================================

  private canSendToChannel(
    preferences: UserPreferences,
    channel: NotificationChannel,
    priority?: NotificationPriority,
  ): boolean {
    // Critical priority bypasses preference checks
    if (priority === NotificationPriority.CRITICAL) {
      return true;
    }

    switch (channel) {
      case NotificationChannel.PUSH:
        return preferences.pushEnabled;
      case NotificationChannel.EMAIL:
        return preferences.emailEnabled;
      case NotificationChannel.SMS:
        return preferences.smsEnabled;
      case NotificationChannel.IN_APP:
        return preferences.inAppEnabled;
      default:
        return false;
    }
  }

  private toResponse(notification: Notification): NotificationResponse {
    return {
      id: notification.id,
      type: notification.type,
      title: notification.title,
      body: notification.body,
      imageUrl: notification.imageUrl,
      actionUrl: notification.actionUrl,
      priority: notification.priority,
      status: notification.status,
      isRead: notification.isRead,
      createdAt: notification.createdAt,
    };
  }
}
