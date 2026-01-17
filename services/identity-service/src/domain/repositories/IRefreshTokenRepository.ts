// src/domain/repositories/IRefreshTokenRepository.ts
import type { RefreshToken } from '../entities/RefreshToken.js';

/**
 * RefreshToken Repository Interface
 */
export interface IRefreshTokenRepository {
  /**
   * Find refresh token by token string
   */
  findByToken(token: string): Promise<RefreshToken | null>;

  /**
   * Find all tokens for a user
   */
  findByUserId(userId: string): Promise<RefreshToken[]>;

  /**
   * Save new refresh token
   */
  save(token: RefreshToken): Promise<void>;

  /**
   * Update refresh token (e.g., revoke)
   */
  update(token: RefreshToken): Promise<void>;

  /**
   * Revoke all tokens for a user (logout everywhere)
   */
  revokeAllForUser(userId: string): Promise<void>;

  /**
   * Delete expired tokens (cleanup job)
   */
  deleteExpired(): Promise<number>;
}
