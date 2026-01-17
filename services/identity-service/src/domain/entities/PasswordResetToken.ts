// src/domain/entities/PasswordResetToken.ts

/**
 * PasswordResetToken Entity
 * 
 * For password reset flow.
 */

export interface PasswordResetTokenProps {
  id: string;
  userId: string;
  token: string;
  expiresAt: Date;
  used: boolean;
  createdAt: Date;
}

export class PasswordResetToken {
  private constructor(private props: PasswordResetTokenProps) {}

  /**
   * Create new reset token
   */
  static create(userId: string, token: string, expiresInHours: number = 1): PasswordResetToken {
    const now = new Date();
    const expiresAt = new Date(now.getTime() + expiresInHours * 60 * 60 * 1000);

    return new PasswordResetToken({
      id: crypto.randomUUID(),
      userId,
      token,
      expiresAt,
      used: false,
      createdAt: now,
    });
  }

  /**
   * Reconstitute from database
   */
  static fromPersistence(props: PasswordResetTokenProps): PasswordResetToken {
    return new PasswordResetToken(props);
  }

  /**
   * Business Rules
   */

  /**
   * Is this token valid?
   */
  isValid(): { valid: boolean; reason?: string } {
    if (this.props.used) {
      return { valid: false, reason: 'Token has already been used' };
    }

    if (this.props.expiresAt < new Date()) {
      return { valid: false, reason: 'Token has expired' };
    }

    return { valid: true };
  }

  /**
   * Mark as used
   */
  markAsUsed(): void {
    this.props.used = true;
  }

  /**
   * Getters
   */
  get id(): string {
    return this.props.id;
  }

  get userId(): string {
    return this.props.userId;
  }

  get token(): string {
    return this.props.token;
  }

  get expiresAt(): Date {
    return this.props.expiresAt;
  }

  get used(): boolean {
    return this.props.used;
  }

  get createdAt(): Date {
    return this.props.createdAt;
  }

  toPersistence(): PasswordResetTokenProps {
    return { ...this.props };
  }
}