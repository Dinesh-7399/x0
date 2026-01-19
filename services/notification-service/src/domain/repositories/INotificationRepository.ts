// src/domain/repositories/INotificationRepository.ts

import type { Notification, NotificationStatus } from "../entities/Notification.js";

export interface NotificationSearchOptions {
  userId: string;
  status?: NotificationStatus;
  unreadOnly?: boolean;
  limit: number;
  offset: number;
}

export interface NotificationListResult {
  notifications: Notification[];
  total: number;
  hasMore: boolean;
}

export interface INotificationRepository {
  save(notification: Notification): Promise<void>;
  findById(id: string): Promise<Notification | null>;
  findByIds(ids: string[]): Promise<Notification[]>;
  update(notification: Notification): Promise<void>;
  delete(id: string): Promise<void>;

  findByUser(options: NotificationSearchOptions): Promise<NotificationListResult>;
  findBySourceEventId(sourceEventId: string): Promise<Notification | null>;

  getUnreadCount(userId: string): Promise<number>;
  markAllAsRead(userId: string): Promise<number>;
  deleteOlderThan(date: Date): Promise<number>;
}
