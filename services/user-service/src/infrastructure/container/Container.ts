// src/infrastructure/container/Container.ts

/**
 * Service Identifier Keys
 */
export const ServiceKeys = {
  // Infrastructure
  JwtService: 'JwtService',

  // Repositories
  ProfileRepository: 'ProfileRepository',
  UserRepository: 'UserRepository',

  // Services
  UserProfileService: 'UserProfileService',
  UserAdminService: 'UserAdminService',

  // Controllers
  ProfileController: 'ProfileController',
  AdminController: 'AdminController',
} as const;

export type ServiceKey = typeof ServiceKeys[keyof typeof ServiceKeys];

/**
 * Dependency Injection Container
 * Simple singleton implementation for managing dependencies.
 */
export class Container {
  private static instance: Container;
  private services: Map<ServiceKey, any> = new Map();
  private factories: Map<ServiceKey, () => any> = new Map();

  private constructor() { }

  public static getInstance(): Container {
    if (!Container.instance) {
      Container.instance = new Container();
    }
    return Container.instance;
  }

  /**
   * Register a service instance (Singleton)
   */
  public register<T>(key: ServiceKey, instance: T): void {
    this.services.set(key, instance);
  }

  /**
   * Register a factory function (Lazy instantiation)
   */
  public registerFactory<T>(key: ServiceKey, factory: () => T): void {
    this.factories.set(key, factory);
  }

  /**
   * Resolve a service
   */
  public resolve<T>(key: ServiceKey): T {
    // If instance exists, return it
    if (this.services.has(key)) {
      return this.services.get(key);
    }

    // If factory exists, create instance, save it, and return it
    if (this.factories.has(key)) {
      const factory = this.factories.get(key);
      const instance = factory!();
      this.services.set(key, instance);
      return instance;
    }

    throw new Error(`Service ${key} not defined`);
  }

  /**
   * Clear all services (useful for testing)
   */
  public clear(): void {
    this.services.clear();
    this.factories.clear();
  }
}
