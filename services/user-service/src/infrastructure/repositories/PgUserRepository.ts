// src/infrastructure/repositories/PgUserRepository.ts

import { getDb } from '../database/postgres.js';
import { User, UserProps } from '../../domain/entities/User.js';
import type { IUserRepository } from '../../domain/repositories/IUserRepository.js';

export class PgUserRepository implements IUserRepository {
  async findById(id: string): Promise<User | null> {
    const db = getDb();
    const rows = await db<UserRow[]>`SELECT * FROM users WHERE id = ${id}`;
    if (rows.length === 0) return null;
    return this.toDomain(rows[0]);
  }

  async findByEmail(email: string): Promise<User | null> {
    const db = getDb();
    const rows = await db<UserRow[]>`SELECT * FROM users WHERE email = ${email}`;
    if (rows.length === 0) return null;
    return this.toDomain(rows[0]);
  }

  async findAll(limit: number = 20, offset: number = 0): Promise<{ users: User[], total: number }> {
    const db = getDb();
    const [users, countResult] = await Promise.all([
      db<UserRow[]>`
        SELECT * FROM users 
        ORDER BY created_at DESC 
        LIMIT ${limit} OFFSET ${offset}
      `,
      db<{ count: string }[]>`SELECT COUNT(*) as count FROM users`
    ]);

    return {
      users: users.map(row => this.toDomain(row)),
      total: parseInt(countResult[0].count, 10),
    };
  }

  async updateStatus(id: string, status: string): Promise<void> {
    const db = getDb();
    await db`
      UPDATE users 
      SET status = ${status}, updated_at = NOW() 
      WHERE id = ${id}
    `;
  }

  private toDomain(row: UserRow): User {
    return User.fromPersistence({
      id: row.id,
      email: row.email,
      roles: row.roles || [], // Handle potential null if schema differs slightly
      status: row.status,
      createdAt: row.created_at,
    });
  }
}

interface UserRow {
  id: string;
  email: string;
  roles: string[] | null;
  status: string;
  created_at: Date;
}
