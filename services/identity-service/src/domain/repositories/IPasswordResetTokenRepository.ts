// src/domain/repositories/IPasswordResetTokenRepository.ts
import type { PasswordResetToken } from '../entities/PasswordResetToken.js';

/**
 * PasswordResetToken Repository Interface
 */
export interface IPasswordResetTokenRepository {
  /**
   * Find password reset token by token string
   */
  findByToken(token: string): Promise<PasswordResetToken | null>;

  /**
   * Find active reset token for user
   */
  findActiveByUserId(userId: string): Promise<PasswordResetToken | null>;

  /**
   * Save new password reset token
   */
  save(token: PasswordResetToken): Promise<void>;

  /**
   * Update token (mark as used)
   */
  update(token: PasswordResetToken): Promise<void>;

  /**
   * Delete all tokens for user
   */
  deleteByUserId(userId: string): Promise<void>;
}
