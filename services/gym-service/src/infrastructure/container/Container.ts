// src/infrastructure/container/Container.ts

type Factory<T> = () => T;

export class Container {
  private instances = new Map<string, any>();
  private factories = new Map<string, Factory<any>>();

  register<T>(key: string, factory: Factory<T>): void {
    this.factories.set(key, factory);
  }

  resolve<T>(key: string): T {
    // Return cached instance if exists
    if (this.instances.has(key)) {
      return this.instances.get(key);
    }

    // Get factory
    const factory = this.factories.get(key);
    if (!factory) {
      throw new Error(`No factory registered for key: ${key}`);
    }

    // Create instance and cache
    const instance = factory();
    this.instances.set(key, instance);
    return instance;
  }

  has(key: string): boolean {
    return this.factories.has(key);
  }
}

export const ServiceKeys = {
  // Repositories
  GymRepository: 'GymRepository',

  // Services
  GymService: 'GymService',
  GymSearchService: 'GymSearchService',
  VerificationService: 'VerificationService',

  // Controllers
  GymController: 'GymController',
  VerificationController: 'VerificationController',

  // Infrastructure
  MessageBus: 'MessageBus',
} as const;
