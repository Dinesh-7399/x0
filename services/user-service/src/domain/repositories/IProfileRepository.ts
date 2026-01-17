// src/domain/repositories/IProfileRepository.ts

import { Profile } from '../entities/Profile.js';

export interface IProfileRepository {
  findById(id: string): Promise<Profile | null>;
  findByUserId(userId: string): Promise<Profile | null>;
  save(profile: Profile): Promise<void>;
  update(profile: Profile): Promise<void>;
  delete(id: string): Promise<void>;
}
