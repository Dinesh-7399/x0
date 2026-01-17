// src/domain/entities/TwoFactorSecret.ts

import { randomUUID } from 'crypto';

/**
 * TwoFactorSecret Entity
 * 
 * Stores TOTP secret for 2FA.
 */
export interface TwoFactorSecretProps {
  id: string;
  userId: string;
  secret: string;
  enabled: boolean;
  backupCodes: string[];
  createdAt: Date;
  enabledAt?: Date;
}

export class TwoFactorSecret {
  private constructor(private readonly props: TwoFactorSecretProps) { }

  // Getters
  get id(): string { return this.props.id; }
  get userId(): string { return this.props.userId; }
  get secret(): string { return this.props.secret; }
  get enabled(): boolean { return this.props.enabled; }
  get backupCodes(): string[] { return this.props.backupCodes; }
  get createdAt(): Date { return this.props.createdAt; }
  get enabledAt(): Date | undefined { return this.props.enabledAt; }

  /**
   * Create new 2FA secret (not yet enabled)
   */
  static create(userId: string, secret: string, backupCodes: string[]): TwoFactorSecret {
    return new TwoFactorSecret({
      id: randomUUID(),
      userId,
      secret,
      enabled: false,
      backupCodes,
      createdAt: new Date(),
    });
  }

  /**
   * Reconstitute from persistence
   */
  static fromPersistence(props: TwoFactorSecretProps): TwoFactorSecret {
    return new TwoFactorSecret(props);
  }

  /**
   * Enable 2FA
   */
  enable(): void {
    this.props.enabled = true;
    this.props.enabledAt = new Date();
  }

  /**
   * Disable 2FA
   */
  disable(): void {
    this.props.enabled = false;
    this.props.enabledAt = undefined;
  }

  /**
   * Use a backup code
   */
  useBackupCode(code: string): boolean {
    const index = this.props.backupCodes.indexOf(code);
    if (index === -1) return false;

    this.props.backupCodes.splice(index, 1);
    return true;
  }

  /**
   * Check if backup code is valid
   */
  hasBackupCode(code: string): boolean {
    return this.props.backupCodes.includes(code);
  }

  /**
   * Regenerate backup codes
   */
  regenerateBackupCodes(newCodes: string[]): void {
    this.props.backupCodes = newCodes;
  }

  /**
   * Convert to persistence format
   */
  toPersistence(): TwoFactorSecretProps {
    return { ...this.props };
  }
}
