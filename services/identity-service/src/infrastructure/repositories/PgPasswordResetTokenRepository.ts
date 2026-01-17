// src/infrastructure/repositories/PgPasswordResetTokenRepository.ts
import { getDb } from '../database/postgres.js';
import { PasswordResetToken, PasswordResetTokenProps } from '../../domain/entities/PasswordResetToken.js';
import type { IPasswordResetTokenRepository } from '../../domain/repositories/IPasswordResetTokenRepository.js';

/**
 * PostgreSQL PasswordResetToken Repository
 */
export class PgPasswordResetTokenRepository implements IPasswordResetTokenRepository {
  /**
   * Find password reset token by token string
   */
  async findByToken(token: string): Promise<PasswordResetToken | null> {
    const db = getDb();
    const rows = await db<PasswordResetTokenRow[]>`
      SELECT * FROM password_reset_tokens WHERE token = ${token}
    `;

    if (rows.length === 0) return null;
    return this.toDomain(rows[0]);
  }

  /**
   * Find active reset token for user
   */
  async findActiveByUserId(userId: string): Promise<PasswordResetToken | null> {
    const db = getDb();
    const rows = await db<PasswordResetTokenRow[]>`
      SELECT * FROM password_reset_tokens 
      WHERE user_id = ${userId} AND used = false AND expires_at > NOW()
      ORDER BY created_at DESC
      LIMIT 1
    `;

    if (rows.length === 0) return null;
    return this.toDomain(rows[0]);
  }

  /**
   * Save new password reset token
   */
  async save(token: PasswordResetToken): Promise<void> {
    const db = getDb();
    const props = token.toPersistence();
    await db`
      INSERT INTO password_reset_tokens (id, user_id, token, expires_at, used, created_at)
      VALUES (${props.id}, ${props.userId}, ${props.token}, ${props.expiresAt}, ${props.used}, ${props.createdAt})
    `;
  }

  /**
   * Update token (mark as used)
   */
  async update(token: PasswordResetToken): Promise<void> {
    const db = getDb();
    const props = token.toPersistence();
    await db`UPDATE password_reset_tokens SET used = ${props.used} WHERE id = ${props.id}`;
  }

  /**
   * Delete all tokens for user
   */
  async deleteByUserId(userId: string): Promise<void> {
    const db = getDb();
    await db`DELETE FROM password_reset_tokens WHERE user_id = ${userId}`;
  }

  /**
   * Map database row to domain entity
   */
  private toDomain(row: PasswordResetTokenRow): PasswordResetToken {
    return PasswordResetToken.fromPersistence({
      id: row.id,
      userId: row.user_id,
      token: row.token,
      expiresAt: row.expires_at,
      used: row.used,
      createdAt: row.created_at,
    });
  }
}

interface PasswordResetTokenRow {
  id: string;
  user_id: string;
  token: string;
  expires_at: Date;
  used: boolean;
  created_at: Date;
}
