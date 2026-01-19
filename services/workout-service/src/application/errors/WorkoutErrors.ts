// src/application/errors/WorkoutErrors.ts

/**
 * Application-level errors for workout-service
 * Each error has a unique code for client handling
 */

export class WorkoutError extends Error {
  constructor(
    public readonly code: string,
    message: string,
    public readonly statusCode: number = 400,
  ) {
    super(message);
    this.name = 'WorkoutError';
  }
}

// ============================================
// Authorization Errors (403)
// ============================================

export class NotAuthorizedError extends WorkoutError {
  constructor(action = 'perform this action') {
    super('NOT_AUTHORIZED', `You are not authorized to ${action}`, 403);
  }
}

export class ExerciseNotOwnedError extends WorkoutError {
  constructor() {
    super('EXERCISE_NOT_OWNED', 'You can only modify exercises you created', 403);
  }
}

export class TemplateNotOwnedError extends WorkoutError {
  constructor() {
    super('TEMPLATE_NOT_OWNED', 'You can only modify templates you created', 403);
  }
}

export class WorkoutNotOwnedError extends WorkoutError {
  constructor() {
    super('WORKOUT_NOT_OWNED', 'You can only access your own workouts', 403);
  }
}

export class SystemExerciseError extends WorkoutError {
  constructor() {
    super('SYSTEM_EXERCISE', 'System exercises cannot be modified', 403);
  }
}

// ============================================
// Not Found Errors (404)
// ============================================

export class ExerciseNotFoundError extends WorkoutError {
  constructor(id?: string) {
    super('EXERCISE_NOT_FOUND', id ? `Exercise ${id} not found` : 'Exercise not found', 404);
  }
}

export class TemplateNotFoundError extends WorkoutError {
  constructor(id?: string) {
    super(
      'TEMPLATE_NOT_FOUND',
      id ? `Workout template ${id} not found` : 'Workout template not found',
      404,
    );
  }
}

export class WorkoutLogNotFoundError extends WorkoutError {
  constructor(id?: string) {
    super(
      'WORKOUT_LOG_NOT_FOUND',
      id ? `Workout log ${id} not found` : 'Workout log not found',
      404,
    );
  }
}

export class ProgramNotFoundError extends WorkoutError {
  constructor(id?: string) {
    super('PROGRAM_NOT_FOUND', id ? `Program ${id} not found` : 'Program not found', 404);
  }
}

export class ExerciseInWorkoutNotFoundError extends WorkoutError {
  constructor() {
    super('EXERCISE_IN_WORKOUT_NOT_FOUND', 'Exercise not found in this workout', 404);
  }
}

// ============================================
// Validation Errors (400)
// ============================================

export class InvalidExerciseDataError extends WorkoutError {
  constructor(reason: string) {
    super('INVALID_EXERCISE_DATA', reason, 400);
  }
}

export class InvalidTemplateDataError extends WorkoutError {
  constructor(reason: string) {
    super('INVALID_TEMPLATE_DATA', reason, 400);
  }
}

export class InvalidWorkoutDataError extends WorkoutError {
  constructor(reason: string) {
    super('INVALID_WORKOUT_DATA', reason, 400);
  }
}

export class InvalidSetDataError extends WorkoutError {
  constructor(reason: string) {
    super('INVALID_SET_DATA', reason, 400);
  }
}

// ============================================
// State Errors (400/409)
// ============================================

export class WorkoutAlreadyCompletedError extends WorkoutError {
  constructor() {
    super('WORKOUT_ALREADY_COMPLETED', 'This workout has already been completed', 400);
  }
}

export class WorkoutNotInProgressError extends WorkoutError {
  constructor() {
    super('WORKOUT_NOT_IN_PROGRESS', 'Workout is not in progress', 400);
  }
}

export class ActiveWorkoutExistsError extends WorkoutError {
  constructor() {
    super(
      'ACTIVE_WORKOUT_EXISTS',
      'You already have an active workout. Complete or abandon it first.',
      409,
    );
  }
}

// ============================================
// Limit Errors (429/400)
// ============================================

export class TooManyExercisesError extends WorkoutError {
  constructor(max: number) {
    super('TOO_MANY_EXERCISES', `Maximum of ${max} exercises allowed per workout`, 400);
  }
}

export class TooManySetsError extends WorkoutError {
  constructor(max: number) {
    super('TOO_MANY_SETS', `Maximum of ${max} sets allowed per exercise`, 400);
  }
}

export class TooManyCustomExercisesError extends WorkoutError {
  constructor(max: number) {
    super('TOO_MANY_CUSTOM_EXERCISES', `Maximum of ${max} custom exercises allowed`, 400);
  }
}

export class DailyWorkoutLimitError extends WorkoutError {
  constructor(max: number) {
    super('DAILY_WORKOUT_LIMIT', `You have reached the daily limit of ${max} workouts`, 429);
  }
}

// ============================================
// Exercise Reference Errors (400)
// ============================================

export class ExerciseReferencedError extends WorkoutError {
  constructor() {
    super('EXERCISE_REFERENCED', 'Cannot delete exercise that is used in templates or logs', 400);
  }
}

export class InvalidExerciseReferencesError extends WorkoutError {
  constructor(invalidIds: string[]) {
    super(
      'INVALID_EXERCISE_REFERENCES',
      `The following exercise IDs are invalid: ${invalidIds.join(', ')}`,
      400,
    );
  }
}
