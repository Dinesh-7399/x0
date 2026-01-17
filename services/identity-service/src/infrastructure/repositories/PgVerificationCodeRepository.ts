// src/infrastructure/repositories/PgVerificationCodeRepository.ts
import { getDb } from '../database/postgres.js';
import { VerificationCode, VerificationType, VerificationCodeProps } from '../../domain/entities/VerificationCode.js';
import type { IVerificationCodeRepository } from '../../domain/repositories/IVerificationCodeRepository.js';

/**
 * PostgreSQL VerificationCode Repository
 */
export class PgVerificationCodeRepository implements IVerificationCodeRepository {
  /**
   * Find verification code by code string
   */
  async findByCode(code: string, type: VerificationType): Promise<VerificationCode | null> {
    const db = getDb();
    const rows = await db<VerificationCodeRow[]>`
      SELECT * FROM verification_codes 
      WHERE code = ${code} AND type = ${type} AND used = false AND expires_at > NOW()
    `;

    if (rows.length === 0) return null;
    return this.toDomain(rows[0]);
  }

  /**
   * Find active verification codes for user
   */
  async findActiveByUserId(userId: string, type: VerificationType): Promise<VerificationCode[]> {
    const db = getDb();
    const rows = await db<VerificationCodeRow[]>`
      SELECT * FROM verification_codes 
      WHERE user_id = ${userId} AND type = ${type} AND used = false AND expires_at > NOW()
      ORDER BY created_at DESC
    `;

    return rows.map((row) => this.toDomain(row));
  }

  /**
   * Save new verification code
   */
  async save(code: VerificationCode): Promise<void> {
    const db = getDb();
    const props = code.toPersistence();
    await db`
      INSERT INTO verification_codes (id, user_id, code, type, expires_at, used, created_at)
      VALUES (${props.id}, ${props.userId}, ${props.code}, ${props.type}, ${props.expiresAt}, ${props.used}, ${props.createdAt})
    `;
  }

  /**
   * Update verification code
   */
  async update(code: VerificationCode): Promise<void> {
    const db = getDb();
    const props = code.toPersistence();
    await db`UPDATE verification_codes SET used = ${props.used} WHERE id = ${props.id}`;
  }

  /**
   * Delete all codes for user
   */
  async deleteByUserId(userId: string, type: VerificationType): Promise<void> {
    const db = getDb();
    await db`DELETE FROM verification_codes WHERE user_id = ${userId} AND type = ${type}`;
  }

  /**
   * Map database row to domain entity
   */
  private toDomain(row: VerificationCodeRow): VerificationCode {
    return VerificationCode.fromPersistence({
      id: row.id,
      userId: row.user_id,
      code: row.code,
      type: row.type as VerificationType,
      expiresAt: row.expires_at,
      used: row.used,
      createdAt: row.created_at,
    });
  }
}

interface VerificationCodeRow {
  id: string;
  user_id: string;
  code: string;
  type: string;
  expires_at: Date;
  used: boolean;
  created_at: Date;
}
