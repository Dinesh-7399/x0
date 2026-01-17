// src/application/services/SessionService.ts

import type { IRefreshTokenRepository } from '../../domain/repositories/IRefreshTokenRepository.js';
import type { IUserRepository } from '../../domain/repositories/IUserRepository.js';
import type { MessageResponse } from '../dtos/auth.dto.js';
import { UserNotFoundError, InvalidRefreshTokenError } from '../errors/AuthErrors.js';

/**
 * Session DTO
 */
export interface SessionDTO {
  id: string;
  createdAt: Date;
  lastUsedAt?: Date;
  ipAddress?: string;
  userAgent?: string;
  device?: string;
  location?: string;
  isCurrent: boolean;
}

/**
 * SessionService Interface
 */
export interface ISessionService {
  listSessions(userId: string, currentToken?: string): Promise<SessionDTO[]>;
  getSessionCount(userId: string): Promise<number>;
  revokeSession(userId: string, sessionId: string): Promise<MessageResponse>;
  revokeAllSessions(userId: string, exceptCurrentToken?: string): Promise<MessageResponse>;
  parseUserAgent(userAgent?: string): { device: string; browser: string; os: string };
}

/**
 * SessionService
 * 
 * Manages user sessions (refresh tokens).
 * Single Responsibility: Session management only.
 */
export class SessionService implements ISessionService {
  constructor(
    private readonly refreshTokenRepository: IRefreshTokenRepository,
    private readonly userRepository: IUserRepository,
  ) { }

  /**
   * List all active sessions for a user
   */
  async listSessions(userId: string, currentToken?: string): Promise<SessionDTO[]> {
    // Verify user exists
    const user = await this.userRepository.findById(userId);
    if (!user) {
      throw new UserNotFoundError();
    }

    // Get all tokens for user
    const tokens = await this.refreshTokenRepository.findByUserId(userId);

    // Filter to active tokens and map to DTO
    return tokens
      .filter(token => {
        const validation = token.isValid();
        return validation.valid;
      })
      .map(token => ({
        id: token.id,
        createdAt: token.createdAt,
        lastUsedAt: undefined, // Could track this
        ipAddress: token.ipAddress,
        userAgent: token.userAgent,
        device: this.parseUserAgent(token.userAgent).device,
        location: undefined, // Could use IP geolocation
        isCurrent: currentToken === token.token,
      }));
  }

  /**
   * Get count of active sessions
   */
  async getSessionCount(userId: string): Promise<number> {
    const tokens = await this.refreshTokenRepository.findByUserId(userId);
    return tokens.filter(t => t.isValid().valid).length;
  }

  /**
   * Revoke a specific session
   */
  async revokeSession(userId: string, sessionId: string): Promise<MessageResponse> {
    const tokens = await this.refreshTokenRepository.findByUserId(userId);
    const token = tokens.find(t => t.id === sessionId);

    if (!token) {
      throw new InvalidRefreshTokenError('Session not found');
    }

    token.revoke();
    await this.refreshTokenRepository.update(token);

    return { message: 'Session revoked successfully' };
  }

  /**
   * Revoke all sessions except current
   */
  async revokeAllSessions(userId: string, exceptCurrentToken?: string): Promise<MessageResponse> {
    const tokens = await this.refreshTokenRepository.findByUserId(userId);
    let revokedCount = 0;

    for (const token of tokens) {
      // Skip current token if specified
      if (exceptCurrentToken && token.token === exceptCurrentToken) {
        continue;
      }

      if (token.isValid().valid) {
        token.revoke();
        await this.refreshTokenRepository.update(token);
        revokedCount++;
      }
    }

    return { message: `Revoked ${revokedCount} session(s)` };
  }

  /**
   * Parse user agent to get device info
   */
  parseUserAgent(userAgent?: string): { device: string; browser: string; os: string } {
    if (!userAgent) {
      return { device: 'Unknown', browser: 'Unknown', os: 'Unknown' };
    }

    // Simple parsing - could use a library for more accuracy
    let device = 'Desktop';
    let browser = 'Unknown';
    let os = 'Unknown';

    // Detect device
    if (/Mobile|Android|iPhone|iPad/.test(userAgent)) {
      device = /iPad/.test(userAgent) ? 'Tablet' : 'Mobile';
    }

    // Detect browser
    if (/Chrome/.test(userAgent) && !/Edge|Edg/.test(userAgent)) {
      browser = 'Chrome';
    } else if (/Firefox/.test(userAgent)) {
      browser = 'Firefox';
    } else if (/Safari/.test(userAgent) && !/Chrome/.test(userAgent)) {
      browser = 'Safari';
    } else if (/Edge|Edg/.test(userAgent)) {
      browser = 'Edge';
    }

    // Detect OS
    if (/Windows/.test(userAgent)) {
      os = 'Windows';
    } else if (/Mac OS/.test(userAgent)) {
      os = 'macOS';
    } else if (/Linux/.test(userAgent)) {
      os = 'Linux';
    } else if (/Android/.test(userAgent)) {
      os = 'Android';
    } else if (/iPhone|iPad/.test(userAgent)) {
      os = 'iOS';
    }

    return { device, browser, os };
  }
}
