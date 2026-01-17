// src/domain/repositories/IUserRepository.ts
import type { User } from '../entities/User.js';

/**
 * User Repository Interface
 * 
 * Defines the contract for user persistence.
 * Infrastructure layer provides the implementation.
 */
export interface IUserRepository {
  /**
   * Find user by ID
   */
  findById(id: string): Promise<User | null>;

  /**
   * Find user by email
   */
  findByEmail(email: string): Promise<User | null>;

  /**
   * Save new user
   */
  save(user: User): Promise<void>;

  /**
   * Update existing user
   */
  update(user: User): Promise<void>;

  /**
   * Delete user (soft delete)
   */
  delete(id: string): Promise<void>;
}
