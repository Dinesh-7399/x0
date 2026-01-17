// src/application/use-cases/RefreshAccessToken.ts
import type { IUserRepository } from '../../domain/repositories/IUserRepository.js';
import type { IRefreshTokenRepository } from '../../domain/repositories/IRefreshTokenRepository.js';
import { getJwtService } from '../../infrastructure/services/JwtService.js';
import { InvalidRefreshTokenError, UserNotFoundError } from '../errors/AuthErrors.js';
import type { RefreshTokenRequest, RefreshResponse } from '../dtos/auth.dto.js';

export interface RefreshAccessTokenDeps {
  userRepository: IUserRepository;
  refreshTokenRepository: IRefreshTokenRepository;
}

/**
 * Refresh Access Token Use Case
 */
export async function refreshAccessToken(
  input: RefreshTokenRequest,
  deps: RefreshAccessTokenDeps,
): Promise<RefreshResponse> {
  const jwtService = getJwtService();

  // 1. Find refresh token
  const token = await deps.refreshTokenRepository.findByToken(input.refreshToken);
  if (!token) {
    throw new InvalidRefreshTokenError('Token not found');
  }

  // 2. Validate token
  const validation = token.isValid();
  if (!validation.valid) {
    throw new InvalidRefreshTokenError(validation.reason);
  }

  // 3. Find user
  const user = await deps.userRepository.findById(token.userId);
  if (!user) {
    throw new UserNotFoundError();
  }

  // 4. Check if user can still use tokens
  const canLogin = user.canLogin();
  if (!canLogin.allowed) {
    // Revoke all tokens for this user
    await deps.refreshTokenRepository.revokeAllForUser(user.id);
    throw new InvalidRefreshTokenError('Account is not active');
  }

  // 5. Generate new access token
  const { accessToken, expiresIn } = await jwtService.signAccessToken({
    sub: user.id,
    email: user.email,
    roles: ['member'], // TODO: Get from user roles
  });

  return { accessToken, expiresIn };
}
