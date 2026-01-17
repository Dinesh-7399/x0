// src/domain/entities/VerificationCode.ts

/**
 * VerificationCode Entity
 * 
 * For email/phone verification.
 */

export enum VerificationType {
  EMAIL = 'EMAIL',
  PHONE = 'PHONE',
}

export interface VerificationCodeProps {
  id: string;
  userId: string;
  code: string;
  type: VerificationType;
  expiresAt: Date;
  used: boolean;
  createdAt: Date;
}

export class VerificationCode {
  private constructor(private props: VerificationCodeProps) {}

  /**
   * Create new verification code
   */
  static create(
    userId: string,
    code: string,
    type: VerificationType,
    expiresInHours: number = 24,
  ): VerificationCode {
    const now = new Date();
    const expiresAt = new Date(now.getTime() + expiresInHours * 60 * 60 * 1000);

    return new VerificationCode({
      id: crypto.randomUUID(),
      userId,
      code,
      type,
      expiresAt,
      used: false,
      createdAt: now,
    });
  }

  /**
   * Reconstitute from database
   */
  static fromPersistence(props: VerificationCodeProps): VerificationCode {
    return new VerificationCode(props);
  }

  /**
   * Business Rules
   */

  /**
   * Is this code valid?
   */
  isValid(): { valid: boolean; reason?: string } {
    if (this.props.used) {
      return { valid: false, reason: 'Code has already been used' };
    }

    if (this.props.expiresAt < new Date()) {
      return { valid: false, reason: 'Code has expired' };
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

  get code(): string {
    return this.props.code;
  }

  get type(): VerificationType {
    return this.props.type;
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

  toPersistence(): VerificationCodeProps {
    return { ...this.props };
  }
}