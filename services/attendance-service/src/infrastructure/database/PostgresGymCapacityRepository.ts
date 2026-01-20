// src/infrastructure/database/PostgresGymCapacityRepository.ts

import { queryOne, execute } from "./postgres.js";
import type { IGymCapacityRepository } from "../../domain/repositories/IGymCapacityRepository.js";
import { GymCapacity, type GymCapacityProps } from "../../domain/entities/GymCapacity.js";

interface CapacityRow {
  gym_id: string;
  max_capacity: number;
  soft_limit: number;
  current_occupancy: number;
  last_updated_at: Date;
  is_open: boolean;
  is_full: boolean;
}

export class PostgresGymCapacityRepository implements IGymCapacityRepository {
  async getCapacity(gymId: string): Promise<GymCapacity | null> {
    const sql = `SELECT * FROM gym_capacity WHERE gym_id = $1`;
    const row = await queryOne<CapacityRow>(sql, [gymId]);
    return row ? this.toDomain(row) : null;
  }

  async saveCapacity(capacity: GymCapacity): Promise<void> {
    const sql = `
      INSERT INTO gym_capacity (
        gym_id, max_capacity, soft_limit, current_occupancy,
        last_updated_at, is_open, is_full
      ) VALUES ($1, $2, $3, $4, $5, $6, $7)
      ON CONFLICT (gym_id) DO UPDATE SET
        max_capacity = EXCLUDED.max_capacity,
        soft_limit = EXCLUDED.soft_limit,
        current_occupancy = EXCLUDED.current_occupancy,
        last_updated_at = EXCLUDED.last_updated_at,
        is_open = EXCLUDED.is_open,
        is_full = EXCLUDED.is_full
    `;

    await execute(sql, [
      capacity.props.gymId,
      capacity.props.maxCapacity,
      capacity.props.softLimit,
      capacity.props.currentOccupancy,
      capacity.props.lastUpdatedAt,
      capacity.props.isOpen,
      capacity.props.isFull,
    ]);
  }

  async incrementOccupancy(gymId: string, maxCapacity: number): Promise<number> {
    const sql = `
      UPDATE gym_capacity 
      SET 
        current_occupancy = current_occupancy + 1,
        last_updated_at = NOW(),
        is_full = (current_occupancy + 1 >= max_capacity)
      WHERE gym_id = $1
      RETURNING current_occupancy
    `;
    // Note: We blindly increment. In a real Redis impl, we'd check max first atomically.
    // The application service did a check, but race conditions exist.
    // This SQL handles the update atomically.
    const result = await queryOne<{ current_occupancy: number }>(sql, [gymId]);

    // If no row exists, we should probably initialize it, but for now assuming gym logic handles init
    return result?.current_occupancy || 0;
  }

  async decrementOccupancy(gymId: string): Promise<number> {
    const sql = `
      UPDATE gym_capacity 
      SET 
        current_occupancy = GREATEST(0, current_occupancy - 1),
        last_updated_at = NOW(),
        is_full = (GREATEST(0, current_occupancy - 1) >= max_capacity)
      WHERE gym_id = $1
      RETURNING current_occupancy
    `;
    const result = await queryOne<{ current_occupancy: number }>(sql, [gymId]);
    return result?.current_occupancy || 0;
  }

  async resetOccupancy(gymId: string, count: number): Promise<void> {
    await execute(
      `UPDATE gym_capacity SET current_occupancy = $2, last_updated_at = NOW() WHERE gym_id = $1`,
      [gymId, count],
    );
  }

  private toDomain(row: CapacityRow): GymCapacity {
    const props: GymCapacityProps = {
      gymId: row.gym_id,
      maxCapacity: row.max_capacity,
      softLimit: row.soft_limit,
      currentOccupancy: row.current_occupancy,
      lastUpdatedAt: row.last_updated_at,
      isOpen: row.is_open,
      isFull: row.is_full,
    };
    return GymCapacity.fromPersistence(props);
  }
}
