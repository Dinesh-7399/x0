// src/application/use-cases/SendVerificationCode.ts
import type { IUserRepository } from '../../domain/repositories/IUserRepository.js';
import type { IVerificationCodeRepository } from '../../domain/repositories/IVerificationCodeRepository.js';
import { UserNotFoundError } from '../errors/AuthErrors.js';
import { VerificationCode, VerificationType } from '../../domain/entities/VerificationCode.js';
import { getHashService } from '../../infrastructure/services/HashService.js';
import type { MessageResponse } from '../dtos/auth.dto.js';

export interface SendVerificationCodeDeps {
  userRepository: IUserRepository;
  verificationCodeRepository: IVerificationCodeRepository;
}

/**
 * Send Verification Code Use Case
 * 
 * Generates and "sends" a new verification code.
 * In development, logs the code. In production, would email it.
 */
export async function sendVerificationCode(
  userId: string,
  deps: SendVerificationCodeDeps,
): Promise<MessageResponse & { code?: string }> {
  const hashService = getHashService();

  // 1. Find user
  const user = await deps.userRepository.findById(userId);
  if (!user) {
    throw new UserNotFoundError();
  }

  // 2. Already verified?
  if (user.emailVerified) {
    return { message: 'Email is already verified' };
  }

  // 3. Generate code
  const code = hashService.generateVerificationCode();

  // 4. Create verification code entity
  const verificationCode = VerificationCode.create(
    userId,
    code,
    VerificationType.EMAIL,
    24, // expires in 24 hours
  );

  // 5. Save verification code
  await deps.verificationCodeRepository.save(verificationCode);

  // 6. TODO: Send email in production
  // For now, return code in development for testing
  console.log(`📧 Verification code for ${user.email}: ${code}`);

  return {
    message: 'Verification code sent to your email',
    code: process.env.NODE_ENV === 'development' ? code : undefined,
  };
}
