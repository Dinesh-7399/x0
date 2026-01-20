// src/infrastructure/database/PostgresMemberStreakRepository.ts

import { queryOne, execute } from "./postgres.js";
import type { IMemberStreakRepository } from "../../domain/repositories/IMemberStreakRepository.js";
import { MemberStreak, type MemberStreakProps, StreakType } from "../../domain/entities/MemberStreak.js";

interface StreakRow {
  id: string;
  member_id: string;
  gym_id: string | null;
  current_streak: number;
  streak_type: string;
  last_visit_date: Date;
  streak_start_date: Date;
  longest_streak: number;
  longest_streak_start_date: Date;
  longest_streak_end_date: Date;
  freeze_days_remaining: number;
  freeze_used_this_month: number;
  created_at: Date;
  updated_at: Date;
}

export class PostgresMemberStreakRepository implements IMemberStreakRepository {
  async save(streak: MemberStreak): Promise<void> {
    const sql = `
      INSERT INTO member_streaks (
        id, member_id, gym_id, current_streak, streak_type,
        last_visit_date, streak_start_date,
        longest_streak, longest_streak_start_date, longest_streak_end_date,
        freeze_days_remaining, freeze_used_this_month,
        created_at, updated_at
      ) VALUES (
        $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14
      )
      ON CONFLICT (member_id) DO UPDATE SET
        current_streak = EXCLUDED.current_streak,
        last_visit_date = EXCLUDED.last_visit_date,
        streak_start_date = EXCLUDED.streak_start_date,
        longest_streak = EXCLUDED.longest_streak,
        longest_streak_start_date = EXCLUDED.longest_streak_start_date,
        longest_streak_end_date = EXCLUDED.longest_streak_end_date,
        freeze_days_remaining = EXCLUDED.freeze_days_remaining,
        freeze_used_this_month = EXCLUDED.freeze_used_this_month,
        updated_at = EXCLUDED.updated_at
    `;

    await execute(sql, [
      streak.props.id,
      streak.props.memberId,
      streak.props.gymId,
      streak.props.currentStreak,
      streak.props.streakType,
      streak.props.lastVisitDate,
      streak.props.streakStartDate,
      streak.props.longestStreak,
      streak.props.longestStreakStartDate,
      streak.props.longestStreakEndDate,
      streak.props.freezeDaysRemaining,
      streak.props.freezeUsedThisMonth,
      streak.props.createdAt,
      streak.props.updatedAt,
    ]);
  }

  async findByMemberId(memberId: string): Promise<MemberStreak | null> {
    const sql = `SELECT * FROM member_streaks WHERE member_id = $1`;
    const row = await queryOne<StreakRow>(sql, [memberId]);
    return row ? this.toDomain(row) : null;
  }

  async update(streak: MemberStreak): Promise<void> {
    const sql = `
      UPDATE member_streaks SET
        current_streak = $2, last_visit_date = $3, streak_start_date = $4,
        longest_streak = $5, longest_streak_start_date = $6, longest_streak_end_date = $7,
        freeze_days_remaining = $8, freeze_used_this_month = $9, updated_at = $10
      WHERE id = $1
    `;

    await execute(sql, [
      streak.props.id,
      streak.props.currentStreak,
      streak.props.lastVisitDate,
      streak.props.streakStartDate,
      streak.props.longestStreak,
      streak.props.longestStreakStartDate,
      streak.props.longestStreakEndDate,
      streak.props.freezeDaysRemaining,
      streak.props.freezeUsedThisMonth,
      streak.props.updatedAt,
    ]);
  }

  private toDomain(row: StreakRow): MemberStreak {
    const props: MemberStreakProps = {
      id: row.id,
      memberId: row.member_id,
      gymId: row.gym_id,
      currentStreak: row.current_streak,
      streakType: row.streak_type as StreakType,
      lastVisitDate: row.last_visit_date,
      streakStartDate: row.streak_start_date,
      longestStreak: row.longest_streak,
      longestStreakStartDate: row.longest_streak_start_date,
      longestStreakEndDate: row.longest_streak_end_date,
      freezeDaysRemaining: row.freeze_days_remaining,
      freezeUsedThisMonth: row.freeze_used_this_month,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };

    return MemberStreak.fromPersistence(props);
  }
}
