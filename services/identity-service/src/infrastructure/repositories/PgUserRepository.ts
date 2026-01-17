// src/infrastructure/repositories/PgUserRepository.ts
import { getDb } from '../database/postgres.js';
import { User, UserStatus, UserProps } from '../../domain/entities/User.js';
import type { IUserRepository } from '../../domain/repositories/IUserRepository.js';

/**
 * PostgreSQL User Repository (using postgres.js)
 */
export class PgUserRepository implements IUserRepository {
  /**
   * Find user by ID
   */
  async findById(id: string): Promise<User | null> {
    const db = getDb();
    const rows = await db<UserRow[]>`
      SELECT * FROM users WHERE id = ${id} AND status != 'DELETED'
    `;

    if (rows.length === 0) return null;
    return this.toDomain(rows[0]);
  }

  /**
   * Find user by email
   */
  async findByEmail(email: string): Promise<User | null> {
    const db = getDb();
    const rows = await db<UserRow[]>`
      SELECT * FROM users WHERE email = ${email.toLowerCase()} AND status != 'DELETED'
    `;

    if (rows.length === 0) return null;
    return this.toDomain(rows[0]);
  }

  /**
   * Save new user
   */
  async save(user: User): Promise<void> {
    const db = getDb();
    const props = user.toPersistence();
    await db`
      INSERT INTO users (id, email, password_hash, email_verified, phone_verified, phone, status, created_at, updated_at, last_login_at)
      VALUES (${props.id}, ${props.email}, ${props.passwordHash}, ${props.emailVerified}, ${props.phoneVerified}, ${props.phone || null}, ${props.status}, ${props.createdAt}, ${props.updatedAt}, ${props.lastLoginAt || null})
    `;
  }

  /**
   * Update existing user
   */
  async update(user: User): Promise<void> {
    const db = getDb();
    const props = user.toPersistence();
    await db`
      UPDATE users SET 
        email = ${props.email},
        password_hash = ${props.passwordHash},
        email_verified = ${props.emailVerified},
        phone_verified = ${props.phoneVerified},
        phone = ${props.phone || null},
        status = ${props.status},
        updated_at = ${props.updatedAt},
        last_login_at = ${props.lastLoginAt || null}
      WHERE id = ${props.id}
    `;
  }

  /**
   * Soft delete user
   */
  async delete(id: string): Promise<void> {
    const db = getDb();
    await db`UPDATE users SET status = 'DELETED', updated_at = NOW() WHERE id = ${id}`;
  }

  /**
   * Map database row to domain entity
   */
  private toDomain(row: UserRow): User {
    return User.fromPersistence({
      id: row.id,
      email: row.email,
      passwordHash: row.password_hash,
      emailVerified: row.email_verified,
      phoneVerified: row.phone_verified,
      phone: row.phone || undefined,
      status: row.status as UserStatus,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
      lastLoginAt: row.last_login_at || undefined,
    });
  }
}

// Database row type
interface UserRow {
  id: string;
  email: string;
  password_hash: string;
  email_verified: boolean;
  phone_verified: boolean;
  phone: string | null;
  status: string;
  created_at: Date;
  updated_at: Date;
  last_login_at: Date | null;
}
