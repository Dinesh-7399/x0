// src/domain/repositories/IUserRepository.ts

import { User } from '../entities/User.js';

/**
 * Read-Only User Repository Interface
 * Accesses underlying users table (owned by Identity Service)
 */
export interface IUserRepository {
  findById(id: string): Promise<User | null>;
  findByEmail(email: string): Promise<User | null>;
  findAll(limit?: number, offset?: number): Promise<{ users: User[], total: number }>;
}
