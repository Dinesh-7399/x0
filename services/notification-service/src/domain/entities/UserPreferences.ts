// src/domain/entities/UserPreferences.ts

export interface UserPreferencesProps {
  id: string;
  userId: string;

  // Global settings
  globalEnabled: boolean;
  quietHoursEnabled: boolean;
  quietHoursStart: string; // "22:00" 24-hour format
  quietHoursEnd: string; // "08:00"
  timezone: string;

  // Channel preferences
  pushEnabled: boolean;
  emailEnabled: boolean;
  smsEnabled: boolean;
  inAppEnabled: boolean;

  // Category preferences
  workoutReminders: boolean;
  socialNotifications: boolean;
  chatNotifications: boolean;
  marketingEmails: boolean;
  gymAnnouncements: boolean;
  trainerMessages: boolean;
  paymentAlerts: boolean;

  // Email frequency
  emailDigestFrequency: "realtime" | "daily" | "weekly" | "never";

  createdAt: Date;
  updatedAt: Date;
}

const TIME_PATTERN = /^([01]?[0-9]|2[0-3]):[0-5][0-9]$/;

export class UserPreferences {
  private constructor(public readonly props: UserPreferencesProps) { }

  get id(): string {
    return this.props.id;
  }
  get userId(): string {
    return this.props.userId;
  }
  get globalEnabled(): boolean {
    return this.props.globalEnabled;
  }
  get quietHoursEnabled(): boolean {
    return this.props.quietHoursEnabled;
  }
  get quietHoursStart(): string {
    return this.props.quietHoursStart;
  }
  get quietHoursEnd(): string {
    return this.props.quietHoursEnd;
  }
  get timezone(): string {
    return this.props.timezone;
  }
  get pushEnabled(): boolean {
    return this.props.pushEnabled;
  }
  get emailEnabled(): boolean {
    return this.props.emailEnabled;
  }
  get smsEnabled(): boolean {
    return this.props.smsEnabled;
  }
  get inAppEnabled(): boolean {
    return this.props.inAppEnabled;
  }
  get workoutReminders(): boolean {
    return this.props.workoutReminders;
  }
  get socialNotifications(): boolean {
    return this.props.socialNotifications;
  }
  get chatNotifications(): boolean {
    return this.props.chatNotifications;
  }
  get marketingEmails(): boolean {
    return this.props.marketingEmails;
  }
  get gymAnnouncements(): boolean {
    return this.props.gymAnnouncements;
  }
  get trainerMessages(): boolean {
    return this.props.trainerMessages;
  }
  get paymentAlerts(): boolean {
    return this.props.paymentAlerts;
  }
  get emailDigestFrequency(): string {
    return this.props.emailDigestFrequency;
  }

  /**
   * Create default preferences for a new user
   */
  static createDefault(userId: string): UserPreferences {
    if (!UserPreferences.isValidUuid(userId)) {
      throw new Error("Invalid user ID");
    }

    return new UserPreferences({
      id: crypto.randomUUID(),
      userId,
      globalEnabled: true,
      quietHoursEnabled: true,
      quietHoursStart: "22:00",
      quietHoursEnd: "08:00",
      timezone: "Asia/Kolkata",
      pushEnabled: true,
      emailEnabled: true,
      smsEnabled: true,
      inAppEnabled: true,
      workoutReminders: true,
      socialNotifications: true,
      chatNotifications: true,
      marketingEmails: false,
      gymAnnouncements: true,
      trainerMessages: true,
      paymentAlerts: true,
      emailDigestFrequency: "daily",
      createdAt: new Date(),
      updatedAt: new Date(),
    });
  }

  static fromPersistence(props: UserPreferencesProps): UserPreferences {
    return new UserPreferences(props);
  }

  /**
   * Check if notification can be sent based on preferences
   */
  canReceiveNotification(
    channel: "push" | "email" | "sms" | "in_app",
    category?: string,
  ): boolean {
    if (!this.globalEnabled) return false;

    // Check channel
    switch (channel) {
      case "push":
        if (!this.pushEnabled) return false;
        break;
      case "email":
        if (!this.emailEnabled) return false;
        break;
      case "sms":
        if (!this.smsEnabled) return false;
        break;
      case "in_app":
        if (!this.inAppEnabled) return false;
        break;
    }

    // Check category if provided
    if (category) {
      switch (category) {
        case "workout":
          return this.workoutReminders;
        case "social":
          return this.socialNotifications;
        case "chat":
          return this.chatNotifications;
        case "marketing":
          return this.marketingEmails;
        case "gym":
          return this.gymAnnouncements;
        case "trainer":
          return this.trainerMessages;
        case "payment":
          return this.paymentAlerts;
      }
    }

    return true;
  }

  /**
   * Check if current time is within quiet hours (user's timezone)
   */
  isInQuietHours(): boolean {
    if (!this.quietHoursEnabled) return false;

    const now = new Date();
    // Get current time in user's timezone
    const userTime = new Intl.DateTimeFormat("en-US", {
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
      timeZone: this.timezone,
    }).format(now);

    const currentMinutes = UserPreferences.timeToMinutes(userTime);
    const startMinutes = UserPreferences.timeToMinutes(this.quietHoursStart);
    const endMinutes = UserPreferences.timeToMinutes(this.quietHoursEnd);

    // Handle overnight quiet hours (e.g., 22:00 - 08:00)
    if (startMinutes > endMinutes) {
      return currentMinutes >= startMinutes || currentMinutes < endMinutes;
    }
    return currentMinutes >= startMinutes && currentMinutes < endMinutes;
  }

  update(
    updates: Partial<{
      globalEnabled: boolean;
      quietHoursEnabled: boolean;
      quietHoursStart: string;
      quietHoursEnd: string;
      timezone: string;
      pushEnabled: boolean;
      emailEnabled: boolean;
      smsEnabled: boolean;
      inAppEnabled: boolean;
      workoutReminders: boolean;
      socialNotifications: boolean;
      chatNotifications: boolean;
      marketingEmails: boolean;
      gymAnnouncements: boolean;
      trainerMessages: boolean;
      paymentAlerts: boolean;
      emailDigestFrequency: "realtime" | "daily" | "weekly" | "never";
    }>,
  ): void {
    if (updates.quietHoursStart !== undefined) {
      if (!TIME_PATTERN.test(updates.quietHoursStart)) {
        throw new Error("Invalid quiet hours start format (use HH:MM)");
      }
      (this.props as { quietHoursStart: string }).quietHoursStart =
        updates.quietHoursStart;
    }

    if (updates.quietHoursEnd !== undefined) {
      if (!TIME_PATTERN.test(updates.quietHoursEnd)) {
        throw new Error("Invalid quiet hours end format (use HH:MM)");
      }
      (this.props as { quietHoursEnd: string }).quietHoursEnd =
        updates.quietHoursEnd;
    }

    // Boolean updates
    const booleanFields = [
      "globalEnabled",
      "quietHoursEnabled",
      "pushEnabled",
      "emailEnabled",
      "smsEnabled",
      "inAppEnabled",
      "workoutReminders",
      "socialNotifications",
      "chatNotifications",
      "marketingEmails",
      "gymAnnouncements",
      "trainerMessages",
      "paymentAlerts",
    ] as const;

    for (const field of booleanFields) {
      if (updates[field] !== undefined) {
        (this.props as any)[field] = updates[field]!;
      }
    }

    if (updates.timezone !== undefined) {
      (this.props as { timezone: string }).timezone = updates.timezone;
    }

    if (updates.emailDigestFrequency !== undefined) {
      (
        this.props as {
          emailDigestFrequency: "realtime" | "daily" | "weekly" | "never";
        }
      ).emailDigestFrequency = updates.emailDigestFrequency;
    }

    (this.props as { updatedAt: Date }).updatedAt = new Date();
  }

  private static timeToMinutes(time: string): number {
    const [hours, minutes] = time.split(":").map(Number);
    return hours * 60 + minutes;
  }

  private static isValidUuid(id: string): boolean {
    return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
      id,
    );
  }
}
