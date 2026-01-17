// src/infrastructure/repositories/PgTwoFactorRepository.ts

import { getDb } from '../database/postgres.js';
import { TwoFactorSecret, TwoFactorSecretProps } from '../../domain/entities/TwoFactorSecret.js';
import type { ITwoFactorRepository } from '../../domain/repositories/ITwoFactorRepository.js';

/**
 * PostgreSQL TwoFactor Repository
 */
export class PgTwoFactorRepository implements ITwoFactorRepository {
  /**
   * Find 2FA secret by user ID
   */
  async findByUserId(userId: string): Promise<TwoFactorSecret | null> {
    const db = getDb();
    const rows = await db<TwoFactorSecretRow[]>`
      SELECT * FROM two_factor_secrets WHERE user_id = ${userId}
    `;

    if (rows.length === 0) return null;
    return this.toDomain(rows[0]);
  }

  /**
   * Save new 2FA secret
   */
  async save(secret: TwoFactorSecret): Promise<void> {
    const db = getDb();
    const props = secret.toPersistence();
    await db`
      INSERT INTO two_factor_secrets (id, user_id, secret, enabled, backup_codes, created_at, enabled_at)
      VALUES (${props.id}, ${props.userId}, ${props.secret}, ${props.enabled}, ${props.backupCodes}, ${props.createdAt}, ${props.enabledAt || null})
    `;
  }

  /**
   * Update 2FA secret
   */
  async update(secret: TwoFactorSecret): Promise<void> {
    const db = getDb();
    const props = secret.toPersistence();
    await db`
      UPDATE two_factor_secrets 
      SET enabled = ${props.enabled}, 
          backup_codes = ${props.backupCodes}, 
          enabled_at = ${props.enabledAt || null}
      WHERE id = ${props.id}
    `;
  }

  /**
   * Delete 2FA secret for user
   */
  async deleteByUserId(userId: string): Promise<void> {
    const db = getDb();
    await db`DELETE FROM two_factor_secrets WHERE user_id = ${userId}`;
  }

  /**
   * Map database row to domain entity
   */
  private toDomain(row: TwoFactorSecretRow): TwoFactorSecret {
    return TwoFactorSecret.fromPersistence({
      id: row.id,
      userId: row.user_id,
      secret: row.secret,
      enabled: row.enabled,
      backupCodes: row.backup_codes,
      createdAt: row.created_at,
      enabledAt: row.enabled_at || undefined,
    });
  }
}

interface TwoFactorSecretRow {
  id: string;
  user_id: string;
  secret: string;
  enabled: boolean;
  backup_codes: string[];
  created_at: Date;
  enabled_at: Date | null;
}
