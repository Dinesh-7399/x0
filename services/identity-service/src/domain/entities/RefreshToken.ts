// src/domain/entities/RefreshToken.ts

/**
 * RefreshToken Entity
 * 
 * Represents a long-lived session token.
 */

export interface RefreshTokenProps {
  id: string;
  userId: string;
  token: string;
  expiresAt: Date;
  revoked: boolean;
  createdAt: Date;
  ipAddress?: string;
  userAgent?: string;
}

export class RefreshToken {
  private constructor(private props: RefreshTokenProps) {}

  /**
   * Create new refresh token
   */
  static create(
    userId: string,
    expiresInDays: number = 30,
    metadata?: { ipAddress?: string; userAgent?: string },
  ): RefreshToken {
    const now = new Date();
    const expiresAt = new Date(now.getTime() + expiresInDays * 24 * 60 * 60 * 1000);

    return new RefreshToken({
      id: crypto.randomUUID(),
      userId,
      token: crypto.randomUUID(), // Random token
      expiresAt,
      revoked: false,
      createdAt: now,
      ...metadata,
    });
  }

  /**
   * Reconstitute from database
   */
  static fromPersistence(props: RefreshTokenProps): RefreshToken {
    return new RefreshToken(props);
  }

  /**
   * Business Rules
   */

  /**
   * Is this token valid?
   */
  isValid(): { valid: boolean; reason?: string } {
    if (this.props.revoked) {
      return { valid: false, reason: 'Token has been revoked' };
    }

    if (this.props.expiresAt < new Date()) {
      return { valid: false, reason: 'Token has expired' };
    }

    return { valid: true };
  }

  /**
   * Revoke token
   */
  revoke(): void {
    this.props.revoked = true;
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

  get revoked(): boolean {
    return this.props.revoked;
  }

  get createdAt(): Date {
    return this.props.createdAt;
  }

  get ipAddress(): string | undefined {
    return this.props.ipAddress;
  }

  get userAgent(): string | undefined {
    return this.props.userAgent;
  }

  toPersistence(): RefreshTokenProps {
    return { ...this.props };
  }
}