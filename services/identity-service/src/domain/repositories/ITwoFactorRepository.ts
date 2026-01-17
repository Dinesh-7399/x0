// src/domain/repositories/ITwoFactorRepository.ts

import type { TwoFactorSecret } from '../entities/TwoFactorSecret.js';

/**
 * TwoFactor Repository Interface
 */
export interface ITwoFactorRepository {
  /**
   * Find 2FA secret by user ID
   */
  findByUserId(userId: string): Promise<TwoFactorSecret | null>;

  /**
   * Save new 2FA secret
   */
  save(secret: TwoFactorSecret): Promise<void>;

  /**
   * Update 2FA secret
   */
  update(secret: TwoFactorSecret): Promise<void>;

  /**
   * Delete 2FA secret for user
   */
  deleteByUserId(userId: string): Promise<void>;
}
