// src/application/errors/UserErrors.ts

export abstract class UserError extends Error {
  abstract readonly code: string;
  abstract readonly statusCode: number;

  constructor(message: string) {
    super(message);
    this.name = this.constructor.name;
  }
}

export class ProfileNotFoundError extends UserError {
  readonly code = 'PROFILE_NOT_FOUND';
  readonly statusCode = 404;

  constructor() {
    super('Profile not found');
  }
}

export class UserNotFoundError extends UserError {
  readonly code = 'USER_NOT_FOUND';
  readonly statusCode = 404;

  constructor() {
    super('User not found');
  }
}

export class UnauthorizedError extends UserError {
  readonly code = 'UNAUTHORIZED';
  readonly statusCode = 401;

  constructor(message?: string) {
    super(message || 'Authentication required');
  }
}

export class ForbiddenError extends UserError {
  readonly code = 'FORBIDDEN';
  readonly statusCode = 403;

  constructor(message?: string) {
    super(message || 'Access denied');
  }
}
