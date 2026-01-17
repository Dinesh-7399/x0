// src/infrastructure/container/bootstrap.ts

import { Container, ServiceKeys } from './Container.js';
import { getConfig } from '../../config/index.js';
import { createRedisBus } from '@gymato/messaging';

// Repositories
import { PgUserRepository } from '../repositories/PgUserRepository.js';
import { PgRefreshTokenRepository } from '../repositories/PgRefreshTokenRepository.js';
import { PgVerificationCodeRepository } from '../repositories/PgVerificationCodeRepository.js';
import { PgPasswordResetTokenRepository } from '../repositories/PgPasswordResetTokenRepository.js';
import { PgTwoFactorRepository } from '../repositories/PgTwoFactorRepository.js';
import { PgLoginHistoryRepository } from '../repositories/PgLoginHistoryRepository.js';

// Infrastructure Services
import { JwtService } from '../services/JwtService.js';
import { HashService } from '../services/HashService.js';
import { RateLimiterService, InMemoryRateLimitStore } from '../services/RateLimiterService.js';
import { EncryptionService } from '../services/EncryptionService.js';

// Application Services
import { AuthService } from '../../application/services/AuthService.js';
import { VerificationService } from '../../application/services/VerificationService.js';
import { PasswordService } from '../../application/services/PasswordService.js';
import { SessionService } from '../../application/services/SessionService.js';
import { TwoFactorService } from '../../application/services/TwoFactorService.js';
import { LoginHistoryService } from '../../application/services/LoginHistoryService.js';

// Controllers
import { AuthController } from '../../interfaces/http/controllers/AuthController.js';
import { SessionController } from '../../interfaces/http/controllers/SessionController.js';
import { TwoFactorController } from '../../interfaces/http/controllers/TwoFactorController.js';
import { LoginHistoryController } from '../../interfaces/http/controllers/LoginHistoryController.js';

/**
 * Extended Service Keys
 */
export const ExtendedServiceKeys = {
  ...ServiceKeys,
  // Infrastructure
  RateLimiterService: 'RateLimiterService',
  EncryptionService: 'EncryptionService',
  // Repositories
  TwoFactorRepository: 'TwoFactorRepository',
  LoginHistoryRepository: 'LoginHistoryRepository',
  // Services
  SessionService: 'SessionService',
  TwoFactorService: 'TwoFactorService',
  LoginHistoryService: 'LoginHistoryService',
  // Controllers
  SessionController: 'SessionController',
  TwoFactorController: 'TwoFactorController',
  LoginHistoryController: 'LoginHistoryController',
} as const;

/**
 * Bootstrap
 * 
 * Registers all services with the DI container.
 */
export function bootstrap(): Container {
  const container = Container.getInstance();
  container.clear();

  // ============ REPOSITORIES ============
  container.registerFactory(ServiceKeys.UserRepository, () => new PgUserRepository());
  container.registerFactory(ServiceKeys.RefreshTokenRepository, () => new PgRefreshTokenRepository());
  container.registerFactory(ServiceKeys.VerificationCodeRepository, () => new PgVerificationCodeRepository());
  container.registerFactory(ServiceKeys.PasswordResetTokenRepository, () => new PgPasswordResetTokenRepository());
  container.registerFactory(ExtendedServiceKeys.TwoFactorRepository, () => new PgTwoFactorRepository());
  container.registerFactory(ExtendedServiceKeys.LoginHistoryRepository, () => new PgLoginHistoryRepository());

  // ============ INFRASTRUCTURE SERVICES ============
  const config = getConfig();
  container.registerFactory(ServiceKeys.MessageBus, () => createRedisBus(config.redisUrl));

  container.registerFactory(ServiceKeys.JwtService, () => new JwtService());
  container.registerFactory(ServiceKeys.HashService, () => new HashService());
  container.registerFactory(ExtendedServiceKeys.RateLimiterService, () => new RateLimiterService(new InMemoryRateLimitStore()));
  container.registerFactory(ExtendedServiceKeys.EncryptionService, () => new EncryptionService());

  // ============ APPLICATION SERVICES ============
  container.registerFactory(ServiceKeys.AuthService, () => new AuthService(
    container.resolve(ServiceKeys.UserRepository),
    container.resolve(ServiceKeys.RefreshTokenRepository),
    container.resolve(ServiceKeys.JwtService),
    container.resolve(ServiceKeys.HashService),
    container.resolve(ServiceKeys.MessageBus),
  ));

  container.registerFactory(ServiceKeys.VerificationService, () => new VerificationService(
    container.resolve(ServiceKeys.UserRepository),
    container.resolve(ServiceKeys.VerificationCodeRepository),
    container.resolve(ServiceKeys.HashService),
  ));

  container.registerFactory(ServiceKeys.PasswordService, () => new PasswordService(
    container.resolve(ServiceKeys.UserRepository),
    container.resolve(ServiceKeys.PasswordResetTokenRepository),
    container.resolve(ServiceKeys.RefreshTokenRepository),
    container.resolve(ServiceKeys.HashService),
  ));

  container.registerFactory(ExtendedServiceKeys.SessionService, () => new SessionService(
    container.resolve(ServiceKeys.RefreshTokenRepository),
    container.resolve(ServiceKeys.UserRepository),
  ));

  container.registerFactory(ExtendedServiceKeys.TwoFactorService, () => new TwoFactorService(
    container.resolve(ServiceKeys.UserRepository),
    container.resolve(ExtendedServiceKeys.TwoFactorRepository),
    container.resolve(ServiceKeys.HashService),
    container.resolve(ExtendedServiceKeys.EncryptionService),
  ));

  container.registerFactory(ExtendedServiceKeys.LoginHistoryService, () => new LoginHistoryService(
    container.resolve(ExtendedServiceKeys.LoginHistoryRepository),
    container.resolve(ServiceKeys.UserRepository),
  ));

  // ============ CONTROLLERS ============
  container.registerFactory(ServiceKeys.AuthController, () => new AuthController(
    container.resolve(ServiceKeys.AuthService),
    container.resolve(ServiceKeys.VerificationService),
    container.resolve(ServiceKeys.PasswordService),
    container.resolve(ServiceKeys.JwtService),
  ));

  container.registerFactory(ExtendedServiceKeys.SessionController, () => new SessionController(
    container.resolve(ExtendedServiceKeys.SessionService),
    container.resolve(ServiceKeys.JwtService),
  ));

  container.registerFactory(ExtendedServiceKeys.TwoFactorController, () => new TwoFactorController(
    container.resolve(ExtendedServiceKeys.TwoFactorService),
    container.resolve(ServiceKeys.JwtService),
  ));

  container.registerFactory(ExtendedServiceKeys.LoginHistoryController, () => new LoginHistoryController(
    container.resolve(ExtendedServiceKeys.LoginHistoryService),
    container.resolve(ServiceKeys.JwtService),
  ));

  return container;
}
