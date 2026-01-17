// src/infrastructure/repositories/PgLoginHistoryRepository.ts

import { getDb } from '../database/postgres.js';
import { LoginHistory, LoginHistoryProps, LoginStatus } from '../../domain/entities/LoginHistory.js';
import type { ILoginHistoryRepository } from '../../domain/repositories/ILoginHistoryRepository.js';

/**
 * PostgreSQL LoginHistory Repository
 */
export class PgLoginHistoryRepository implements ILoginHistoryRepository {
  /**
   * Find login history by user
   */
  async findByUserId(userId: string, limit: number = 50): Promise<LoginHistory[]> {
    const db = getDb();
    const rows = await db<LoginHistoryRow[]>`
      SELECT * FROM login_history 
      WHERE user_id = ${userId} 
      ORDER BY created_at DESC 
      LIMIT ${limit}
    `;

    return rows.map((row) => this.toDomain(row));
  }

  /**
   * Count recent failed attempts
   */
  async countRecentFailedAttempts(userId: string, sinceMinutes: number): Promise<number> {
    const db = getDb();
    const cutoff = new Date(Date.now() - sinceMinutes * 60 * 1000);

    const rows = await db<{ count: string }[]>`
      SELECT COUNT(*) as count FROM login_history 
      WHERE user_id = ${userId} 
        AND status IN ('FAILED_PASSWORD', 'FAILED_2FA')
        AND created_at > ${cutoff}
    `;

    return parseInt(rows[0]?.count || '0', 10);
  }

  /**
   * Save login history entry
   */
  async save(entry: LoginHistory): Promise<void> {
    const db = getDb();
    const props = entry.toPersistence();
    await db`
      INSERT INTO login_history (id, user_id, status, ip_address, user_agent, device, browser, os, location, created_at)
      VALUES (${props.id}, ${props.userId}, ${props.status}, ${props.ipAddress || null}, ${props.userAgent || null}, ${props.device || null}, ${props.browser || null}, ${props.os || null}, ${props.location || null}, ${props.createdAt})
    `;
  }

  /**
   * Delete old history
   */
  async deleteOlderThan(days: number): Promise<number> {
    const db = getDb();
    const cutoff = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

    const result = await db`
      DELETE FROM login_history WHERE created_at < ${cutoff} RETURNING id
    `;

    return result.length;
  }

  /**
   * Map database row to domain entity
   */
  private toDomain(row: LoginHistoryRow): LoginHistory {
    return LoginHistory.fromPersistence({
      id: row.id,
      userId: row.user_id,
      status: row.status as LoginStatus,
      ipAddress: row.ip_address || undefined,
      userAgent: row.user_agent || undefined,
      device: row.device || undefined,
      browser: row.browser || undefined,
      os: row.os || undefined,
      location: row.location || undefined,
      createdAt: row.created_at,
    });
  }
}

interface LoginHistoryRow {
  id: string;
  user_id: string;
  status: string;
  ip_address: string | null;
  user_agent: string | null;
  device: string | null;
  browser: string | null;
  os: string | null;
  location: string | null;
  created_at: Date;
}
