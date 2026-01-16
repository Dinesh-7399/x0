// @gymato/errors - Custom Error Classes
// This package contains error classes used across all services

/**
 * Error codes for consistent error handling
 */
export const ErrorCodes = {
  // Client errors (4xx)
  BAD_REQUEST: 'BAD_REQUEST',
  UNAUTHORIZED: 'UNAUTHORIZED',
  FORBIDDEN: 'FORBIDDEN',
  NOT_FOUND: 'NOT_FOUND',
  CONFLICT: 'CONFLICT',
  VALIDATION_ERROR: 'VALIDATION_ERROR',
  RATE_LIMITED: 'RATE_LIMITED',

  // Server errors (5xx)
  INTERNAL_ERROR: 'INTERNAL_ERROR',
  SERVICE_UNAVAILABLE: 'SERVICE_UNAVAILABLE',
  DATABASE_ERROR: 'DATABASE_ERROR',
  EXTERNAL_SERVICE_ERROR: 'EXTERNAL_SERVICE_ERROR',
} as const;

export type ErrorCode = typeof ErrorCodes[keyof typeof ErrorCodes];

/**
 * Base application error class
 */
export class AppError extends Error {
  public readonly code: ErrorCode;
  public readonly statusCode: number;
  public readonly isOperational: boolean;
  public readonly details?: unknown;

  constructor(
    message: string,
    code: ErrorCode = ErrorCodes.INTERNAL_ERROR,
    statusCode = 500,
    details?: unknown
  ) {
    super(message);
    this.name = 'AppError';
    this.code = code;
    this.statusCode = statusCode;
    this.isOperational = true;
    this.details = details;

    // Maintains proper stack trace
    Error.captureStackTrace(this, this.constructor);
  }

  toJSON() {
    return {
      code: this.code,
      message: this.message,
      details: this.details,
    };
  }
}

/**
 * 400 Bad Request
 */
export class BadRequestError extends AppError {
  constructor(message = 'Bad request', details?: unknown) {
    super(message, ErrorCodes.BAD_REQUEST, 400, details);
    this.name = 'BadRequestError';
  }
}

/**
 * 401 Unauthorized
 */
export class UnauthorizedError extends AppError {
  constructor(message = 'Unauthorized', details?: unknown) {
    super(message, ErrorCodes.UNAUTHORIZED, 401, details);
    this.name = 'UnauthorizedError';
  }
}

/**
 * 403 Forbidden
 */
export class ForbiddenError extends AppError {
  constructor(message = 'Forbidden', details?: unknown) {
    super(message, ErrorCodes.FORBIDDEN, 403, details);
    this.name = 'ForbiddenError';
  }
}

/**
 * 404 Not Found
 */
export class NotFoundError extends AppError {
  constructor(resource = 'Resource', details?: unknown) {
    super(`${resource} not found`, ErrorCodes.NOT_FOUND, 404, details);
    this.name = 'NotFoundError';
  }
}

/**
 * 409 Conflict
 */
export class ConflictError extends AppError {
  constructor(message = 'Resource already exists', details?: unknown) {
    super(message, ErrorCodes.CONFLICT, 409, details);
    this.name = 'ConflictError';
  }
}

/**
 * 422 Validation Error
 */
export class ValidationError extends AppError {
  constructor(message = 'Validation failed', details?: unknown) {
    super(message, ErrorCodes.VALIDATION_ERROR, 422, details);
    this.name = 'ValidationError';
  }
}

/**
 * 429 Rate Limited
 */
export class RateLimitError extends AppError {
  constructor(message = 'Too many requests', details?: unknown) {
    super(message, ErrorCodes.RATE_LIMITED, 429, details);
    this.name = 'RateLimitError';
  }
}

/**
 * 503 Service Unavailable
 */
export class ServiceUnavailableError extends AppError {
  constructor(service = 'Service', details?: unknown) {
    super(`${service} is currently unavailable`, ErrorCodes.SERVICE_UNAVAILABLE, 503, details);
    this.name = 'ServiceUnavailableError';
  }
}

/**
 * Check if error is an AppError
 */
export function isAppError(error: unknown): error is AppError {
  return error instanceof AppError;
}
