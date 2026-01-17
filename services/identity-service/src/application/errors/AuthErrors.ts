// src/application/errors/AuthErrors.ts

/**
 * Base Auth Error
 */
export abstract class AuthError extends Error {
  abstract readonly code: string;
  abstract readonly statusCode: number;

  constructor(message: string) {
    super(message);
    this.name = this.constructor.name;
  }
}

/**
 * User already exists
 */
export class UserExistsError extends AuthError {
  readonly code = 'USER_EXISTS';
  readonly statusCode = 409;

  constructor(email: string) {
    super(`User with email ${email} already exists`);
  }
}

/**
 * Invalid credentials
 */
export class InvalidCredentialsError extends AuthError {
  readonly code = 'INVALID_CREDENTIALS';
  readonly statusCode = 401;

  constructor() {
    super('Invalid email or password');
  }
}

/**
 * Email not verified
 */
export class EmailNotVerifiedError extends AuthError {
  readonly code = 'EMAIL_NOT_VERIFIED';
  readonly statusCode = 403;

  constructor() {
    super('Please verify your email before logging in');
  }
}

/**
 * Account not active
 */
export class AccountNotActiveError extends AuthError {
  readonly code = 'ACCOUNT_NOT_ACTIVE';
  readonly statusCode = 403;

  constructor(reason?: string) {
    super(reason || 'Account is not active');
  }
}

/**
 * Invalid refresh token
 */
export class InvalidRefreshTokenError extends AuthError {
  readonly code = 'INVALID_REFRESH_TOKEN';
  readonly statusCode = 401;

  constructor(reason?: string) {
    super(reason || 'Invalid or expired refresh token');
  }
}

/**
 * User not found
 */
export class UserNotFoundError extends AuthError {
  readonly code = 'USER_NOT_FOUND';
  readonly statusCode = 404;

  constructor() {
    super('User not found');
  }
}

/**
 * Invalid verification code
 */
export class InvalidVerificationCodeError extends AuthError {
  readonly code = 'INVALID_VERIFICATION_CODE';
  readonly statusCode = 400;

  constructor(reason?: string) {
    super(reason || 'Invalid verification code');
  }
}

/**
 * Invalid reset token
 */
export class InvalidResetTokenError extends AuthError {
  readonly code = 'INVALID_RESET_TOKEN';
  readonly statusCode = 400;

  constructor(reason?: string) {
    super(reason || 'Invalid or expired reset token');
  }
}

/**
 * Two-factor authentication error
 */
export class TwoFactorError extends AuthError {
  readonly code = 'TWO_FACTOR_ERROR';
  readonly statusCode = 400;

  constructor(message: string) {
    super(message);
  }
}

/**
 * Two-factor required
 */
export class TwoFactorRequiredError extends AuthError {
  readonly code = 'TWO_FACTOR_REQUIRED';
  readonly statusCode = 403;

  constructor() {
    super('Two-factor authentication required');
  }
}

/**
 * Account locked
 */
export class AccountLockedError extends AuthError {
  readonly code = 'ACCOUNT_LOCKED';
  readonly statusCode = 403;

  unlockAt?: Date;

  constructor(unlockAt?: Date) {
    super(
      unlockAt
        ? `Account is locked. Try again after ${unlockAt.toISOString()}`
        : 'Account is temporarily locked due to too many failed attempts',
    );
    this.unlockAt = unlockAt;
  }
}

/**
 * Unauthorized
 */
export class UnauthorizedError extends AuthError {
  readonly code = 'UNAUTHORIZED';
  readonly statusCode = 401;

  constructor(message?: string) {
    super(message || 'Authentication required');
  }
}

/**
 * Forbidden
 */
export class ForbiddenError extends AuthError {
  readonly code = 'FORBIDDEN';
  readonly statusCode = 403;

  constructor(message?: string) {
    super(message || 'Access denied');
  }
}
