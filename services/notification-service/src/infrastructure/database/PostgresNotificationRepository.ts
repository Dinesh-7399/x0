// src/infrastructure/database/PostgresNotificationRepository.ts

import { query, queryOne, execute } from "./postgres.js";
import type {
  INotificationRepository,
  NotificationSearchOptions,
  NotificationListResult,
} from "../../domain/repositories/INotificationRepository.js";
import {
  Notification,
  type NotificationProps,
  NotificationChannel,
  NotificationPriority,
  NotificationType,
  NotificationStatus,
} from "../../domain/entities/Notification.js";

interface NotificationRow {
  id: string;
  user_id: string;
  type: string;
  title: string;
  body: string;
  data: Record<string, unknown>;
  image_url: string | null;
  action_url: string | null;
  priority: string;
  channels: string[];
  template_id: string | null;
  source_service: string;
  source_event_id: string | null;
  expires_at: Date | null;
  group_id: string | null;
  status: string;
  read_at: Date | null;
  deleted_at: Date | null;
  created_at: Date;
  updated_at: Date;
}

export class PostgresNotificationRepository implements INotificationRepository {
  async save(notification: Notification): Promise<void> {
    const sql = `
      INSERT INTO notifications (
        id, user_id, type, title, body, data, image_url, action_url,
        priority, channels, template_id, source_service, source_event_id,
        expires_at, group_id, status, read_at, deleted_at, created_at, updated_at
      ) VALUES (
        $1, $2, $3, $4, $5, $6, $7, $8, $9, $10,
        $11, $12, $13, $14, $15, $16, $17, $18, $19, $20
      )
    `;

    await execute(sql, [
      notification.id,
      notification.userId,
      notification.type,
      notification.title,
      notification.body,
      JSON.stringify(notification.data),
      notification.imageUrl,
      notification.actionUrl,
      notification.priority,
      notification.channels,
      notification.templateId,
      notification.sourceService,
      notification.sourceEventId,
      notification.expiresAt,
      notification.groupId,
      notification.status,
      notification.readAt,
      notification.deletedAt,
      notification.createdAt,
      notification.updatedAt,
    ]);
  }

  async findById(id: string): Promise<Notification | null> {
    const sql = `SELECT * FROM notifications WHERE id = $1`;
    const row = await queryOne<NotificationRow>(sql, [id]);
    return row ? this.toDomain(row) : null;
  }

  async findByIds(ids: string[]): Promise<Notification[]> {
    if (ids.length === 0) return [];

    const placeholders = ids.map((_, i) => `$${i + 1}`).join(", ");
    const sql = `SELECT * FROM notifications WHERE id IN (${placeholders})`;
    const rows = await query<NotificationRow>(sql, ids);
    return rows.map((row) => this.toDomain(row));
  }

  async update(notification: Notification): Promise<void> {
    const sql = `
      UPDATE notifications SET
        status = $2, read_at = $3, deleted_at = $4, updated_at = $5
      WHERE id = $1
    `;

    await execute(sql, [
      notification.id,
      notification.status,
      notification.readAt,
      notification.deletedAt,
      notification.updatedAt,
    ]);
  }

  async delete(id: string): Promise<void> {
    await execute(`UPDATE notifications SET deleted_at = NOW() WHERE id = $1`, [id]);
  }

  async findByUser(options: NotificationSearchOptions): Promise<NotificationListResult> {
    const conditions: string[] = ["user_id = $1", "deleted_at IS NULL"];
    const params: unknown[] = [options.userId];
    let paramIndex = 2;

    if (options.status) {
      conditions.push(`status = $${paramIndex}`);
      params.push(options.status);
      paramIndex++;
    }

    if (options.unreadOnly) {
      conditions.push(`read_at IS NULL`);
    }

    const whereClause = conditions.join(" AND ");

    // Count
    const countSql = `SELECT COUNT(*) as total FROM notifications WHERE ${whereClause}`;
    const countResult = await queryOne<{ total: string }>(countSql, params);
    const total = parseInt(countResult?.total || "0", 10);

    // Data
    const dataSql = `
      SELECT * FROM notifications
      WHERE ${whereClause}
      ORDER BY created_at DESC
      LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
    `;
    params.push(options.limit, options.offset);

    const rows = await query<NotificationRow>(dataSql, params);

    return {
      notifications: rows.map((row) => this.toDomain(row)),
      total,
      hasMore: options.offset + rows.length < total,
    };
  }

  async findBySourceEventId(sourceEventId: string): Promise<Notification | null> {
    const sql = `
      SELECT * FROM notifications
      WHERE source_event_id = $1 AND deleted_at IS NULL
      LIMIT 1
    `;
    const row = await queryOne<NotificationRow>(sql, [sourceEventId]);
    return row ? this.toDomain(row) : null;
  }

  async getUnreadCount(userId: string): Promise<number> {
    const sql = `
      SELECT COUNT(*) as total FROM notifications
      WHERE user_id = $1 AND read_at IS NULL AND deleted_at IS NULL
    `;
    const result = await queryOne<{ total: string }>(sql, [userId]);
    return parseInt(result?.total || "0", 10);
  }

  async markAllAsRead(userId: string): Promise<number> {
    const sql = `
      UPDATE notifications SET read_at = NOW(), status = 'read', updated_at = NOW()
      WHERE user_id = $1 AND read_at IS NULL AND deleted_at IS NULL
    `;
    return execute(sql, [userId]);
  }

  async deleteOlderThan(date: Date): Promise<number> {
    const sql = `DELETE FROM notifications WHERE created_at < $1`;
    return execute(sql, [date]);
  }

  private toDomain(row: NotificationRow): Notification {
    const data = typeof row.data === "string" ? JSON.parse(row.data) : row.data || {};

    const props: NotificationProps = {
      id: row.id,
      userId: row.user_id,
      type: row.type as NotificationType,
      title: row.title,
      body: row.body,
      data,
      imageUrl: row.image_url,
      actionUrl: row.action_url,
      priority: row.priority as NotificationPriority,
      channels: (row.channels || []) as NotificationChannel[],
      templateId: row.template_id,
      sourceService: row.source_service,
      sourceEventId: row.source_event_id,
      expiresAt: row.expires_at,
      groupId: row.group_id,
      status: row.status as NotificationStatus,
      readAt: row.read_at,
      deletedAt: row.deleted_at,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };

    return Notification.fromPersistence(props);
  }
}
