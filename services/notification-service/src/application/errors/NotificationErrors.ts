// src/application/errors/NotificationErrors.ts

export class NotificationError extends Error {
  constructor(
    public readonly code: string,
    message: string,
    public readonly statusCode: number = 400,
  ) {
    super(message);
    this.name = "NotificationError";
  }
}

// Authorization
export class NotificationNotOwnedError extends NotificationError {
  constructor() {
    super("NOTIFICATION_NOT_OWNED", "You can only access your own notifications", 403);
  }
}

// Not Found
export class NotificationNotFoundError extends NotificationError {
  constructor(id?: string) {
    super(
      "NOTIFICATION_NOT_FOUND",
      id ? `Notification ${id} not found` : "Notification not found",
      404,
    );
  }
}

export class DeviceTokenNotFoundError extends NotificationError {
  constructor() {
    super("DEVICE_TOKEN_NOT_FOUND", "Device token not found", 404);
  }
}

export class PreferencesNotFoundError extends NotificationError {
  constructor() {
    super("PREFERENCES_NOT_FOUND", "User preferences not found", 404);
  }
}

// Validation
export class InvalidNotificationDataError extends NotificationError {
  constructor(reason: string) {
    super("INVALID_NOTIFICATION_DATA", reason, 400);
  }
}

export class InvalidDeviceTokenError extends NotificationError {
  constructor(reason: string) {
    super("INVALID_DEVICE_TOKEN", reason, 400);
  }
}

// Rate Limiting
export class NotificationRateLimitError extends NotificationError {
  constructor(channel: string) {
    super(
      "NOTIFICATION_RATE_LIMIT",
      `Rate limit exceeded for ${channel} notifications`,
      429,
    );
  }
}

// Delivery
export class DeliveryFailedError extends NotificationError {
  constructor(channel: string, reason: string) {
    super("DELIVERY_FAILED", `Failed to deliver ${channel} notification: ${reason}`, 500);
  }
}

// Preference Blocked
export class NotificationBlockedError extends NotificationError {
  constructor(reason: string) {
    super("NOTIFICATION_BLOCKED", `Notification blocked: ${reason}`, 400);
  }
}

// Duplicate
export class DuplicateNotificationError extends NotificationError {
  constructor() {
    super("DUPLICATE_NOTIFICATION", "Duplicate notification detected", 409);
  }
}
