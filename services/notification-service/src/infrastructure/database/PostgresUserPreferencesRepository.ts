// src/infrastructure/database/PostgresUserPreferencesRepository.ts

import { query, queryOne, execute } from "./postgres.js";
import type { IUserPreferencesRepository } from "../../domain/repositories/IUserPreferencesRepository.js";
import {
  UserPreferences,
  type UserPreferencesProps,
} from "../../domain/entities/UserPreferences.js";

interface PreferencesRow {
  id: string;
  user_id: string;
  global_enabled: boolean;
  quiet_hours_enabled: boolean;
  quiet_hours_start: string;
  quiet_hours_end: string;
  timezone: string;
  push_enabled: boolean;
  email_enabled: boolean;
  sms_enabled: boolean;
  in_app_enabled: boolean;
  workout_reminders: boolean;
  social_notifications: boolean;
  chat_notifications: boolean;
  marketing_emails: boolean;
  gym_announcements: boolean;
  trainer_messages: boolean;
  payment_alerts: boolean;
  email_digest_frequency: string;
  created_at: Date;
  updated_at: Date;
}

export class PostgresUserPreferencesRepository implements IUserPreferencesRepository {
  async save(preferences: UserPreferences): Promise<void> {
    const sql = `
      INSERT INTO user_notification_preferences (
        id, user_id, global_enabled, quiet_hours_enabled, quiet_hours_start,
        quiet_hours_end, timezone, push_enabled, email_enabled, sms_enabled,
        in_app_enabled, workout_reminders, social_notifications, chat_notifications,
        marketing_emails, gym_announcements, trainer_messages, payment_alerts,
        email_digest_frequency, created_at, updated_at
      ) VALUES (
        $1, $2, $3, $4, $5, $6, $7, $8, $9, $10,
        $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21
      )
    `;

    await execute(sql, [
      preferences.id,
      preferences.userId,
      preferences.globalEnabled,
      preferences.quietHoursEnabled,
      preferences.quietHoursStart,
      preferences.quietHoursEnd,
      preferences.timezone,
      preferences.pushEnabled,
      preferences.emailEnabled,
      preferences.smsEnabled,
      preferences.inAppEnabled,
      preferences.workoutReminders,
      preferences.socialNotifications,
      preferences.chatNotifications,
      preferences.marketingEmails,
      preferences.gymAnnouncements,
      preferences.trainerMessages,
      preferences.paymentAlerts,
      preferences.emailDigestFrequency,
      preferences.props.createdAt,
      preferences.props.updatedAt,
    ]);
  }

  async findById(id: string): Promise<UserPreferences | null> {
    const sql = `SELECT * FROM user_notification_preferences WHERE id = $1`;
    const row = await queryOne<PreferencesRow>(sql, [id]);
    return row ? this.toDomain(row) : null;
  }

  async findByUserId(userId: string): Promise<UserPreferences | null> {
    const sql = `SELECT * FROM user_notification_preferences WHERE user_id = $1`;
    const row = await queryOne<PreferencesRow>(sql, [userId]);
    return row ? this.toDomain(row) : null;
  }

  async update(preferences: UserPreferences): Promise<void> {
    const sql = `
      UPDATE user_notification_preferences SET
        global_enabled = $2, quiet_hours_enabled = $3, quiet_hours_start = $4,
        quiet_hours_end = $5, timezone = $6, push_enabled = $7, email_enabled = $8,
        sms_enabled = $9, in_app_enabled = $10, workout_reminders = $11,
        social_notifications = $12, chat_notifications = $13, marketing_emails = $14,
        gym_announcements = $15, trainer_messages = $16, payment_alerts = $17,
        email_digest_frequency = $18, updated_at = $19
      WHERE id = $1
    `;

    await execute(sql, [
      preferences.id,
      preferences.globalEnabled,
      preferences.quietHoursEnabled,
      preferences.quietHoursStart,
      preferences.quietHoursEnd,
      preferences.timezone,
      preferences.pushEnabled,
      preferences.emailEnabled,
      preferences.smsEnabled,
      preferences.inAppEnabled,
      preferences.workoutReminders,
      preferences.socialNotifications,
      preferences.chatNotifications,
      preferences.marketingEmails,
      preferences.gymAnnouncements,
      preferences.trainerMessages,
      preferences.paymentAlerts,
      preferences.emailDigestFrequency,
      preferences.props.updatedAt,
    ]);
  }

  async upsert(preferences: UserPreferences): Promise<void> {
    const sql = `
      INSERT INTO user_notification_preferences (
        id, user_id, global_enabled, quiet_hours_enabled, quiet_hours_start,
        quiet_hours_end, timezone, push_enabled, email_enabled, sms_enabled,
        in_app_enabled, workout_reminders, social_notifications, chat_notifications,
        marketing_emails, gym_announcements, trainer_messages, payment_alerts,
        email_digest_frequency, created_at, updated_at
      ) VALUES (
        $1, $2, $3, $4, $5, $6, $7, $8, $9, $10,
        $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21
      )
      ON CONFLICT (user_id) DO UPDATE SET
        global_enabled = EXCLUDED.global_enabled,
        quiet_hours_enabled = EXCLUDED.quiet_hours_enabled,
        quiet_hours_start = EXCLUDED.quiet_hours_start,
        quiet_hours_end = EXCLUDED.quiet_hours_end,
        timezone = EXCLUDED.timezone,
        push_enabled = EXCLUDED.push_enabled,
        email_enabled = EXCLUDED.email_enabled,
        sms_enabled = EXCLUDED.sms_enabled,
        in_app_enabled = EXCLUDED.in_app_enabled,
        workout_reminders = EXCLUDED.workout_reminders,
        social_notifications = EXCLUDED.social_notifications,
        chat_notifications = EXCLUDED.chat_notifications,
        marketing_emails = EXCLUDED.marketing_emails,
        gym_announcements = EXCLUDED.gym_announcements,
        trainer_messages = EXCLUDED.trainer_messages,
        payment_alerts = EXCLUDED.payment_alerts,
        email_digest_frequency = EXCLUDED.email_digest_frequency,
        updated_at = EXCLUDED.updated_at
    `;

    await execute(sql, [
      preferences.id,
      preferences.userId,
      preferences.globalEnabled,
      preferences.quietHoursEnabled,
      preferences.quietHoursStart,
      preferences.quietHoursEnd,
      preferences.timezone,
      preferences.pushEnabled,
      preferences.emailEnabled,
      preferences.smsEnabled,
      preferences.inAppEnabled,
      preferences.workoutReminders,
      preferences.socialNotifications,
      preferences.chatNotifications,
      preferences.marketingEmails,
      preferences.gymAnnouncements,
      preferences.trainerMessages,
      preferences.paymentAlerts,
      preferences.emailDigestFrequency,
      preferences.props.createdAt,
      preferences.props.updatedAt,
    ]);
  }

  private toDomain(row: PreferencesRow): UserPreferences {
    const props: UserPreferencesProps = {
      id: row.id,
      userId: row.user_id,
      globalEnabled: row.global_enabled,
      quietHoursEnabled: row.quiet_hours_enabled,
      quietHoursStart: row.quiet_hours_start,
      quietHoursEnd: row.quiet_hours_end,
      timezone: row.timezone,
      pushEnabled: row.push_enabled,
      emailEnabled: row.email_enabled,
      smsEnabled: row.sms_enabled,
      inAppEnabled: row.in_app_enabled,
      workoutReminders: row.workout_reminders,
      socialNotifications: row.social_notifications,
      chatNotifications: row.chat_notifications,
      marketingEmails: row.marketing_emails,
      gymAnnouncements: row.gym_announcements,
      trainerMessages: row.trainer_messages,
      paymentAlerts: row.payment_alerts,
      emailDigestFrequency: row.email_digest_frequency as any,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };

    return UserPreferences.fromPersistence(props);
  }
}
