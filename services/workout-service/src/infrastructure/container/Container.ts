// src/infrastructure/container/Container.ts

export class Container {
  private services = new Map<string, unknown>();

  register<T>(key: string, factory: () => T): void {
    if (!this.services.has(key)) {
      this.services.set(key, factory());
    }
  }

  registerInstance<T>(key: string, instance: T): void {
    this.services.set(key, instance);
  }

  resolve<T>(key: string): T {
    const service = this.services.get(key);
    if (!service) {
      throw new Error(`Service ${key} not registered`);
    }
    return service as T;
  }

  has(key: string): boolean {
    return this.services.has(key);
  }
}

export const ServiceKeys = {
  // Repositories
  ExerciseRepository: 'ExerciseRepository',
  WorkoutTemplateRepository: 'WorkoutTemplateRepository',
  WorkoutLogRepository: 'WorkoutLogRepository',
  PersonalRecordRepository: 'PersonalRecordRepository',

  // Services
  ExerciseService: 'ExerciseService',
  WorkoutTemplateService: 'WorkoutTemplateService',
  WorkoutLogService: 'WorkoutLogService',
  ProgressService: 'ProgressService',

  // Controllers
  ExerciseController: 'ExerciseController',
  WorkoutController: 'WorkoutController',
  ProgressController: 'ProgressController',
} as const;
