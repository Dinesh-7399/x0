// src/interfaces/http/controllers/NotificationController.ts

import type { Context } from "hono";
import type { NotificationService } from "../../../application/services/NotificationService.js";
import {
  SendNotificationSchema,
  ListNotificationsQuerySchema,
  MarkReadSchema,
} from "../validation/schemas.js";
import {
  NotificationType,
  NotificationPriority,
  NotificationChannel,
} from "../../../domain/entities/Notification.js";

export class NotificationController {
  constructor(private readonly notificationService: NotificationService) { }

  /**
   * POST /internal/send (service-to-service)
   * Send a notification to a user
   */
  async send(c: Context) {
    const body = SendNotificationSchema.parse(await c.req.json());

    const notification = await this.notificationService.send({
      userId: body.userId,
      type: body.type as NotificationType,
      title: body.title,
      body: body.body,
      data: body.data,
      imageUrl: body.imageUrl,
      actionUrl: body.actionUrl,
      priority: body.priority as NotificationPriority | undefined,
      channels: body.channels as NotificationChannel[] | undefined,
      templateId: body.templateId,
      sourceService: body.sourceService,
      sourceEventId: body.sourceEventId,
      expiresAt: body.expiresAt ? new Date(body.expiresAt) : undefined,
      groupId: body.groupId,
    });

    return c.json({ notification }, 201);
  }

  /**
   * GET /notifications
   * List user's notifications
   */
  async list(c: Context) {
    const userId = c.get("userId") as string;

    const query = ListNotificationsQuerySchema.parse({
      unreadOnly: c.req.query("unreadOnly"),
      limit: c.req.query("limit"),
      offset: c.req.query("offset"),
    });

    const result = await this.notificationService.getNotifications(userId, {
      unreadOnly: query.unreadOnly,
      limit: query.limit,
      offset: query.offset,
    });

    return c.json(result);
  }

  /**
   * GET /notifications/unread-count
   */
  async getUnreadCount(c: Context) {
    const userId = c.get("userId") as string;
    const count = await this.notificationService.getUnreadCount(userId);
    return c.json({ unreadCount: count });
  }

  /**
   * GET /notifications/:id
   */
  async get(c: Context) {
    const userId = c.get("userId") as string;
    const notificationId = c.req.param("id");

    const notification = await this.notificationService.getNotification(
      userId,
      notificationId,
    );
    return c.json({ notification });
  }

  /**
   * POST /notifications/mark-read
   */
  async markRead(c: Context) {
    const userId = c.get("userId") as string;
    const body = MarkReadSchema.parse(await c.req.json());

    let count = 0;
    if (body.all) {
      count = await this.notificationService.markAllAsRead(userId);
    } else if (body.notificationIds && body.notificationIds.length > 0) {
      count = await this.notificationService.markMultipleAsRead(
        userId,
        body.notificationIds,
      );
    }

    return c.json({ markedCount: count });
  }

  /**
   * DELETE /notifications/:id
   */
  async delete(c: Context) {
    const userId = c.get("userId") as string;
    const notificationId = c.req.param("id");

    await this.notificationService.deleteNotification(userId, notificationId);
    return c.json({ message: "Notification deleted" });
  }
}
