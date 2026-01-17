// src/application/use-cases/ResetPassword.ts
import type { IUserRepository } from '../../domain/repositories/IUserRepository.js';
import type { IPasswordResetTokenRepository } from '../../domain/repositories/IPasswordResetTokenRepository.js';
import type { IRefreshTokenRepository } from '../../domain/repositories/IRefreshTokenRepository.js';
import { InvalidResetTokenError, UserNotFoundError } from '../errors/AuthErrors.js';
import { getHashService } from '../../infrastructure/services/HashService.js';
import type { MessageResponse } from '../dtos/auth.dto.js';

export interface ResetPasswordDeps {
  userRepository: IUserRepository;
  passwordResetTokenRepository: IPasswordResetTokenRepository;
  refreshTokenRepository: IRefreshTokenRepository;
}

/**
 * Reset Password Use Case
 * 
 * Validates the reset token and sets a new password.
 */
export async function resetPassword(
  tokenValue: string,
  newPassword: string,
  deps: ResetPasswordDeps,
): Promise<MessageResponse> {
  const hashService = getHashService();

  // 1. Find reset token
  const token = await deps.passwordResetTokenRepository.findByToken(tokenValue);
  if (!token) {
    throw new InvalidResetTokenError('Invalid reset token');
  }

  // 2. Validate token
  const validation = token.isValid();
  if (!validation.valid) {
    throw new InvalidResetTokenError(validation.reason);
  }

  // 3. Find user
  const user = await deps.userRepository.findById(token.userId);
  if (!user) {
    throw new UserNotFoundError();
  }

  // 4. Hash new password
  const passwordHash = await hashService.hash(newPassword);

  // 5. Update user's password
  user.changePassword(passwordHash);
  await deps.userRepository.update(user);

  // 6. Mark token as used
  token.markAsUsed();
  await deps.passwordResetTokenRepository.update(token);

  // 7. Revoke all refresh tokens (security: logout everywhere)
  await deps.refreshTokenRepository.revokeAllForUser(user.id);

  // 8. Clean up
  await deps.passwordResetTokenRepository.deleteByUserId(user.id);

  return { message: 'Password reset successfully. Please login with your new password.' };
}
