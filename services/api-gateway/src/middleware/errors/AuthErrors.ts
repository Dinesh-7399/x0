// src/middleware/errors/AuthErrors.ts

/**
 * Custom error types for authentication failures
 */

export class AuthError extends Error {
  constructor(
    message: string,
    public readonly code: string,
    public readonly statusCode: number = 401,
  ) {
    super(message);
    this.name = 'AuthError';
  }
}

export class TokenMissingError extends AuthError {
  constructor() {
    super('Authentication token is missing', 'TOKEN_MISSING', 401);
    this.name = 'TokenMissingError';
  }
}

export class TokenInvalidError extends AuthError {
  constructor() {
    super('Authentication token is invalid', 'TOKEN_INVALID', 401);
    this.name = 'TokenInvalidError';
  }
}

export class TokenExpiredError extends AuthError {
  constructor() {
    super('Authentication token has expired', 'TOKEN_EXPIRED', 401);
    this.name = 'TokenExpiredError';
  }
}

export class InsufficientPermissionsError extends AuthError {
  constructor(message: string = 'Insufficient permissions') {
    super(message, 'INSUFFICIENT_PERMISSIONS', 403);
    this.name = 'InsufficientPermissionsError';
  }
}