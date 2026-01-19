// src/application/errors/AttendanceErrors.ts

export class AttendanceError extends Error {
  constructor(
    public readonly code: string,
    message: string,
    public readonly statusCode: number = 400,
  ) {
    super(message);
    this.name = "AttendanceError";
  }
}

// Check-in Validation
export class InvalidCheckInMethodError extends AttendanceError {
  constructor() {
    super("INVALID_METHOD", "Invalid check-in method provided", 400);
  }
}

export class AlreadyCheckedInError extends AttendanceError {
  constructor() {
    super("ALREADY_CHECKED_IN", "Member is already checked in. Please check out first.", 409);
  }
}

export class NotCheckedInError extends AttendanceError {
  constructor() {
    super("NOT_CHECKED_IN", "Member is not currently checked in", 409);
  }
}

// Token Errors
export class InvalidTokenError extends AttendanceError {
  constructor() {
    super("INVALID_TOKEN", "Check-in token is invalid or expired", 401);
  }
}

export class TokenExpiredError extends AttendanceError {
  constructor() {
    super("TOKEN_EXPIRED", "Check-in token has expired", 401);
  }
}

// Capacity Errors
export class GymCapacityExceededError extends AttendanceError {
  constructor() {
    super("GYM_CAPACITY_EXCEEDED", "Gym is currently at full capacity", 429);
  }
}

// Membership Errors (from integration)
export class MembershipInvalidError extends AttendanceError {
  constructor(reason: string) {
    super("MEMBERSHIP_INVALID", `Access denied: ${reason}`, 403);
  }
}

export class GymClosedError extends AttendanceError {
  constructor() {
    super("GYM_CLOSED", "Gym is currently closed", 403);
  }
}
