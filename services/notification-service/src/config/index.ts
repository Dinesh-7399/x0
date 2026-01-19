// src/config/index.ts

export interface NotificationServiceConfig {
  serviceName: string;
  port: number;
  nodeEnv: string;

  // Database
  databaseUrl: string;

  // Redis
  redisUrl: string;

  // JWT
  jwtSecret: string;

  // Push Notifications (Firebase)
  fcmProjectId: string;
  fcmPrivateKey: string;
  fcmClientEmail: string;

  // Email (SendGrid)
  sendgridApiKey: string;
  sendgridFromEmail: string;
  sendgridFromName: string;

  // SMS (Twilio)
  twilioAccountSid: string;
  twilioAuthToken: string;
  twilioFromNumber: string;

  // Rate Limits
  maxNotificationsPerUserPerHour: number;
  maxSmsPerUserPerDay: number;
  maxEmailsPerUserPerDay: number;

  // Preferences
  defaultQuietHoursStart: string;
  defaultQuietHoursEnd: string;

  // Retention
  notificationRetentionDays: number;
}

let config: NotificationServiceConfig | null = null;

export function getConfig(): NotificationServiceConfig {
  if (config) return config;

  config = {
    serviceName: "notification-service",
    port: parseInt(process.env.PORT || "8080", 10),
    nodeEnv: process.env.NODE_ENV || "development",

    // Database
    databaseUrl:
      process.env.DATABASE_URL ||
      "postgresql://gymato:password@localhost:5432/gymato",

    // Redis
    redisUrl: process.env.REDIS_URL || "redis://localhost:6379",

    // JWT
    jwtSecret: process.env.JWT_SECRET || "",

    // Firebase (Push)
    fcmProjectId: process.env.FCM_PROJECT_ID || "",
    fcmPrivateKey: (process.env.FCM_PRIVATE_KEY || "").replace(/\\n/g, "\n"),
    fcmClientEmail: process.env.FCM_CLIENT_EMAIL || "",

    // SendGrid (Email)
    sendgridApiKey: process.env.SENDGRID_API_KEY || "",
    sendgridFromEmail: process.env.SENDGRID_FROM_EMAIL || "noreply@gymato.com",
    sendgridFromName: process.env.SENDGRID_FROM_NAME || "Gymato",

    // Twilio (SMS)
    twilioAccountSid: process.env.TWILIO_ACCOUNT_SID || "",
    twilioAuthToken: process.env.TWILIO_AUTH_TOKEN || "",
    twilioFromNumber: process.env.TWILIO_FROM_NUMBER || "",

    // Rate Limits
    maxNotificationsPerUserPerHour: parseInt(
      process.env.MAX_NOTIFICATIONS_PER_USER_PER_HOUR || "100",
      10,
    ),
    maxSmsPerUserPerDay: parseInt(
      process.env.MAX_SMS_PER_USER_PER_DAY || "5",
      10,
    ),
    maxEmailsPerUserPerDay: parseInt(
      process.env.MAX_EMAILS_PER_USER_PER_DAY || "50",
      10,
    ),

    // Preferences
    defaultQuietHoursStart: process.env.DEFAULT_QUIET_HOURS_START || "22:00",
    defaultQuietHoursEnd: process.env.DEFAULT_QUIET_HOURS_END || "08:00",

    // Retention
    notificationRetentionDays: parseInt(
      process.env.NOTIFICATION_RETENTION_DAYS || "30",
      10,
    ),
  };

  return config;
}

export function validateConfig(): void {
  const cfg = getConfig();

  if (cfg.nodeEnv === "production") {
    if (!cfg.jwtSecret) {
      throw new Error("JWT_SECRET is required in production");
    }
    // Warn about missing providers
    if (!cfg.fcmProjectId) {
      console.warn("WARNING: FCM not configured, push notifications will fail");
    }
    if (!cfg.sendgridApiKey) {
      console.warn("WARNING: SendGrid not configured, emails will fail");
    }
    if (!cfg.twilioAccountSid) {
      console.warn("WARNING: Twilio not configured, SMS will fail");
    }
  }
}
