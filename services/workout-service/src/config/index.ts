// src/config/index.ts

export interface WorkoutServiceConfig {
  serviceName: string;
  port: number;
  nodeEnv: string;

  // Database
  databaseUrl: string;

  // Redis
  redisUrl: string;

  // JWT (for auth validation)
  jwtSecret: string;

  // Service URLs
  mediaServiceUrl: string;
  userServiceUrl: string;
  notificationChannel: string;

  // Limits - CRITICAL for preventing abuse
  maxExercisesPerWorkout: number;
  maxSetsPerExercise: number;
  maxProgramWeeks: number;
  maxCustomExercises: number;
  maxWorkoutDurationMinutes: number;

  // Pagination defaults
  defaultPageSize: number;
  maxPageSize: number;

  // Rate limiting
  maxWorkoutsPerDay: number;
}

let config: WorkoutServiceConfig | null = null;

export function getConfig(): WorkoutServiceConfig {
  if (config) return config;

  config = {
    serviceName: 'workout-service',
    port: Number.parseInt(process.env.PORT || '8080', 10),
    nodeEnv: process.env.NODE_ENV || 'development',

    // Database
    databaseUrl:
      process.env.DATABASE_URL || 'postgresql://gymato:password@localhost:5432/gymato_workout',

    // Redis
    redisUrl: process.env.REDIS_URL || 'redis://localhost:6379',

    // JWT
    jwtSecret: process.env.JWT_SECRET || '',

    // Service URLs
    mediaServiceUrl: process.env.MEDIA_SERVICE_URL || 'http://localhost:8090',
    userServiceUrl: process.env.USER_SERVICE_URL || 'http://localhost:8082',
    notificationChannel: process.env.NOTIFICATION_CHANNEL || 'notifications:push',

    // Limits - prevent abuse and DoS
    maxExercisesPerWorkout: Number.parseInt(process.env.MAX_EXERCISES_PER_WORKOUT || '50', 10),
    maxSetsPerExercise: Number.parseInt(process.env.MAX_SETS_PER_EXERCISE || '20', 10),
    maxProgramWeeks: Number.parseInt(process.env.MAX_PROGRAM_WEEKS || '52', 10),
    maxCustomExercises: Number.parseInt(process.env.MAX_CUSTOM_EXERCISES || '100', 10),
    maxWorkoutDurationMinutes: Number.parseInt(
      process.env.MAX_WORKOUT_DURATION_MINUTES || '480',
      10,
    ), // 8 hours max

    // Pagination
    defaultPageSize: 20,
    maxPageSize: 100,

    // Rate limiting
    maxWorkoutsPerDay: Number.parseInt(process.env.MAX_WORKOUTS_PER_DAY || '10', 10),
  };

  return config;
}

export function validateConfig(): void {
  const cfg = getConfig();

  if (cfg.nodeEnv === 'production') {
    if (!cfg.jwtSecret) {
      throw new Error('JWT_SECRET is required in production');
    }
    if (cfg.databaseUrl.includes('localhost')) {
      console.warn('WARNING: Using localhost database URL in production');
    }
  }

  // Validate limits are reasonable
  if (cfg.maxExercisesPerWorkout < 1 || cfg.maxExercisesPerWorkout > 100) {
    throw new Error('MAX_EXERCISES_PER_WORKOUT must be between 1 and 100');
  }
  if (cfg.maxSetsPerExercise < 1 || cfg.maxSetsPerExercise > 50) {
    throw new Error('MAX_SETS_PER_EXERCISE must be between 1 and 50');
  }
}
