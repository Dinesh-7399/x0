// src/interfaces/http/routes/notification.routes.ts

import { Hono } from "hono";
import type { NotificationController } from "../controllers/NotificationController.js";

export function createNotificationRoutes(controller: NotificationController): Hono {
  const router = new Hono();

  // List notifications
  router.get("/", (c) => controller.list(c));

  // Unread count
  router.get("/unread-count", (c) => controller.getUnreadCount(c));

  // Mark as read (bulk)
  router.post("/mark-read", (c) => controller.markRead(c));

  // Get single notification
  router.get("/:id", (c) => controller.get(c));

  // Delete notification
  router.delete("/:id", (c) => controller.delete(c));

  return router;
}

export function createInternalRoutes(controller: NotificationController): Hono {
  const router = new Hono();

  // Service-to-service: Send notification
  router.post("/send", (c) => controller.send(c));

  return router;
}
