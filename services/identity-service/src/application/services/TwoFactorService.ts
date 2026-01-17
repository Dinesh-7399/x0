// src/application/services/TwoFactorService.ts

import * as OTPAuth from 'otpauth';
import QRCode from 'qrcode';
import type { IUserRepository } from '../../domain/repositories/IUserRepository.js';
import type { ITwoFactorRepository } from '../../domain/repositories/ITwoFactorRepository.js';
import type { IHashService } from './interfaces.js';
import type { IEncryptionService } from '../../infrastructure/services/EncryptionService.js';
import type { MessageResponse } from '../dtos/auth.dto.js';
import { TwoFactorSecret } from '../../domain/entities/TwoFactorSecret.js';
import { UserNotFoundError, TwoFactorError } from '../errors/AuthErrors.js';

/**
 * 2FA Setup Response
 */
export interface TwoFactorSetupResponse {
  secret: string;      // Plaintext shown ONCE to user
  qrCode: string;
  backupCodes: string[]; // Plaintext shown ONCE to user
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
 * 
 * SECURITY:
 * - TOTP secrets are encrypted with AES-256-GCM before storage
 * - Backup codes are bcrypt hashed before storage
 * - Plaintext values are only returned to user once during setup
 */
export class TwoFactorService implements ITwoFactorService {
  private readonly issuer = 'Gymato';

  constructor(
    private readonly userRepository: IUserRepository,
    private readonly twoFactorRepository: ITwoFactorRepository,
    private readonly hashService: IHashService,
    private readonly encryptionService: IEncryptionService,
  ) { }

  /**
   * Setup 2FA for user (generate secret, QR code)
   * Returns plaintext values ONCE - they are encrypted/hashed before storage
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

    const plaintextSecret = totp.secret.base32;

    // Generate plaintext backup codes
    const plaintextBackupCodes = this.generateBackupCodes(8);

    // SECURITY: Encrypt secret before storage
    const encryptedSecretData = await this.encryptionService.encrypt(plaintextSecret);
    const encryptedSecret = JSON.stringify(encryptedSecretData);

    // SECURITY: Hash each backup code before storage
    const hashedBackupCodes = await this.hashBackupCodes(plaintextBackupCodes);

    // Save encrypted/hashed values (not enabled yet)
    const twoFactorSecret = TwoFactorSecret.create(userId, encryptedSecret, hashedBackupCodes);

    // Delete any existing and save new
    await this.twoFactorRepository.deleteByUserId(userId);
    await this.twoFactorRepository.save(twoFactorSecret);

    // Generate QR code
    const otpauthUrl = totp.toString();
    const qrCode = await QRCode.toDataURL(otpauthUrl);

    // Return plaintext values to user (shown ONCE)
    return {
      secret: plaintextSecret,
      qrCode,
      backupCodes: plaintextBackupCodes,
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

    // Decrypt secret and verify token
    const decryptedSecret = await this.decryptSecret(twoFactor.secret);
    const isValid = this.verifyToken(decryptedSecret, token);
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

    // Decrypt secret and verify token
    const decryptedSecret = await this.decryptSecret(twoFactor.secret);
    const isValid = this.verifyToken(decryptedSecret, token);
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

    // Decrypt secret and verify
    const decryptedSecret = await this.decryptSecret(twoFactor.secret);
    return this.verifyToken(decryptedSecret, token);
  }

  /**
   * Verify and consume backup code
   * Compares input against bcrypt hashes
   */
  async verifyBackupCode(userId: string, code: string): Promise<boolean> {
    const twoFactor = await this.twoFactorRepository.findByUserId(userId);
    if (!twoFactor || !twoFactor.enabled) {
      return false;
    }

    // Check each hashed backup code
    const backupCodes = twoFactor.backupCodes;
    for (let i = 0; i < backupCodes.length; i++) {
      const isMatch = await this.hashService.compare(code, backupCodes[i]);
      if (isMatch) {
        // Remove the used code
        backupCodes.splice(i, 1);
        twoFactor.regenerateBackupCodes(backupCodes);
        await this.twoFactorRepository.update(twoFactor);
        return true;
      }
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

    // Decrypt secret and verify token
    const decryptedSecret = await this.decryptSecret(twoFactor.secret);
    const isValid = this.verifyToken(decryptedSecret, token);
    if (!isValid) {
      throw new TwoFactorError('Invalid verification code');
    }

    // Generate new plaintext codes
    const plaintextBackupCodes = this.generateBackupCodes(8);

    // Hash codes before storage
    const hashedBackupCodes = await this.hashBackupCodes(plaintextBackupCodes);
    twoFactor.regenerateBackupCodes(hashedBackupCodes);
    await this.twoFactorRepository.update(twoFactor);

    // Return plaintext codes to user (shown ONCE)
    return { backupCodes: plaintextBackupCodes };
  }

  // ============ PRIVATE HELPERS ============

  /**
   * Decrypt secret from storage
   */
  private async decryptSecret(encryptedSecret: string): Promise<string> {
    try {
      const encryptedData = JSON.parse(encryptedSecret);
      return await this.encryptionService.decrypt(encryptedData);
    } catch (error) {
      throw new TwoFactorError('Failed to decrypt 2FA secret');
    }
  }

  /**
   * Hash all backup codes with bcrypt
   */
  private async hashBackupCodes(codes: string[]): Promise<string[]> {
    return Promise.all(codes.map(code => this.hashService.hash(code)));
  }

  /**
   * Verify TOTP token against decrypted secret
   */
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

  /**
   * Generate random backup codes
   */
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
