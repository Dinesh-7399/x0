// src/application/use-cases/VerifyEmail.ts
import type { IUserRepository } from '../../domain/repositories/IUserRepository.js';
import type { IVerificationCodeRepository } from '../../domain/repositories/IVerificationCodeRepository.js';
import { InvalidVerificationCodeError, UserNotFoundError } from '../errors/AuthErrors.js';
import { VerificationType } from '../../domain/entities/VerificationCode.js';
import type { MessageResponse } from '../dtos/auth.dto.js';

export interface VerifyEmailDeps {
  userRepository: IUserRepository;
  verificationCodeRepository: IVerificationCodeRepository;
}

/**
 * Verify Email Use Case
 */
export async function verifyEmail(
  userId: string,
  code: string,
  deps: VerifyEmailDeps,
): Promise<MessageResponse> {
  // 1. Find user
  const user = await deps.userRepository.findById(userId);
  if (!user) {
    throw new UserNotFoundError();
  }

  // 2. Already verified?
  if (user.emailVerified) {
    return { message: 'Email is already verified' };
  }

  // 3. Find verification code
  const verificationCode = await deps.verificationCodeRepository.findByCode(
    code,
    VerificationType.EMAIL,
  );

  if (!verificationCode || verificationCode.userId !== userId) {
    throw new InvalidVerificationCodeError('Invalid verification code');
  }

  // 4. Check if code is valid
  const validation = verificationCode.isValid();
  if (!validation.valid) {
    throw new InvalidVerificationCodeError(validation.reason);
  }

  // 5. Mark code as used
  verificationCode.markAsUsed();
  await deps.verificationCodeRepository.update(verificationCode);

  // 6. Verify user's email
  user.verifyEmail();
  await deps.userRepository.update(user);

  // 7. Clean up old codes
  await deps.verificationCodeRepository.deleteByUserId(userId, VerificationType.EMAIL);

  return { message: 'Email verified successfully' };
}
