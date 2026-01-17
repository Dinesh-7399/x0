// src/application/use-cases/RegisterUser.ts
import { User, UserStatus } from '../../domain/entities/User.js';
import type { IUserRepository } from '../../domain/repositories/IUserRepository.js';
import { getHashService } from '../../infrastructure/services/HashService.js';
import { getJwtService } from '../../infrastructure/services/JwtService.js';
import { UserExistsError } from '../errors/AuthErrors.js';
import type { RegisterRequest, AuthResponse, UserDTO } from '../dtos/auth.dto.js';
import { RefreshToken } from '../../domain/entities/RefreshToken.js';
import type { IRefreshTokenRepository } from '../../domain/repositories/IRefreshTokenRepository.js';
import { getConfig } from '../../config/index.js';

export interface RegisterUserDeps {
  userRepository: IUserRepository;
  refreshTokenRepository: IRefreshTokenRepository;
}

/**
 * Register User Use Case
 */
export async function registerUser(
  input: RegisterRequest,
  deps: RegisterUserDeps,
  metadata?: { ipAddress?: string; userAgent?: string },
): Promise<AuthResponse> {
  const hashService = getHashService();
  const jwtService = getJwtService();
  const config = getConfig();

  // 1. Check if user exists
  const existingUser = await deps.userRepository.findByEmail(input.email);
  if (existingUser) {
    throw new UserExistsError(input.email);
  }

  // 2. Hash password
  const passwordHash = await hashService.hash(input.password);

  // 3. Create user entity
  const user = User.create({
    email: input.email.toLowerCase(),
    passwordHash,
    emailVerified: false, // Requires verification
    phoneVerified: false,
    phone: input.phone,
    status: UserStatus.ACTIVE,
  });

  // 4. Save user
  await deps.userRepository.save(user);

  // 5. Generate tokens
  const { accessToken, expiresIn } = await jwtService.signAccessToken({
    sub: user.id,
    email: user.email,
    roles: ['member'],
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
