// src/infrastructure/repositories/PgRefreshTokenRepository.ts
import { getDb } from '../database/postgres.js';
import { RefreshToken, RefreshTokenProps } from '../../domain/entities/RefreshToken.js';
import type { IRefreshTokenRepository } from '../../domain/repositories/IRefreshTokenRepository.js';

/**
 * PostgreSQL RefreshToken Repository (using postgres.js)
 */
export class PgRefreshTokenRepository implements IRefreshTokenRepository {
  /**
   * Find refresh token by token string
   */
  async findByToken(token: string): Promise<RefreshToken | null> {
    const db = getDb();
    const rows = await db<RefreshTokenRow[]>`
      SELECT * FROM refresh_tokens WHERE token = ${token}
    `;

    if (rows.length === 0) return null;
    return this.toDomain(rows[0]);
  }

  /**
   * Find all tokens for a user
   */
  async findByUserId(userId: string): Promise<RefreshToken[]> {
    const db = getDb();
    const rows = await db<RefreshTokenRow[]>`
      SELECT * FROM refresh_tokens WHERE user_id = ${userId} ORDER BY created_at DESC
    `;

    return rows.map((row) => this.toDomain(row));
  }

  /**
   * Save new refresh token
   */
  async save(token: RefreshToken): Promise<void> {
    const db = getDb();
    const props = token.toPersistence();
    await db`
      INSERT INTO refresh_tokens (id, user_id, token, expires_at, revoked, created_at, ip_address, user_agent)
      VALUES (${props.id}, ${props.userId}, ${props.token}, ${props.expiresAt}, ${props.revoked}, ${props.createdAt}, ${props.ipAddress || null}, ${props.userAgent || null})
    `;
  }

  /**
   * Update refresh token (e.g., revoke)
   */
  async update(token: RefreshToken): Promise<void> {
    const db = getDb();
    const props = token.toPersistence();
    await db`UPDATE refresh_tokens SET revoked = ${props.revoked} WHERE id = ${props.id}`;
  }

  /**
   * Revoke all tokens for a user
   */
  async revokeAllForUser(userId: string): Promise<void> {
    const db = getDb();
    await db`UPDATE refresh_tokens SET revoked = true WHERE user_id = ${userId}`;
  }

  /**
   * Delete expired tokens
   */
  async deleteExpired(): Promise<number> {
    const db = getDb();
    const result = await db`DELETE FROM refresh_tokens WHERE expires_at < NOW() RETURNING id`;
    return result.length;
  }

  /**
   * Map database row to domain entity
   */
  private toDomain(row: RefreshTokenRow): RefreshToken {
    return RefreshToken.fromPersistence({
      id: row.id,
      userId: row.user_id,
      token: row.token,
      expiresAt: row.expires_at,
      revoked: row.revoked,
      createdAt: row.created_at,
      ipAddress: row.ip_address || undefined,
      userAgent: row.user_agent || undefined,
    });
  }
}

// Database row type
interface RefreshTokenRow {
  id: string;
  user_id: string;
  token: string;
  expires_at: Date;
  revoked: boolean;
  created_at: Date;
  ip_address: string | null;
  user_agent: string | null;
}
