// src/application/services/VerificationService.ts

import type { IUserRepository } from '../../domain/repositories/IUserRepository.js';
import type { IVerificationCodeRepository } from '../../domain/repositories/IVerificationCodeRepository.js';
import type { IVerificationService, IHashService } from './interfaces.js';
import type { MessageResponse } from '../dtos/auth.dto.js';
import { VerificationCode, VerificationType } from '../../domain/entities/VerificationCode.js';
import { UserNotFoundError, InvalidVerificationCodeError } from '../errors/AuthErrors.js';
import { getConfig } from '../../config/index.js';

/**
 * VerificationService
 * 
 * Handles email/phone verification.
 * Single Responsibility: Verification concerns only.
 */
export class VerificationService implements IVerificationService {
  constructor(
    private readonly userRepository: IUserRepository,
    private readonly verificationCodeRepository: IVerificationCodeRepository,
    private readonly hashService: IHashService,
  ) { }

  /**
   * Send email verification code
   */
  async sendEmailVerification(userId: string): Promise<MessageResponse & { code?: string }> {
    const config = getConfig();

    // Find user
    const user = await this.userRepository.findById(userId);
    if (!user) {
      throw new UserNotFoundError();
    }

    // Already verified?
    if (user.emailVerified) {
      return { message: 'Email is already verified' };
    }

    // Generate code
    const code = this.hashService.generateVerificationCode();

    // Create and save
    const verificationCode = VerificationCode.create(
      userId,
      code,
      VerificationType.EMAIL,
      24, // expires in 24 hours
    );
    await this.verificationCodeRepository.save(verificationCode);

    // TODO: Send email in production
    console.log(`📧 Verification code for ${user.email}: ${code}`);

    return {
      message: 'Verification code sent to your email',
      code: config.nodeEnv === 'development' ? code : undefined,
    };
  }

  /**
   * Verify email with code
   */
  async verifyEmail(userId: string, code: string): Promise<MessageResponse> {
    // Find user
    const user = await this.userRepository.findById(userId);
    if (!user) {
      throw new UserNotFoundError();
    }

    // Already verified?
    if (user.emailVerified) {
      return { message: 'Email is already verified' };
    }

    // Find code
    const verificationCode = await this.verificationCodeRepository.findByCode(
      code,
      VerificationType.EMAIL,
    );

    if (!verificationCode || verificationCode.userId !== userId) {
      throw new InvalidVerificationCodeError('Invalid verification code');
    }

    // Validate
    const validation = verificationCode.isValid();
    if (!validation.valid) {
      throw new InvalidVerificationCodeError(validation.reason);
    }

    // Mark code as used
    verificationCode.markAsUsed();
    await this.verificationCodeRepository.update(verificationCode);

    // Verify email
    user.verifyEmail();
    await this.userRepository.update(user);

    // Cleanup
    await this.verificationCodeRepository.deleteByUserId(userId, VerificationType.EMAIL);

    return { message: 'Email verified successfully' };
  }
}
