// src/infrastructure/container/bootstrap.ts

import { Container, ServiceKeys } from './Container.js';

// Repositories
import { PgProfileRepository } from '../repositories/PgProfileRepository.js';
import { PgUserRepository } from '../repositories/PgUserRepository.js';

// Infrastructure Services
import { JwtService } from '../services/JwtService.js';

// Application Services
import { UserProfileService } from '../../application/services/UserProfileService.js';
import { UserAdminService } from '../../application/services/UserAdminService.js';

// Controllers
import { ProfileController } from '../../interfaces/http/controllers/ProfileController.js';
import { AdminController } from '../../interfaces/http/controllers/AdminController.js';

/**
 * Bootstrap
 * 
 * Registers all services with the DI container.
 */
export function bootstrap(): Container {
  const container = Container.getInstance();
  container.clear();

  // ============ INFRASTRUCTURE ============
  container.registerFactory(ServiceKeys.JwtService, () => new JwtService());

  // ============ REPOSITORIES ============
  container.registerFactory(ServiceKeys.ProfileRepository, () => new PgProfileRepository());
  container.registerFactory(ServiceKeys.UserRepository, () => new PgUserRepository());

  // ============ SERVICES ============
  container.registerFactory(ServiceKeys.UserProfileService, () => new UserProfileService(
    container.resolve(ServiceKeys.ProfileRepository),
    container.resolve(ServiceKeys.UserRepository)
  ));

  container.registerFactory(ServiceKeys.UserAdminService, () => new UserAdminService(
    container.resolve(ServiceKeys.UserRepository),
    container.resolve(ServiceKeys.ProfileRepository)
  ));

  // ============ CONTROLLERS ============
  container.registerFactory(ServiceKeys.ProfileController, () => new ProfileController(
    container.resolve(ServiceKeys.UserProfileService)
  ));

  container.registerFactory(ServiceKeys.AdminController, () => new AdminController(
    container.resolve(ServiceKeys.UserAdminService)
  ));

  return container;
}
