// src/infrastructure/database/PostgresCheckInTokenRepository.ts

import { queryOne, execute } from "./postgres.js";
import type { ICheckInTokenRepository } from "../../domain/repositories/ICheckInTokenRepository.js";
import { CheckInToken, type CheckInTokenProps } from "../../domain/entities/CheckInToken.js";

interface TokenRow {
  id: string;
  member_id: string;
  gym_id: string;
  token_value: string;
  token_type: string;
  expires_at: Date;
  used_at: Date | null;
  is_valid: boolean;
  created_at: Date;
}

export class PostgresCheckInTokenRepository implements ICheckInTokenRepository {
  async save(token: CheckInToken): Promise<void> {
    const sql = `
      INSERT INTO checkin_tokens (
        id, member_id, gym_id, token_value, token_type,
        expires_at, used_at, is_valid, created_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
    `;

    await execute(sql, [
      token.props.id,
      token.props.memberId,
      token.props.gymId,
      token.tokenValue,
      token.props.tokenType,
      token.props.expiresAt,
      token.props.usedAt,
      token.props.isValid,
      token.props.createdAt,
    ]);
  }

  async findByValue(tokenValue: string): Promise<CheckInToken | null> {
    const sql = `SELECT * FROM checkin_tokens WHERE token_value = $1`;
    const row = await queryOne<TokenRow>(sql, [tokenValue]);
    return row ? this.toDomain(row) : null;
  }

  async update(token: CheckInToken): Promise<void> {
    const sql = `
      UPDATE checkin_tokens SET
        used_at = $2, is_valid = $3
      WHERE id = $1
    `;
    await execute(sql, [
      token.props.id,
      token.props.usedAt,
      token.props.isValid,
    ]);
  }

  async invalidateMemberTokens(memberId: string): Promise<void> {
    await execute(
      `UPDATE checkin_tokens SET is_valid = false WHERE member_id = $1 AND is_valid = true`,
      [memberId],
    );
  }

  async deleteExpiredBefore(date: Date): Promise<number> {
    return execute(
      `DELETE FROM checkin_tokens WHERE expires_at < $1`,
      [date],
    );
  }

  private toDomain(row: TokenRow): CheckInToken {
    const props: CheckInTokenProps = {
      id: row.id,
      memberId: row.member_id,
      gymId: row.gym_id,
      tokenValue: row.token_value,
      tokenType: row.token_type as "qr_code" | "nfc",
      expiresAt: row.expires_at,
      usedAt: row.used_at,
      isValid: row.is_valid,
      createdAt: row.created_at,
    };
    return CheckInToken.fromPersistence(props);
  }
}
