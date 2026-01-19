// src/interfaces/http/controllers/PreferencesController.ts

import type { Context } from "hono";
import type { IUserPreferencesRepository } from "../../../domain/repositories/IUserPreferencesRepository.js";
import { UserPreferences } from "../../../domain/entities/UserPreferences.js";
import { UpdatePreferencesSchema } from "../validation/schemas.js";

export class PreferencesController {
  constructor(private readonly preferencesRepo: IUserPreferencesRepository) { }

  /**
   * GET /preferences
   */
  async get(c: Context) {
    const userId = c.get("userId") as string;

    let preferences = await this.preferencesRepo.findByUserId(userId);

    // Create default if not exists
    if (!preferences) {
      preferences = UserPreferences.createDefault(userId);
      await this.preferencesRepo.save(preferences);
    }

    return c.json({ preferences: this.toResponse(preferences) });
  }

  /**
   * PUT /preferences
   */
  async update(c: Context) {
    const userId = c.get("userId") as string;
    const body = UpdatePreferencesSchema.parse(await c.req.json());

    let preferences = await this.preferencesRepo.findByUserId(userId);

    if (!preferences) {
      preferences = UserPreferences.createDefault(userId);
    }

    preferences.update(body as any);
    await this.preferencesRepo.upsert(preferences);

    return c.json({ preferences: this.toResponse(preferences) });
  }

  private toResponse(preferences: UserPreferences) {
    return {
      globalEnabled: preferences.globalEnabled,
      quietHoursEnabled: preferences.quietHoursEnabled,
      quietHoursStart: preferences.quietHoursStart,
      quietHoursEnd: preferences.quietHoursEnd,
      timezone: preferences.timezone,
      pushEnabled: preferences.pushEnabled,
      emailEnabled: preferences.emailEnabled,
      smsEnabled: preferences.smsEnabled,
      inAppEnabled: preferences.inAppEnabled,
      workoutReminders: preferences.workoutReminders,
      socialNotifications: preferences.socialNotifications,
      chatNotifications: preferences.chatNotifications,
      marketingEmails: preferences.marketingEmails,
      gymAnnouncements: preferences.gymAnnouncements,
      trainerMessages: preferences.trainerMessages,
      paymentAlerts: preferences.paymentAlerts,
      emailDigestFrequency: preferences.emailDigestFrequency,
    };
  }
}
