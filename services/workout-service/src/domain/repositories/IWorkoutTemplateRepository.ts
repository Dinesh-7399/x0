// src/domain/repositories/IWorkoutTemplateRepository.ts

import type { Visibility, WorkoutTemplate } from '../entities/WorkoutTemplate.js';

export interface TemplateSearchOptions {
  query?: string;
  visibility?: Visibility;
  createdBy?: string;
  gymId?: string;
  difficulty?: string;
  tags?: string[];
  minRating?: number;
  limit: number;
  offset: number;
  orderBy?: 'created_at' | 'usage_count' | 'rating';
  orderDir?: 'asc' | 'desc';
}

export interface TemplateListResult {
  templates: WorkoutTemplate[];
  total: number;
  hasMore: boolean;
}

export interface IWorkoutTemplateRepository {
  // CRUD
  save(template: WorkoutTemplate): Promise<void>;
  findById(id: string): Promise<WorkoutTemplate | null>;
  findByIds(ids: string[]): Promise<WorkoutTemplate[]>;
  update(template: WorkoutTemplate): Promise<void>;
  delete(id: string): Promise<void>;

  // Search and list
  search(options: TemplateSearchOptions): Promise<TemplateListResult>;
  findByCreator(userId: string, limit: number, offset: number): Promise<TemplateListResult>;
  findPublic(limit: number, offset: number): Promise<TemplateListResult>;
  findByGym(gymId: string, limit: number, offset: number): Promise<TemplateListResult>;
  findFeatured(limit: number): Promise<WorkoutTemplate[]>;

  // Counts
  countByCreator(userId: string): Promise<number>;

  // Check existence
  exists(id: string): Promise<boolean>;
}
