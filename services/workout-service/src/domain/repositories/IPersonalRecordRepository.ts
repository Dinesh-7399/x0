// src/domain/repositories/IPersonalRecordRepository.ts

import type { PersonalRecord, RecordType } from '../entities/PersonalRecord.js';

export interface PRSearchOptions {
  userId: string;
  exerciseId?: string;
  recordType?: RecordType;
  limit: number;
  offset: number;
}

export interface PRListResult {
  records: PersonalRecord[];
  total: number;
  hasMore: boolean;
}

export interface IPersonalRecordRepository {
  // CRUD
  save(record: PersonalRecord): Promise<void>;
  findById(id: string): Promise<PersonalRecord | null>;

  // User PRs
  findByUser(options: PRSearchOptions): Promise<PRListResult>;
  findByUserAndExercise(userId: string, exerciseId: string): Promise<PersonalRecord[]>;

  // Get current record for comparison
  findCurrentRecord(
    userId: string,
    exerciseId: string,
    recordType: RecordType,
  ): Promise<PersonalRecord | null>;

  // Latest PRs
  findRecentByUser(userId: string, limit: number): Promise<PersonalRecord[]>;

  // Stats
  countByUser(userId: string): Promise<number>;
  countByUserThisMonth(userId: string): Promise<number>;
}
