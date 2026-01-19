// src/config/index.ts

export interface AttendanceServiceConfig {
  serviceName: string;
  port: number;
  nodeEnv: string;

  // Database
  databaseUrl: string;

  // Redis
  redisUrl: string;

  // JWT
  jwtSecret: string;
  internalServiceKey: string;

  // Business Rules
  qrTokenExpiryMinutes: number;
  maxCheckInsPerDay: number;
  autoCheckoutHours: number;
  streakFreezeLimitPerMonth: number;
}

let config: AttendanceServiceConfig | null = null;

export function getConfig(): AttendanceServiceConfig {
  if (config) return config;

  config = {
    serviceName: "attendance-service",
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
    internalServiceKey: process.env.INTERNAL_SERVICE_KEY || "",

    // Business Rules
    qrTokenExpiryMinutes: parseInt(
      process.env.QR_TOKEN_EXPIRY_MINUTES || "5",
      10,
    ),
    maxCheckInsPerDay: parseInt(process.env.MAX_CHECKINS_PER_DAY || "5", 10),
    autoCheckoutHours: parseInt(process.env.AUTO_CHECKOUT_HOURS || "4", 10),
    streakFreezeLimitPerMonth: parseInt(
      process.env.STREAK_FREEZE_LIMIT_PER_MONTH || "2",
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
    if (!cfg.internalServiceKey) {
      throw new Error("INTERNAL_SERVICE_KEY is required in production");
    }
  }
}
