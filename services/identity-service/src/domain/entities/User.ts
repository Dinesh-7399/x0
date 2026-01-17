// src/domain/entities/User.ts

/**
 * User Entity (Aggregate Root)
 * 
 * Core business entity for authentication.
 * Contains NO external dependencies (no database, no framework).
 */

export enum UserStatus {
  ACTIVE = 'ACTIVE',
  SUSPENDED = 'SUSPENDED',
  DELETED = 'DELETED',
}

export interface UserProps {
  id: string;
  email: string;
  passwordHash: string;
  emailVerified: boolean;
  phoneVerified: boolean;
  phone?: string;
  status: UserStatus;
  createdAt: Date;
  updatedAt: Date;
  lastLoginAt?: Date;
}

export class User {
  private constructor(private props: UserProps) {}

  /**
   * Factory: Create new user (for registration)
   */
  static create(props: Omit<UserProps, 'id' | 'createdAt' | 'updatedAt'>): User {
    const now = new Date();
    
    return new User({
      ...props,
      id: crypto.randomUUID(),
      createdAt: now,
      updatedAt: now,
    });
  }

  /**
   * Factory: Reconstitute from database
   */
  static fromPersistence(props: UserProps): User {
    return new User(props);
  }

  /**
   * Business Rules
   */

  /**
   * Can this user log in?
   */
  canLogin(): { allowed: boolean; reason?: string } {
    if (this.props.status !== UserStatus.ACTIVE) {
      return { allowed: false, reason: 'Account is not active' };
    }

    if (!this.props.emailVerified) {
      return { allowed: false, reason: 'Email not verified' };
    }

    return { allowed: true };
  }

  /**
   * Verify email
   */
  verifyEmail(): void {
    this.props.emailVerified = true;
    this.props.updatedAt = new Date();
  }

  /**
   * Verify phone
   */
  verifyPhone(): void {
    this.props.phoneVerified = true;
    this.props.updatedAt = new Date();
  }

  /**
   * Record successful login
   */
  recordLogin(): void {
    this.props.lastLoginAt = new Date();
    this.props.updatedAt = new Date();
  }

  /**
   * Change password
   */
  changePassword(newPasswordHash: string): void {
    this.props.passwordHash = newPasswordHash;
    this.props.updatedAt = new Date();
  }

  /**
   * Suspend account
   */
  suspend(): void {
    this.props.status = UserStatus.SUSPENDED;
    this.props.updatedAt = new Date();
  }

  /**
   * Reactivate account
   */
  reactivate(): void {
    this.props.status = UserStatus.ACTIVE;
    this.props.updatedAt = new Date();
  }

  /**
   * Soft delete
   */
  delete(): void {
    this.props.status = UserStatus.DELETED;
    this.props.updatedAt = new Date();
  }

  /**
   * Getters (read-only access)
   */
  get id(): string {
    return this.props.id;
  }

  get email(): string {
    return this.props.email;
  }

  get passwordHash(): string {
    return this.props.passwordHash;
  }

  get emailVerified(): boolean {
    return this.props.emailVerified;
  }

  get phoneVerified(): boolean {
    return this.props.phoneVerified;
  }

  get phone(): string | undefined {
    return this.props.phone;
  }

  get status(): UserStatus {
    return this.props.status;
  }

  get createdAt(): Date {
    return this.props.createdAt;
  }

  get updatedAt(): Date {
    return this.props.updatedAt;
  }

  get lastLoginAt(): Date | undefined {
    return this.props.lastLoginAt;
  }

  /**
   * Convert to persistence format (all fields)
   */
  toPersistence(): UserProps {
    return { ...this.props };
  }

  /**
   * Convert to DTO (safe for API responses, excludes password)
   */
  toDTO() {
    return {
      id: this.props.id,
      email: this.props.email,
      emailVerified: this.props.emailVerified,
      phoneVerified: this.props.phoneVerified,
      phone: this.props.phone,
      status: this.props.status,
      createdAt: this.props.createdAt,
      lastLoginAt: this.props.lastLoginAt,
    };
  }
}