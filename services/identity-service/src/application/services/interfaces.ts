// src/application/services/interfaces.ts

import type { User } from '../../domain/entities/User.js';
import type { AuthResponse, RefreshResponse, UserDTO, MessageResponse } from '../dtos/auth.dto.js';

/**
 * Service Interfaces
 * 
 * Define contracts for services to enable dependency injection.
 */

export interface IAuthService {
  register(
    email: string,
    password: string,
    metadata?: { ipAddress?: string; userAgent?: string },
  ): Promise<AuthResponse>;

  login(
    email: string,
    password: string,
    metadata?: { ipAddress?: string; userAgent?: string },
  ): Promise<AuthResponse>;

  refresh(refreshToken: string): Promise<RefreshResponse>;

  logout(refreshToken: string): Promise<MessageResponse>;

  logoutEverywhere(userId: string): Promise<MessageResponse>;

  getCurrentUser(userId: string): Promise<UserDTO>;
}

export interface IVerificationService {
  sendEmailVerification(userId: string): Promise<MessageResponse & { code?: string }>;

  verifyEmail(userId: string, code: string): Promise<MessageResponse>;
}

export interface IPasswordService {
  forgotPassword(email: string): Promise<MessageResponse & { resetToken?: string }>;

  resetPassword(token: string, newPassword: string): Promise<MessageResponse>;
}

export interface IJwtService {
  signAccessToken(payload: {
    sub: string;
    email: string;
    roles?: string[];
    gymId?: string;
  }): Promise<{ accessToken: string; expiresIn: number }>;

  verifyAccessToken(token: string): Promise<{
    valid: boolean;
    expired: boolean;
    payload?: { sub: string; email: string; roles?: string[]; gymId?: string };
  }>;

  decodeToken(token: string): { sub: string; email: string } | null;
}

export interface IHashService {
  hash(password: string): Promise<string>;
  compare(password: string, hash: string): Promise<boolean>;
  generateToken(): string;
  generateVerificationCode(): string;
}
