// src/infrastructure/database/PostgresDeviceTokenRepository.ts

import { query, queryOne, execute } from "./postgres.js";
import type { IDeviceTokenRepository } from "../../domain/repositories/IDeviceTokenRepository.js";
import { DeviceToken, type DeviceTokenProps } from "../../domain/entities/DeviceToken.js";

interface DeviceTokenRow {
  id: string;
  user_id: string;
  token: string;
  platform: string;
  device_id: string;
  app_version: string;
  is_active: boolean;
  last_used_at: Date;
  created_at: Date;
  updated_at: Date;
}

export class PostgresDeviceTokenRepository implements IDeviceTokenRepository {
  async save(token: DeviceToken): Promise<void> {
    const sql = `
      INSERT INTO device_tokens (
        id, user_id, token, platform, device_id, app_version,
        is_active, last_used_at, created_at, updated_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
      ON CONFLICT (device_id) DO UPDATE SET
        token = EXCLUDED.token,
        user_id = EXCLUDED.user_id,
        app_version = EXCLUDED.app_version,
        is_active = EXCLUDED.is_active,
        last_used_at = EXCLUDED.last_used_at,
        updated_at = EXCLUDED.updated_at
    `;

    await execute(sql, [
      token.id,
      token.userId,
      token.token,
      token.platform,
      token.deviceId,
      token.appVersion,
      token.isActive,
      token.lastUsedAt,
      token.createdAt,
      token.updatedAt,
    ]);
  }

  async findById(id: string): Promise<DeviceToken | null> {
    const sql = `SELECT * FROM device_tokens WHERE id = $1`;
    const row = await queryOne<DeviceTokenRow>(sql, [id]);
    return row ? this.toDomain(row) : null;
  }

  async findByToken(token: string): Promise<DeviceToken | null> {
    const sql = `SELECT * FROM device_tokens WHERE token = $1 AND is_active = true`;
    const row = await queryOne<DeviceTokenRow>(sql, [token]);
    return row ? this.toDomain(row) : null;
  }

  async findByUserId(userId: string): Promise<DeviceToken[]> {
    const sql = `
      SELECT * FROM device_tokens
      WHERE user_id = $1 AND is_active = true
      ORDER BY last_used_at DESC
    `;
    const rows = await query<DeviceTokenRow>(sql, [userId]);
    return rows.map((row) => this.toDomain(row));
  }

  async findByDeviceId(deviceId: string): Promise<DeviceToken | null> {
    const sql = `SELECT * FROM device_tokens WHERE device_id = $1`;
    const row = await queryOne<DeviceTokenRow>(sql, [deviceId]);
    return row ? this.toDomain(row) : null;
  }

  async update(token: DeviceToken): Promise<void> {
    const sql = `
      UPDATE device_tokens SET
        token = $2, is_active = $3, last_used_at = $4, updated_at = $5
      WHERE id = $1
    `;

    await execute(sql, [
      token.id,
      token.token,
      token.isActive,
      token.lastUsedAt,
      token.updatedAt,
    ]);
  }

  async delete(id: string): Promise<void> {
    await execute(`DELETE FROM device_tokens WHERE id = $1`, [id]);
  }

  async deactivateAllForUser(userId: string): Promise<void> {
    await execute(
      `UPDATE device_tokens SET is_active = false, updated_at = NOW() WHERE user_id = $1`,
      [userId],
    );
  }

  async deleteInactiveOlderThan(date: Date): Promise<number> {
    return execute(
      `DELETE FROM device_tokens WHERE is_active = false AND updated_at < $1`,
      [date],
    );
  }

  private toDomain(row: DeviceTokenRow): DeviceToken {
    const props: DeviceTokenProps = {
      id: row.id,
      userId: row.user_id,
      token: row.token,
      platform: row.platform as "ios" | "android" | "web",
      deviceId: row.device_id,
      appVersion: row.app_version,
      isActive: row.is_active,
      lastUsedAt: row.last_used_at,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };

    return DeviceToken.fromPersistence(props);
  }
}
