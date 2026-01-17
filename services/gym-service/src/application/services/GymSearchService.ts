// src/application/services/GymSearchService.ts

import type { IGymRepository, SearchGymsParams } from '../../domain/repositories/IGymRepository.js';
import type { Gym } from '../../domain/entities/Gym.js';
import type { SearchGymsDto } from '../dtos/gym.dtos.js';

export class GymSearchService {
  constructor(private readonly gymRepo: IGymRepository) { }

  async search(dto: SearchGymsDto): Promise<{ gyms: Gym[]; total?: number }> {
    const limit = Math.min(dto.limit || 20, 100);
    const page = dto.page || 1;
    const offset = (page - 1) * limit;

    const params: SearchGymsParams = {
      city: dto.city,
      type: dto.type,
      query: dto.query,
      verified: dto.verified,
      limit,
      offset,
    };

    const gyms = await this.gymRepo.search(params);

    return { gyms };
  }

  async getBySlug(slug: string): Promise<Gym | null> {
    return this.gymRepo.findBySlug(slug);
  }

  async getPopularCities(): Promise<string[]> {
    // For now, return static list. Can be enhanced with actual data
    return ['Mumbai', 'Delhi', 'Bangalore', 'Hyderabad', 'Chennai', 'Pune', 'Kolkata'];
  }
}
