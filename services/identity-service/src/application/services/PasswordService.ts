// src/application/services/PasswordService.ts

import type { IUserRepository } from '../../domain/repositories/IUserRepository.js';
import type { IPasswordResetTokenRepository } from '../../domain/repositories/IPasswordResetTokenRepository.js';
import type { IRefreshTokenRepository } from '../../domain/repositories/IRefreshTokenRepository.js';
import type { IPasswordService, IHashService } from './interfaces.js';
import type { MessageResponse } from '../dtos/auth.dto.js';
import { PasswordResetToken } from '../../domain/entities/PasswordResetToken.js';
import { InvalidResetTokenError, UserNotFoundError } from '../errors/AuthErrors.js';
import { getConfig } from '../../config/index.js';

/**
 * PasswordService
 * 
 * Handles password reset flow.
 * Single Responsibility: Password management only.
 */
export class PasswordService implements IPasswordService {
  constructor(
    private readonly userRepository: IUserRepository,
    private readonly passwordResetTokenRepository: IPasswordResetTokenRepository,
    private readonly refreshTokenRepository: IRefreshTokenRepository,
    private readonly hashService: IHashService,
  ) { }

  /**
   * Request password reset
   */
  async forgotPassword(email: string): Promise<MessageResponse & { resetToken?: string }> {
    const config = getConfig();

    // Find user (don't reveal if exists)
    const user = await this.userRepository.findByEmail(email);
    if (!user) {
      return { message: 'If an account exists, a password reset link will be sent' };
    }

    // Delete existing tokens
    await this.passwordResetTokenRepository.deleteByUserId(user.id);

    // Generate token
    const tokenValue = this.hashService.generateToken();
    const resetToken = PasswordResetToken.create(user.id, tokenValue, 1); // 1 hour
    await this.passwordResetTokenRepository.save(resetToken);

    // TODO: Send email in production
    console.log(`🔑 Password reset token for ${email}: ${tokenValue}`);

    return {
      message: 'If an account exists, a password reset link will be sent',
      resetToken: config.nodeEnv === 'development' ? tokenValue : undefined,
    };
  }

  /**
   * Reset password with token
   */
  async resetPassword(tokenValue: string, newPassword: string): Promise<MessageResponse> {
    // Find token
    const token = await this.passwordResetTokenRepository.findByToken(tokenValue);
    if (!token) {
      throw new InvalidResetTokenError('Invalid reset token');
    }

    // Validate
    const validation = token.isValid();
    if (!validation.valid) {
      throw new InvalidResetTokenError(validation.reason);
    }

    // Find user
    const user = await this.userRepository.findById(token.userId);
    if (!user) {
      throw new UserNotFoundError();
    }

    // Hash new password
    const passwordHash = await this.hashService.hash(newPassword);

    // Update password
    user.changePassword(passwordHash);
    await this.userRepository.update(user);

    // Mark token used
    token.markAsUsed();
    await this.passwordResetTokenRepository.update(token);

    // Revoke all sessions (security)
    await this.refreshTokenRepository.revokeAllForUser(user.id);

    // Cleanup
    await this.passwordResetTokenRepository.deleteByUserId(user.id);

    return { message: 'Password reset successfully. Please login with your new password.' };
  }
}
