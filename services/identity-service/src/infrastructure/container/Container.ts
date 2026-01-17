// src/infrastructure/container/Container.ts

/**
 * Simple Dependency Injection Container
 * 
 * Follows Inversion of Control principle.
 */
export class Container {
  private static instance: Container;
  private services: Map<string, any> = new Map();
  private factories: Map<string, () => any> = new Map();

  private constructor() { }

  /**
   * Get singleton instance
   */
  static getInstance(): Container {
    if (!Container.instance) {
      Container.instance = new Container();
    }
    return Container.instance;
  }

  /**
   * Register a service instance
   */
  register<T>(key: string, service: T): void {
    this.services.set(key, service);
  }

  /**
   * Register a factory function (lazy instantiation)
   */
  registerFactory<T>(key: string, factory: () => T): void {
    this.factories.set(key, factory);
  }

  /**
   * Resolve a service by key
   */
  resolve<T>(key: string): T {
    // Check if already instantiated
    if (this.services.has(key)) {
      return this.services.get(key) as T;
    }

    // Check if factory exists
    if (this.factories.has(key)) {
      const service = this.factories.get(key)!();
      this.services.set(key, service); // Cache the instance
      return service as T;
    }

    throw new Error(`Service '${key}' not registered in container`);
  }

  /**
   * Check if a service is registered
   */
  has(key: string): boolean {
    return this.services.has(key) || this.factories.has(key);
  }

  /**
   * Clear all services (useful for testing)
   */
  clear(): void {
    this.services.clear();
    this.factories.clear();
  }
}

// Service keys for type-safe resolution
export const ServiceKeys = {
  // Repositories
  UserRepository: 'UserRepository',
  RefreshTokenRepository: 'RefreshTokenRepository',
  VerificationCodeRepository: 'VerificationCodeRepository',
  PasswordResetTokenRepository: 'PasswordResetTokenRepository',

  // Services
  JwtService: 'JwtService',
  HashService: 'HashService',
  AuthService: 'AuthService',
  VerificationService: 'VerificationService',
  PasswordService: 'PasswordService',

  // Controllers
  AuthController: 'AuthController',

  // Messaging
  MessageBus: 'MessageBus',
} as const;

export type ServiceKey = (typeof ServiceKeys)[keyof typeof ServiceKeys];
