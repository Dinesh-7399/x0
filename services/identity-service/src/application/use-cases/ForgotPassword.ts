// src/application/use-cases/ForgotPassword.ts
import type { IUserRepository } from '../../domain/repositories/IUserRepository.js';
import type { IPasswordResetTokenRepository } from '../../domain/repositories/IPasswordResetTokenRepository.js';
import { PasswordResetToken } from '../../domain/entities/PasswordResetToken.js';
import { getHashService } from '../../infrastructure/services/HashService.js';
import type { MessageResponse } from '../dtos/auth.dto.js';

export interface ForgotPasswordDeps {
  userRepository: IUserRepository;
  passwordResetTokenRepository: IPasswordResetTokenRepository;
}

/**
 * Forgot Password Use Case
 * 
 * Generates a password reset token.
 * In development, returns the token. In production, would email a link.
 */
export async function forgotPassword(
  email: string,
  deps: ForgotPasswordDeps,
): Promise<MessageResponse & { resetToken?: string }> {
  const hashService = getHashService();

  // 1. Find user by email
  const user = await deps.userRepository.findByEmail(email);

  // Always return success message (don't reveal if email exists)
  if (!user) {
    return { message: 'If an account exists, a password reset link will be sent' };
  }

  // 2. Delete any existing reset tokens for this user
  await deps.passwordResetTokenRepository.deleteByUserId(user.id);

  // 3. Generate reset token
  const tokenValue = hashService.generateToken();

  // 4. Create reset token entity (expires in 1 hour)
  const resetToken = PasswordResetToken.create(user.id, tokenValue, 1);

  // 5. Save reset token
  await deps.passwordResetTokenRepository.save(resetToken);

  // 6. TODO: Send email in production
  console.log(`🔑 Password reset token for ${email}: ${tokenValue}`);

  return {
    message: 'If an account exists, a password reset link will be sent',
    resetToken: process.env.NODE_ENV === 'development' ? tokenValue : undefined,
  };
}
