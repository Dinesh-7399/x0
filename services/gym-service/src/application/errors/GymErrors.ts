// src/application/errors/GymErrors.ts

export class GymError extends Error {
  constructor(
    public readonly code: string,
    message: string,
    public readonly statusCode: number = 400
  ) {
    super(message);
    this.name = 'GymError';
  }
}

export class GymNotFoundError extends GymError {
  constructor(identifier: string) {
    super('GYM_NOT_FOUND', `Gym not found: ${identifier}`, 404);
  }
}

export class GymSlugTakenError extends GymError {
  constructor(slug: string) {
    super('SLUG_TAKEN', `Gym slug already taken: ${slug}`, 409);
  }
}

export class UnauthorizedError extends GymError {
  constructor(message: string = 'Unauthorized') {
    super('UNAUTHORIZED', message, 403);
  }
}

export class ValidationError extends GymError {
  constructor(message: string) {
    super('VALIDATION_ERROR', message, 400);
  }
}
