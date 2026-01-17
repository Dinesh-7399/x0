// src/application/services/TwoFactorService.ts

import * as OTPAuth from 'otpauth';
import QRCode from 'qrcode';
import type { IUserRepository } from '../../domain/repositories/IUserRepository.js';
import type { ITwoFactorRepository } from '../../domain/repositories/ITwoFactorRepository.js';
import type { IHashService } from './interfaces.js';
import type { MessageResponse } from '../dtos/auth.dto.js';
import { TwoFactorSecret } from '../../domain/entities/TwoFactorSecret.js';
import { UserNotFoundError, TwoFactorError } from '../errors/AuthErrors.js';
import { getConfig } from '../../config/index.js';

/**
 * 2FA Setup Response
 */
export interface TwoFactorSetupResponse {
  secret: string;
  qrCode: string;
  backupCodes: string[];
}

/**
 * TwoFactorService Interface
 */
export interface ITwoFactorService {
  setup(userId: string): Promise<TwoFactorSetupResponse>;
  enable(userId: string, token: string): Promise<MessageResponse>;
  disable(userId: string, token: string): Promise<MessageResponse>;
  verify(userId: string, token: string): Promise<boolean>;
  verifyBackupCode(userId: string, code: string): Promise<boolean>;
  isEnabled(userId: string): Promise<boolean>;
  regenerateBackupCodes(userId: string, token: string): Promise<{ backupCodes: string[] }>;
}

/**
 * TwoFactorService
 * 
 * Handles TOTP-based two-factor authentication.
 * Single Responsibility: 2FA operations only.
 */
export class TwoFactorService implements ITwoFactorService {
  private readonly issuer = 'Gymato';

  constructor(
    private readonly userRepository: IUserRepository,
    private readonly twoFactorRepository: ITwoFactorRepository,
    private readonly hashService: IHashService,
  ) { }

  /**
   * Setup 2FA for user (generate secret, QR code)
   */
  async setup(userId: string): Promise<TwoFactorSetupResponse> {
    // Verify user exists
    const user = await this.userRepository.findById(userId);
    if (!user) {
      throw new UserNotFoundError();
    }

    // Check if already enabled
    const existing = await this.twoFactorRepository.findByUserId(userId);
    if (existing?.enabled) {
      throw new TwoFactorError('2FA is already enabled');
    }

    // Generate TOTP secret
    const totp = new OTPAuth.TOTP({
      issuer: this.issuer,
      label: user.email,
      algorithm: 'SHA1',
      digits: 6,
      period: 30,
    });

    const secret = totp.secret.base32;

    // Generate backup codes
    const backupCodes = this.generateBackupCodes(8);

    // Save secret (not enabled yet)
    const twoFactorSecret = TwoFactorSecret.create(userId, secret, backupCodes);

    // Delete any existing and save new
    await this.twoFactorRepository.deleteByUserId(userId);
    await this.twoFactorRepository.save(twoFactorSecret);

    // Generate QR code
    const otpauthUrl = totp.toString();
    const qrCode = await QRCode.toDataURL(otpauthUrl);

    return {
      secret,
      qrCode,
      backupCodes,
    };
  }

  /**
   * Enable 2FA after verifying token
   */
  async enable(userId: string, token: string): Promise<MessageResponse> {
    const twoFactor = await this.twoFactorRepository.findByUserId(userId);
    if (!twoFactor) {
      throw new TwoFactorError('2FA not set up. Please call setup first.');
    }

    if (twoFactor.enabled) {
      throw new TwoFactorError('2FA is already enabled');
    }

    // Verify token
    const isValid = this.verifyToken(twoFactor.secret, token);
    if (!isValid) {
      throw new TwoFactorError('Invalid verification code');
    }

    // Enable 2FA
    twoFactor.enable();
    await this.twoFactorRepository.update(twoFactor);

    return { message: '2FA enabled successfully' };
  }

  /**
   * Disable 2FA
   */
  async disable(userId: string, token: string): Promise<MessageResponse> {
    const twoFactor = await this.twoFactorRepository.findByUserId(userId);
    if (!twoFactor || !twoFactor.enabled) {
      throw new TwoFactorError('2FA is not enabled');
    }

    // Verify token
    const isValid = this.verifyToken(twoFactor.secret, token);
    if (!isValid) {
      throw new TwoFactorError('Invalid verification code');
    }

    // Delete 2FA
    await this.twoFactorRepository.deleteByUserId(userId);

    return { message: '2FA disabled successfully' };
  }

  /**
   * Verify TOTP token
   */
  async verify(userId: string, token: string): Promise<boolean> {
    const twoFactor = await this.twoFactorRepository.findByUserId(userId);
    if (!twoFactor || !twoFactor.enabled) {
      return true; // 2FA not enabled, pass through
    }

    return this.verifyToken(twoFactor.secret, token);
  }

  /**
   * Verify and consume backup code
   */
  async verifyBackupCode(userId: string, code: string): Promise<boolean> {
    const twoFactor = await this.twoFactorRepository.findByUserId(userId);
    if (!twoFactor || !twoFactor.enabled) {
      return false;
    }

    if (twoFactor.useBackupCode(code)) {
      await this.twoFactorRepository.update(twoFactor);
      return true;
    }

    return false;
  }

  /**
   * Check if 2FA is enabled for user
   */
  async isEnabled(userId: string): Promise<boolean> {
    const twoFactor = await this.twoFactorRepository.findByUserId(userId);
    return twoFactor?.enabled ?? false;
  }

  /**
   * Regenerate backup codes
   */
  async regenerateBackupCodes(userId: string, token: string): Promise<{ backupCodes: string[] }> {
    const twoFactor = await this.twoFactorRepository.findByUserId(userId);
    if (!twoFactor || !twoFactor.enabled) {
      throw new TwoFactorError('2FA is not enabled');
    }

    // Verify token
    const isValid = this.verifyToken(twoFactor.secret, token);
    if (!isValid) {
      throw new TwoFactorError('Invalid verification code');
    }

    // Generate new backup codes
    const backupCodes = this.generateBackupCodes(8);
    twoFactor.regenerateBackupCodes(backupCodes);
    await this.twoFactorRepository.update(twoFactor);

    return { backupCodes };
  }

  // ============ PRIVATE HELPERS ============

  private verifyToken(secret: string, token: string): boolean {
    const totp = new OTPAuth.TOTP({
      issuer: this.issuer,
      algorithm: 'SHA1',
      digits: 6,
      period: 30,
      secret: OTPAuth.Secret.fromBase32(secret),
    });

    // Allow 1 period window for clock drift
    const delta = totp.validate({ token, window: 1 });
    return delta !== null;
  }

  private generateBackupCodes(count: number): string[] {
    const codes: string[] = [];
    for (let i = 0; i < count; i++) {
      // Generate 8-character code
      codes.push(this.hashService.generateVerificationCode() +
        this.hashService.generateVerificationCode().slice(0, 2));
    }
    return codes;
  }
}
