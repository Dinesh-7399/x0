// src/infrastructure/repositories/PgProfileRepository.ts

import { getDb } from '../database/postgres.js';
import { Profile, ProfileProps } from '../../domain/entities/Profile.js';
import type { IProfileRepository } from '../../domain/repositories/IProfileRepository.js';

export class PgProfileRepository implements IProfileRepository {
  async findById(id: string): Promise<Profile | null> {
    const db = getDb();
    const rows = await db<ProfileRow[]>`SELECT * FROM profiles WHERE id = ${id}`;
    if (rows.length === 0) return null;
    return this.toDomain(rows[0]);
  }

  async findByUserId(userId: string): Promise<Profile | null> {
    const db = getDb();
    const rows = await db<ProfileRow[]>`SELECT * FROM profiles WHERE user_id = ${userId}`;
    if (rows.length === 0) return null;
    return this.toDomain(rows[0]);
  }

  async save(profile: Profile): Promise<void> {
    const db = getDb();
    const props = profile.toPersistence();
    await db`
      INSERT INTO profiles (
        id, user_id, first_name, last_name, bio, avatar_url, phone_number, location, created_at, updated_at
      ) VALUES (
        ${props.id}, ${props.userId}, ${props.firstName}, ${props.lastName}, 
        ${props.bio || null}, ${props.avatarUrl || null}, ${props.phoneNumber || null}, ${props.location || null},
        ${props.createdAt}, ${props.updatedAt}
      )
    `;
  }

  async update(profile: Profile): Promise<void> {
    const db = getDb();
    const props = profile.toPersistence();
    await db`
      UPDATE profiles SET
        first_name = ${props.firstName},
        last_name = ${props.lastName},
        bio = ${props.bio || null},
        avatar_url = ${props.avatarUrl || null},
        phone_number = ${props.phoneNumber || null},
        location = ${props.location || null},
        updated_at = ${props.updatedAt}
      WHERE id = ${props.id}
    `;
  }

  async delete(id: string): Promise<void> {
    const db = getDb();
    await db`DELETE FROM profiles WHERE id = ${id}`;
  }

  private toDomain(row: ProfileRow): Profile {
    return Profile.fromPersistence({
      id: row.id,
      userId: row.user_id,
      firstName: row.first_name,
      lastName: row.last_name,
      bio: row.bio || undefined,
      avatarUrl: row.avatar_url || undefined,
      phoneNumber: row.phone_number || undefined,
      location: row.location || undefined,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    });
  }
}

interface ProfileRow {
  id: string;
  user_id: string;
  first_name: string;
  last_name: string;
  bio: string | null;
  avatar_url: string | null;
  phone_number: string | null;
  location: string | null;
  created_at: Date;
  updated_at: Date;
}
