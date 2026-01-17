// src/domain/repositories/ILoginHistoryRepository.ts

import type { LoginHistory, LoginStatus } from '../entities/LoginHistory.js';

/**
 * LoginHistory Repository Interface
 */
export interface ILoginHistoryRepository {
  /**
   * Find login history by user
   */
  findByUserId(userId: string, limit?: number): Promise<LoginHistory[]>;

  /**
   * Find recent failed attempts for user
   */
  countRecentFailedAttempts(userId: string, sinceMinutes: number): Promise<number>;

  /**
   * Save login history entry
   */
  save(entry: LoginHistory): Promise<void>;

  /**
   * Delete old history (cleanup)
   */
  deleteOlderThan(days: number): Promise<number>;
}
