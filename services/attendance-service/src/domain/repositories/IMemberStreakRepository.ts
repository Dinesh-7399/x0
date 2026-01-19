// src/domain/repositories/IMemberStreakRepository.ts

import type { MemberStreak } from "../entities/MemberStreak.js";

export interface IMemberStreakRepository {
  save(streak: MemberStreak): Promise<void>;
  findByMemberId(memberId: string): Promise<MemberStreak | null>;
  update(streak: MemberStreak): Promise<void>;
}
