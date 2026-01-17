// src/infrastructure/container/bootstrap.ts

import { Container, ServiceKeys } from './Container.js';
import { PostgresGymRepository } from '../database/PostgresGymRepository.js';
import { GymService } from '../../application/services/GymService.js';
import { GymSearchService } from '../../application/services/GymSearchService.js';
import { VerificationService } from '../../application/services/VerificationService.js';
import { GymController } from '../../interfaces/http/controllers/GymController.js';
import { VerificationController } from '../../interfaces/http/controllers/VerificationController.js';

export function bootstrap(): Container {
  const container = new Container();

  // Register repositories
  container.register(ServiceKeys.GymRepository, () => new PostgresGymRepository());

  // Register services
  container.register(ServiceKeys.GymService, () => {
    const gymRepo = container.resolve<PostgresGymRepository>(ServiceKeys.GymRepository);
    return new GymService(gymRepo);
  });

  container.register(ServiceKeys.GymSearchService, () => {
    const gymRepo = container.resolve<PostgresGymRepository>(ServiceKeys.GymRepository);
    return new GymSearchService(gymRepo);
  });

  container.register(ServiceKeys.VerificationService, () => {
    const gymRepo = container.resolve<PostgresGymRepository>(ServiceKeys.GymRepository);
    return new VerificationService(gymRepo);
  });

  // Register controllers
  container.register(ServiceKeys.GymController, () => {
    const gymService = container.resolve<GymService>(ServiceKeys.GymService);
    const searchService = container.resolve<GymSearchService>(ServiceKeys.GymSearchService);
    return new GymController(gymService, searchService);
  });

  container.register(ServiceKeys.VerificationController, () => {
    const verificationService = container.resolve<VerificationService>(ServiceKeys.VerificationService);
    return new VerificationController(verificationService);
  });

  console.log('[DI] Container bootstrapped');
  return container;
}
