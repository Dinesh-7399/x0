// src/domain/repositories/IGymCapacityRepository.ts

import type { GymCapacity } from "../entities/GymCapacity.js";

export interface IGymCapacityRepository {
  // This might be implemented with Redis for speed
  getCapacity(gymId: string): Promise<GymCapacity | null>;
  saveCapacity(capacity: GymCapacity): Promise<void>;

  incrementOccupancy(gymId: string, maxCapacity: number): Promise<number>;
  decrementOccupancy(gymId: string): Promise<number>;

  resetOccupancy(gymId: string, count: number): Promise<void>;
}
