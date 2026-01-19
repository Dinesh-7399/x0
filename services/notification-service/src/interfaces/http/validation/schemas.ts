// src/interfaces/http/validation/schemas.ts

import { z } from "zod";

// UUID validation
const uuidSchema = z.string().uuid("Invalid ID format");

// ============================================
// Notification Schemas
// ============================================

export const SendNotificationSchema = z.object({
  userId: uuidSchema,
  type: z.string().min(1).max(50),
  title: z.string().min(1).max(200),
  body: z.string().max(2000),
  data: z.record(z.unknown()).optional(),
  imageUrl: z.string().url().optional(),
  actionUrl: z.string().optional(),
  priority: z.enum(["low", "normal", "high", "critical"]).optional(),
  channels: z.array(z.enum(["push", "email", "sms", "in_app"])).optional(),
  templateId: uuidSchema.optional(),
  sourceService: z.string().min(1).max(50),
  sourceEventId: z.string().max(100).optional(),
  expiresAt: z.string().datetime().optional(),
  groupId: z.string().max(50).optional(),
});

export const ListNotificationsQuerySchema = z.object({
  unreadOnly: z.coerce.boolean().optional(),
  limit: z.coerce.number().min(1).max(100).default(20),
  offset: z.coerce.number().min(0).default(0),
});

export const MarkReadSchema = z.object({
  notificationIds: z.array(uuidSchema).min(1).max(100).optional(),
  all: z.boolean().optional(),
});

// ============================================
// Preferences Schemas
// ============================================

export const UpdatePreferencesSchema = z.object({
  globalEnabled: z.boolean().optional(),
  quietHoursEnabled: z.boolean().optional(),
  quietHoursStart: z.string().regex(/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/).optional(),
  quietHoursEnd: z.string().regex(/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/).optional(),
  timezone: z.string().max(50).optional(),
  pushEnabled: z.boolean().optional(),
  emailEnabled: z.boolean().optional(),
  smsEnabled: z.boolean().optional(),
  inAppEnabled: z.boolean().optional(),
  workoutReminders: z.boolean().optional(),
  socialNotifications: z.boolean().optional(),
  chatNotifications: z.boolean().optional(),
  marketingEmails: z.boolean().optional(),
  gymAnnouncements: z.boolean().optional(),
  trainerMessages: z.boolean().optional(),
  paymentAlerts: z.boolean().optional(),
  emailDigestFrequency: z.enum(["realtime", "daily", "weekly", "never"]).optional(),
});

// ============================================
// Device Token Schemas
// ============================================

export const RegisterDeviceSchema = z.object({
  token: z.string().min(10).max(500),
  platform: z.enum(["ios", "android", "web"]),
  deviceId: z.string().min(5).max(100),
  appVersion: z.string().max(20).optional(),
});

// Types
export type SendNotificationInput = z.infer<typeof SendNotificationSchema>;
export type ListNotificationsQuery = z.infer<typeof ListNotificationsQuerySchema>;
export type MarkReadInput = z.infer<typeof MarkReadSchema>;
export type UpdatePreferencesInput = z.infer<typeof UpdatePreferencesSchema>;
export type RegisterDeviceInput = z.infer<typeof RegisterDeviceSchema>;
