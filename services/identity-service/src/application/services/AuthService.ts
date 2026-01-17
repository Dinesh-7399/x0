// src/application/services/AuthService.ts

import type { IUserRepository } from '../../domain/repositories/IUserRepository.js';
import type { IRefreshTokenRepository } from '../../domain/repositories/IRefreshTokenRepository.js';
import type { IAuthService, IJwtService, IHashService } from './interfaces.js';
import type { AuthResponse, RefreshResponse, UserDTO, MessageResponse } from '../dtos/auth.dto.js';
import { User, UserStatus } from '../../domain/entities/User.js';
import { RefreshToken } from '../../domain/entities/RefreshToken.js';
import {
  UserExistsError,
  InvalidCredentialsError,
  EmailNotVerifiedError,
  AccountNotActiveError,
  InvalidRefreshTokenError,
  UserNotFoundError,
} from '../errors/AuthErrors.js';
import type { Publisher } from '@gymato/messaging';
import { EventTypes } from '@gymato/messaging';
import { getConfig } from '../../config/index.js';

// ... (other imports)

export class AuthService implements IAuthService {
  constructor(
    private readonly userRepository: IUserRepository,
    private readonly refreshTokenRepository: IRefreshTokenRepository,
    private readonly jwtService: IJwtService,
    private readonly hashService: IHashService,
    private readonly messageBus: Publisher,
  ) { }

  /**
   * Register a new user
   */
  async register(
    email: string,
    password: string,
    metadata?: { ipAddress?: string; userAgent?: string },
  ): Promise<AuthResponse> {
    // ... (existing checks and user creation)

    // Check if user exists
    const existingUser = await this.userRepository.findByEmail(email);
    if (existingUser) {
      throw new UserExistsError(email);
    }

    // Hash password
    const passwordHash = await this.hashService.hash(password);

    // Create user
    const user = User.create({
      email: email.toLowerCase(),
      passwordHash,
      emailVerified: false,
      phoneVerified: false,
      status: UserStatus.ACTIVE,
    });

    await this.userRepository.save(user);

    // Publish event
    await this.messageBus.publish(EventTypes.USER_REGISTERED, {
      userId: user.id,
      email: user.email,
      timestamp: new Date().toISOString(),
    });

    // Generate tokens
    const tokens = await this.generateTokens(user, metadata);

    return {
      user: this.toUserDTO(user),
      ...tokens,
    };
  }

  /**
   * Login user
   */
  async login(
    email: string,
    password: string,
    metadata?: { ipAddress?: string; userAgent?: string },
  ): Promise<AuthResponse> {
    // Find user
    const user = await this.userRepository.findByEmail(email);
    if (!user) {
      throw new InvalidCredentialsError();
    }

    // Verify password
    const isValid = await this.hashService.compare(password, user.passwordHash);
    if (!isValid) {
      throw new InvalidCredentialsError();
    }

    // Check business rules
    const canLogin = user.canLogin();
    if (!canLogin.allowed) {
      if (canLogin.reason?.includes('not verified')) {
        throw new EmailNotVerifiedError();
      }
      throw new AccountNotActiveError(canLogin.reason || 'Account not active');
    }

    // Record login
    user.recordLogin();
    await this.userRepository.update(user);

    // Generate tokens
    const tokens = await this.generateTokens(user, metadata);

    return {
      user: this.toUserDTO(user),
      ...tokens,
    };
  }

  /**
   * Refresh access token
   */
  async refresh(refreshTokenValue: string): Promise<RefreshResponse> {
    // Find token
    const token = await this.refreshTokenRepository.findByToken(refreshTokenValue);
    if (!token) {
      throw new InvalidRefreshTokenError('Token not found');
    }

    // Validate
    const validation = token.isValid();
    if (!validation.valid) {
      throw new InvalidRefreshTokenError(validation.reason);
    }

    // Find user
    const user = await this.userRepository.findById(token.userId);
    if (!user) {
      throw new UserNotFoundError();
    }

    // Check user status
    const canLogin = user.canLogin();
    if (!canLogin.allowed) {
      await this.refreshTokenRepository.revokeAllForUser(user.id);
      throw new InvalidRefreshTokenError('Account not active');
    }

    // Generate new access token
    const { accessToken, expiresIn } = await this.jwtService.signAccessToken({
      sub: user.id,
      email: user.email,
      roles: ['member'],
    });

    return { accessToken, expiresIn };
  }

  /**
   * Logout (revoke refresh token)
   */
  async logout(refreshTokenValue: string): Promise<MessageResponse> {
    const token = await this.refreshTokenRepository.findByToken(refreshTokenValue);
    if (!token) {
      throw new InvalidRefreshTokenError('Token not found');
    }

    token.revoke();
    await this.refreshTokenRepository.update(token);

    return { message: 'Logged out successfully' };
  }

  /**
   * Logout from all devices
   */
  async logoutEverywhere(userId: string): Promise<MessageResponse> {
    await this.refreshTokenRepository.revokeAllForUser(userId);
    return { message: 'Logged out from all devices' };
  }

  /**
   * Get current user
   */
  async getCurrentUser(userId: string): Promise<UserDTO> {
    const user = await this.userRepository.findById(userId);
    if (!user) {
      throw new UserNotFoundError();
    }
    return this.toUserDTO(user);
  }

  /**
   * Generate tokens for user
   */
  private async generateTokens(
    user: User,
    metadata?: { ipAddress?: string; userAgent?: string },
  ): Promise<{ accessToken: string; refreshToken: string; expiresIn: number }> {
    const config = getConfig();

    const { accessToken, expiresIn } = await this.jwtService.signAccessToken({
      sub: user.id,
      email: user.email,
      roles: ['member'],
    });

    const refreshToken = RefreshToken.create(user.id, config.jwtRefreshExpiry, metadata);
    await this.refreshTokenRepository.save(refreshToken);

    return {
      accessToken,
      refreshToken: refreshToken.token,
      expiresIn,
    };
  }

  /**
   * Convert User entity to DTO
   */
  private toUserDTO(user: User): UserDTO {
    return {
      id: user.id,
      email: user.email,
      emailVerified: user.emailVerified,
      phoneVerified: user.phoneVerified,
      phone: user.phone,
      createdAt: user.createdAt,
    };
  }
}
