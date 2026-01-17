// src/domain/repositories/IVerificationCodeRepository.ts
import type { VerificationCode, VerificationType } from '../entities/VerificationCode.js';

/**
 * VerificationCode Repository Interface
 */
export interface IVerificationCodeRepository {
  /**
   * Find verification code by code string
   */
  findByCode(code: string, type: VerificationType): Promise<VerificationCode | null>;

  /**
   * Find active verification codes for user
   */
  findActiveByUserId(userId: string, type: VerificationType): Promise<VerificationCode[]>;

  /**
   * Save new verification code
   */
  save(code: VerificationCode): Promise<void>;

  /**
   * Update verification code (mark as used)
   */
  update(code: VerificationCode): Promise<void>;

  /**
   * Delete all codes for user (after successful verification)
   */
  deleteByUserId(userId: string, type: VerificationType): Promise<void>;
}
