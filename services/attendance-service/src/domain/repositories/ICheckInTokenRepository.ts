// src/domain/repositories/ICheckInTokenRepository.ts

import type { CheckInToken } from "../entities/CheckInToken.js";

export interface ICheckInTokenRepository {
  save(token: CheckInToken): Promise<void>;
  findByValue(tokenValue: string): Promise<CheckInToken | null>;
  update(token: CheckInToken): Promise<void>;
  invalidateMemberTokens(memberId: string): Promise<void>;
  deleteExpiredBefore(date: Date): Promise<number>;
}
