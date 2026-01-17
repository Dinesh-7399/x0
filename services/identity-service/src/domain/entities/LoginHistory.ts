// src/domain/entities/LoginHistory.ts

import { randomUUID } from 'crypto';

/**
 * Login Status
 */
export enum LoginStatus {
  SUCCESS = 'SUCCESS',
  FAILED_PASSWORD = 'FAILED_PASSWORD',
  FAILED_2FA = 'FAILED_2FA',
  BLOCKED = 'BLOCKED',
}

/**
 * LoginHistory Entity
 * 
 * Tracks login attempts for audit and security.
 */
export interface LoginHistoryProps {
  id: string;
  userId: string;
  status: LoginStatus;
  ipAddress?: string;
  userAgent?: string;
  device?: string;
  browser?: string;
  os?: string;
  location?: string;
  createdAt: Date;
}

export class LoginHistory {
  private constructor(private readonly props: LoginHistoryProps) { }

  // Getters
  get id(): string { return this.props.id; }
  get userId(): string { return this.props.userId; }
  get status(): LoginStatus { return this.props.status; }
  get ipAddress(): string | undefined { return this.props.ipAddress; }
  get userAgent(): string | undefined { return this.props.userAgent; }
  get device(): string | undefined { return this.props.device; }
  get browser(): string | undefined { return this.props.browser; }
  get os(): string | undefined { return this.props.os; }
  get location(): string | undefined { return this.props.location; }
  get createdAt(): Date { return this.props.createdAt; }

  /**
   * Create new login history entry
   */
  static create(
    userId: string,
    status: LoginStatus,
    metadata?: {
      ipAddress?: string;
      userAgent?: string;
      device?: string;
      browser?: string;
      os?: string;
      location?: string;
    },
  ): LoginHistory {
    return new LoginHistory({
      id: randomUUID(),
      userId,
      status,
      ipAddress: metadata?.ipAddress,
      userAgent: metadata?.userAgent,
      device: metadata?.device,
      browser: metadata?.browser,
      os: metadata?.os,
      location: metadata?.location,
      createdAt: new Date(),
    });
  }

  /**
   * Reconstitute from persistence
   */
  static fromPersistence(props: LoginHistoryProps): LoginHistory {
    return new LoginHistory(props);
  }

  /**
   * Convert to persistence format
   */
  toPersistence(): LoginHistoryProps {
    return { ...this.props };
  }
}
