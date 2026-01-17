// src/application/use-cases/LogoutUser.ts
import type { IRefreshTokenRepository } from '../../domain/repositories/IRefreshTokenRepository.js';
import { InvalidRefreshTokenError } from '../errors/AuthErrors.js';
import type { RefreshTokenRequest, MessageResponse } from '../dtos/auth.dto.js';

export interface LogoutUserDeps {
  refreshTokenRepository: IRefreshTokenRepository;
}

/**
 * Logout User Use Case
 * 
 * Revokes the provided refresh token.
 */
export async function logoutUser(
  input: RefreshTokenRequest,
  deps: LogoutUserDeps,
): Promise<MessageResponse> {
  // 1. Find refresh token
  const token = await deps.refreshTokenRepository.findByToken(input.refreshToken);
  if (!token) {
    throw new InvalidRefreshTokenError('Token not found');
  }

  // 2. Revoke token
  token.revoke();
  await deps.refreshTokenRepository.update(token);

  return { message: 'Logged out successfully' };
}

/**
 * Logout User Everywhere Use Case
 * 
 * Revokes all refresh tokens for the user.
 */
export async function logoutUserEverywhere(
  userId: string,
  deps: LogoutUserDeps,
): Promise<MessageResponse> {
  await deps.refreshTokenRepository.revokeAllForUser(userId);
  return { message: 'Logged out from all devices' };
}
