// src/infrastructure/container/bootstrap.ts

import { Container, ServiceKeys } from './Container.js';

// Repositories
import { PostgresExerciseRepository } from '../database/PostgresExerciseRepository.js';
import { PostgresPersonalRecordRepository } from '../database/PostgresPersonalRecordRepository.js';
import { PostgresWorkoutLogRepository } from '../database/PostgresWorkoutLogRepository.js';

// Services
import { ExerciseService } from '../../application/services/ExerciseService.js';
import { WorkoutLogService } from '../../application/services/WorkoutLogService.js';

// Controllers
import { ExerciseController } from '../../interfaces/http/controllers/ExerciseController.js';
import { WorkoutController } from '../../interfaces/http/controllers/WorkoutController.js';

export function bootstrap(): Container {
  const container = new Container();

  // Register repositories
  container.register(ServiceKeys.ExerciseRepository, () => new PostgresExerciseRepository());
  container.register(ServiceKeys.WorkoutLogRepository, () => new PostgresWorkoutLogRepository());
  container.register(
    ServiceKeys.PersonalRecordRepository,
    () => new PostgresPersonalRecordRepository(),
  );

  // Register services
  container.register(
    ServiceKeys.ExerciseService,
    () => new ExerciseService(container.resolve(ServiceKeys.ExerciseRepository)),
  );

  container.register(
    ServiceKeys.WorkoutLogService,
    () =>
      new WorkoutLogService(
        container.resolve(ServiceKeys.WorkoutLogRepository),
        container.resolve(ServiceKeys.ExerciseRepository),
        container.resolve(ServiceKeys.PersonalRecordRepository),
      ),
  );

  // Register controllers
  container.register(
    ServiceKeys.ExerciseController,
    () => new ExerciseController(container.resolve(ServiceKeys.ExerciseService)),
  );

  container.register(
    ServiceKeys.WorkoutController,
    () => new WorkoutController(container.resolve(ServiceKeys.WorkoutLogService)),
  );

  return container;
}
