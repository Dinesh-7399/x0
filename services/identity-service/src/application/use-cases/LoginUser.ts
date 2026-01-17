// src/application/use-cases/LoginUser.ts
import type { IUserRepository } from '../../domain/repositories/IUserRepository.js';
import type { IRefreshTokenRepository } from '../../domain/repositories/IRefreshTokenRepository.js';
import { getHashService } from '../../infrastructure/services/HashService.js';
import { getJwtService } from '../../infrastructure/services/JwtService.js';
import {
  InvalidCredentialsError,
  AccountNotActiveError,
  EmailNotVerifiedError
} from '../errors/AuthErrors.js';
import type { LoginRequest, AuthResponse, UserDTO } from '../dtos/auth.dto.js';
import { RefreshToken } from '../../domain/entities/RefreshToken.js';
import { getConfig } from '../../config/index.js';
import { User } from '../../domain/entities/User.js';

export interface LoginUserDeps {
  userRepository: IUserRepository;
  refreshTokenRepository: IRefreshTokenRepository;
}

/**
 * Login User Use Case
 */
export async function loginUser(
  input: LoginRequest,
  deps: LoginUserDeps,
  metadata?: { ipAddress?: string; userAgent?: string },
): Promise<AuthResponse> {
  const hashService = getHashService();
  const jwtService = getJwtService();
  const config = getConfig();

  // 1. Find user by email
  const user = await deps.userRepository.findByEmail(input.email);
  if (!user) {
    throw new InvalidCredentialsError();
  }

  // 2. Verify password
  const isValidPassword = await hashService.compare(input.password, user.passwordHash);
  if (!isValidPassword) {
    throw new InvalidCredentialsError();
  }

  // 3. Check if user can login (business rules)
  const canLogin = user.canLogin();
  if (!canLogin.allowed) {
    if (canLogin.reason?.includes('not verified')) {
      throw new EmailNotVerifiedError();
    }
    throw new AccountNotActiveError(canLogin.reason || 'Account is not active');
  }

  // 4. Record login
  user.recordLogin();
  await deps.userRepository.update(user);

  // 5. Generate tokens
  const { accessToken, expiresIn } = await jwtService.signAccessToken({
    sub: user.id,
    email: user.email,
    roles: ['member'], // TODO: Get from user roles
  });

  const refreshToken = RefreshToken.create(user.id, config.jwtRefreshExpiry, metadata);
  await deps.refreshTokenRepository.save(refreshToken);

  // 6. Return response
  return {
    user: toUserDTO(user),
    accessToken,
    refreshToken: refreshToken.token,
    expiresIn,
  };
}

function toUserDTO(user: User): UserDTO {
  return {
    id: user.id,
    email: user.email,
    emailVerified: user.emailVerified,
    phoneVerified: user.phoneVerified,
    phone: user.phone,
    createdAt: user.createdAt,
  };
}
