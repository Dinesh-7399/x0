// src/application/services/LoginHistoryService.ts

import type { ILoginHistoryRepository } from '../../domain/repositories/ILoginHistoryRepository.js';
import type { IUserRepository } from '../../domain/repositories/IUserRepository.js';
import { LoginHistory, LoginStatus } from '../../domain/entities/LoginHistory.js';
import { UserNotFoundError } from '../errors/AuthErrors.js';

/**
 * LoginHistory DTO
 */
export interface LoginHistoryDTO {
  id: string;
  status: LoginStatus;
  ipAddress?: string;
  device?: string;
  browser?: string;
  os?: string;
  location?: string;
  createdAt: Date;
}

/**
 * LoginHistoryService Interface
 */
export interface ILoginHistoryService {
  recordLogin(
    userId: string,
    status: LoginStatus,
    metadata?: { ipAddress?: string; userAgent?: string },
  ): Promise<void>;
  getHistory(userId: string, limit?: number): Promise<LoginHistoryDTO[]>;
  getRecentFailedCount(userId: string, minutes?: number): Promise<number>;
  isAccountLocked(userId: string): Promise<{ locked: boolean; unlockAt?: Date }>;
  cleanup(retentionDays?: number): Promise<number>;
}

/**
 * LoginHistoryService
 * 
 * Tracks and manages login history for audit and security.
 * Single Responsibility: Login history operations only.
 */
export class LoginHistoryService implements ILoginHistoryService {
  private readonly MAX_FAILED_ATTEMPTS = 10;
  private readonly LOCKOUT_MINUTES = 30;
  private readonly DEFAULT_RETENTION_DAYS = 90;

  constructor(
    private readonly loginHistoryRepository: ILoginHistoryRepository,
    private readonly userRepository: IUserRepository,
  ) { }

  /**
   * Record a login attempt
   */
  async recordLogin(
    userId: string,
    status: LoginStatus,
    metadata?: { ipAddress?: string; userAgent?: string },
  ): Promise<void> {
    const parsed = this.parseUserAgent(metadata?.userAgent);

    const entry = LoginHistory.create(userId, status, {
      ipAddress: metadata?.ipAddress,
      userAgent: metadata?.userAgent,
      device: parsed.device,
      browser: parsed.browser,
      os: parsed.os,
    });

    await this.loginHistoryRepository.save(entry);
  }

  /**
   * Get login history for user
   */
  async getHistory(userId: string, limit: number = 20): Promise<LoginHistoryDTO[]> {
    const user = await this.userRepository.findById(userId);
    if (!user) {
      throw new UserNotFoundError();
    }

    const history = await this.loginHistoryRepository.findByUserId(userId, limit);

    return history.map(h => ({
      id: h.id,
      status: h.status,
      ipAddress: h.ipAddress,
      device: h.device,
      browser: h.browser,
      os: h.os,
      location: h.location,
      createdAt: h.createdAt,
    }));
  }

  /**
   * Get count of recent failed login attempts
   */
  async getRecentFailedCount(userId: string, minutes: number = 30): Promise<number> {
    return this.loginHistoryRepository.countRecentFailedAttempts(userId, minutes);
  }

  /**
   * Check if account is locked due to failed attempts
   */
  async isAccountLocked(userId: string): Promise<{ locked: boolean; unlockAt?: Date }> {
    const failedCount = await this.getRecentFailedCount(userId, this.LOCKOUT_MINUTES);

    if (failedCount >= this.MAX_FAILED_ATTEMPTS) {
      // Calculate unlock time (after lockout period from last attempt)
      const unlockAt = new Date(Date.now() + this.LOCKOUT_MINUTES * 60 * 1000);
      return { locked: true, unlockAt };
    }

    return { locked: false };
  }

  /**
   * Cleanup old history entries
   */
  async cleanup(retentionDays: number = this.DEFAULT_RETENTION_DAYS): Promise<number> {
    return this.loginHistoryRepository.deleteOlderThan(retentionDays);
  }

  // ============ PRIVATE HELPERS ============

  private parseUserAgent(userAgent?: string): { device: string; browser: string; os: string } {
    if (!userAgent) {
      return { device: 'Unknown', browser: 'Unknown', os: 'Unknown' };
    }

    let device = 'Desktop';
    let browser = 'Unknown';
    let os = 'Unknown';

    // Device detection
    if (/Mobile|Android|iPhone|iPad/.test(userAgent)) {
      device = /iPad/.test(userAgent) ? 'Tablet' : 'Mobile';
    }

    // Browser detection
    if (/Chrome/.test(userAgent) && !/Edge|Edg/.test(userAgent)) {
      browser = 'Chrome';
    } else if (/Firefox/.test(userAgent)) {
      browser = 'Firefox';
    } else if (/Safari/.test(userAgent) && !/Chrome/.test(userAgent)) {
      browser = 'Safari';
    } else if (/Edge|Edg/.test(userAgent)) {
      browser = 'Edge';
    }

    // OS detection
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
