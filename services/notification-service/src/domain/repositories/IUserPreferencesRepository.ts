// src/domain/repositories/IUserPreferencesRepository.ts

import type { UserPreferences } from "../entities/UserPreferences.js";

export interface IUserPreferencesRepository {
  save(preferences: UserPreferences): Promise<void>;
  findById(id: string): Promise<UserPreferences | null>;
  findByUserId(userId: string): Promise<UserPreferences | null>;
  update(preferences: UserPreferences): Promise<void>;
  upsert(preferences: UserPreferences): Promise<void>;
}
