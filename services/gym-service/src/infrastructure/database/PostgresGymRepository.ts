// src/infrastructure/database/PostgresGymRepository.ts

import { query, queryOne } from './postgres.js';
import type { Gym, GymOwnership, GymEquipment } from '../../domain/entities/Gym.js';
import type { IGymRepository, CreateGymData, UpdateGymData, SearchGymsParams } from '../../domain/repositories/IGymRepository.js';

export class PostgresGymRepository implements IGymRepository {

  // ============ GYM CRUD ============

  async create(data: CreateGymData): Promise<Gym> {
    const sql = `
      INSERT INTO gyms (
        slug, name, description, type, address, city, state, country, 
        postal_code, latitude, longitude, phone, email, website,
        logo_url, cover_image_url, facilities, operating_hours, owner_id
      ) VALUES (
        $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19
      ) RETURNING *
    `;

    const result = await queryOne<any>(sql, [
      data.slug,
      data.name,
      data.description || null,
      data.type || 'gym',
      data.address || null,
      data.city,
      data.state || null,
      data.country || 'India',
      data.postalCode || null,
      data.latitude || null,
      data.longitude || null,
      data.phone || null,
      data.email || null,
      data.website || null,
      data.logoUrl || null,
      data.coverImageUrl || null,
      JSON.stringify(data.facilities || []),
      data.operatingHours ? JSON.stringify(data.operatingHours) : null,
      data.ownerId,
    ]);

    return this.mapToGym(result!);
  }

  async findById(id: string): Promise<Gym | null> {
    const sql = `SELECT * FROM gyms WHERE id = $1 AND deleted_at IS NULL`;
    const result = await queryOne<any>(sql, [id]);
    return result ? this.mapToGym(result) : null;
  }

  async findBySlug(slug: string): Promise<Gym | null> {
    const sql = `SELECT * FROM gyms WHERE slug = $1 AND deleted_at IS NULL`;
    const result = await queryOne<any>(sql, [slug]);
    return result ? this.mapToGym(result) : null;
  }

  async findByOwnerId(ownerId: string): Promise<Gym[]> {
    const sql = `SELECT * FROM gyms WHERE owner_id = $1 AND deleted_at IS NULL ORDER BY created_at DESC`;
    const results = await query<any>(sql, [ownerId]);
    return results.map(r => this.mapToGym(r));
  }

  async update(id: string, data: UpdateGymData): Promise<Gym | null> {
    const fields: string[] = [];
    const values: any[] = [];
    let paramIndex = 1;

    const fieldMap: Record<string, string> = {
      name: 'name',
      description: 'description',
      type: 'type',
      address: 'address',
      city: 'city',
      state: 'state',
      country: 'country',
      postalCode: 'postal_code',
      latitude: 'latitude',
      longitude: 'longitude',
      phone: 'phone',
      email: 'email',
      website: 'website',
      logoUrl: 'logo_url',
      coverImageUrl: 'cover_image_url',
      status: 'status',
      verified: 'verified',
    };

    for (const [key, dbField] of Object.entries(fieldMap)) {
      if (data[key as keyof UpdateGymData] !== undefined) {
        fields.push(`${dbField} = $${paramIndex}`);
        values.push(data[key as keyof UpdateGymData]);
        paramIndex++;
      }
    }

    if (data.facilities !== undefined) {
      fields.push(`facilities = $${paramIndex}`);
      values.push(JSON.stringify(data.facilities));
      paramIndex++;
    }

    if (data.operatingHours !== undefined) {
      fields.push(`operating_hours = $${paramIndex}`);
      values.push(JSON.stringify(data.operatingHours));
      paramIndex++;
    }

    if (fields.length === 0) return this.findById(id);

    fields.push(`updated_at = NOW()`);
    values.push(id);

    const sql = `UPDATE gyms SET ${fields.join(', ')} WHERE id = $${paramIndex} AND deleted_at IS NULL RETURNING *`;
    const result = await queryOne<any>(sql, values);
    return result ? this.mapToGym(result) : null;
  }

  async softDelete(id: string): Promise<boolean> {
    const sql = `UPDATE gyms SET deleted_at = NOW() WHERE id = $1 AND deleted_at IS NULL`;
    const result = await query(sql, [id]);
    return true;
  }

  // ============ SEARCH ============

  async search(params: SearchGymsParams): Promise<Gym[]> {
    const conditions: string[] = ['deleted_at IS NULL', "status = 'active'"];
    const values: any[] = [];
    let paramIndex = 1;

    if (params.city) {
      conditions.push(`LOWER(city) LIKE $${paramIndex}`);
      values.push(`%${params.city.toLowerCase()}%`);
      paramIndex++;
    }

    if (params.type) {
      conditions.push(`type = $${paramIndex}`);
      values.push(params.type);
      paramIndex++;
    }

    if (params.query) {
      conditions.push(`(LOWER(name) LIKE $${paramIndex} OR LOWER(description) LIKE $${paramIndex})`);
      values.push(`%${params.query.toLowerCase()}%`);
      paramIndex++;
    }

    if (params.verified !== undefined) {
      conditions.push(`verified = $${paramIndex}`);
      values.push(params.verified);
      paramIndex++;
    }

    const limit = params.limit || 20;
    const offset = params.offset || 0;

    const sql = `
      SELECT * FROM gyms 
      WHERE ${conditions.join(' AND ')}
      ORDER BY verified DESC, created_at DESC
      LIMIT ${limit} OFFSET ${offset}
    `;

    const results = await query<any>(sql, values);
    return results.map(r => this.mapToGym(r));
  }

  // ============ OWNERSHIP ============

  async addOwnership(gymId: string, userId: string, role: string, permissions: string[] = []): Promise<GymOwnership> {
    const sql = `
      INSERT INTO gym_ownership (gym_id, user_id, role, permissions)
      VALUES ($1, $2, $3, $4)
      ON CONFLICT (gym_id, user_id) DO UPDATE SET role = $3, permissions = $4
      RETURNING *
    `;
    const result = await queryOne<any>(sql, [gymId, userId, role, permissions]);
    return this.mapToOwnership(result!);
  }

  async findOwnership(gymId: string, userId: string): Promise<GymOwnership | null> {
    const sql = `SELECT * FROM gym_ownership WHERE gym_id = $1 AND user_id = $2`;
    const result = await queryOne<any>(sql, [gymId, userId]);
    return result ? this.mapToOwnership(result) : null;
  }

  async findOwnershipsByGym(gymId: string): Promise<GymOwnership[]> {
    const sql = `SELECT * FROM gym_ownership WHERE gym_id = $1 ORDER BY role, created_at`;
    const results = await query<any>(sql, [gymId]);
    return results.map(r => this.mapToOwnership(r));
  }

  async updateOwnership(gymId: string, userId: string, role: string, permissions?: string[]): Promise<GymOwnership | null> {
    const sql = permissions
      ? `UPDATE gym_ownership SET role = $3, permissions = $4 WHERE gym_id = $1 AND user_id = $2 RETURNING *`
      : `UPDATE gym_ownership SET role = $3 WHERE gym_id = $1 AND user_id = $2 RETURNING *`;
    const params = permissions ? [gymId, userId, role, permissions] : [gymId, userId, role];
    const result = await queryOne<any>(sql, params);
    return result ? this.mapToOwnership(result) : null;
  }

  async removeOwnership(gymId: string, userId: string): Promise<boolean> {
    const sql = `DELETE FROM gym_ownership WHERE gym_id = $1 AND user_id = $2`;
    await query(sql, [gymId, userId]);
    return true;
  }

  // ============ EQUIPMENT ============

  async addEquipment(gymId: string, data: Omit<GymEquipment, 'id' | 'gymId'>): Promise<GymEquipment> {
    const sql = `
      INSERT INTO gym_equipment (gym_id, name, category, brand, quantity, condition)
      VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING *
    `;
    const result = await queryOne<any>(sql, [
      gymId, data.name, data.category || null, data.brand || null,
      data.quantity || 1, data.condition || 'good'
    ]);
    return this.mapToEquipment(result!);
  }

  async findEquipmentByGym(gymId: string): Promise<GymEquipment[]> {
    const sql = `SELECT * FROM gym_equipment WHERE gym_id = $1 ORDER BY category, name`;
    const results = await query<any>(sql, [gymId]);
    return results.map(r => this.mapToEquipment(r));
  }

  async updateEquipment(id: string, data: Partial<GymEquipment>): Promise<GymEquipment | null> {
    const fields: string[] = [];
    const values: any[] = [];
    let paramIndex = 1;

    if (data.name !== undefined) { fields.push(`name = $${paramIndex++}`); values.push(data.name); }
    if (data.category !== undefined) { fields.push(`category = $${paramIndex++}`); values.push(data.category); }
    if (data.brand !== undefined) { fields.push(`brand = $${paramIndex++}`); values.push(data.brand); }
    if (data.quantity !== undefined) { fields.push(`quantity = $${paramIndex++}`); values.push(data.quantity); }
    if (data.condition !== undefined) { fields.push(`condition = $${paramIndex++}`); values.push(data.condition); }

    if (fields.length === 0) return null;

    values.push(id);
    const sql = `UPDATE gym_equipment SET ${fields.join(', ')} WHERE id = $${paramIndex} RETURNING *`;
    const result = await queryOne<any>(sql, values);
    return result ? this.mapToEquipment(result) : null;
  }

  async removeEquipment(id: string): Promise<boolean> {
    await query(`DELETE FROM gym_equipment WHERE id = $1`, [id]);
    return true;
  }

  // ============ MAPPERS ============

  private mapToGym(row: any): Gym {
    return {
      id: row.id,
      slug: row.slug,
      name: row.name,
      description: row.description,
      type: row.type,
      address: row.address,
      city: row.city,
      state: row.state,
      country: row.country,
      postalCode: row.postal_code,
      latitude: row.latitude ? parseFloat(row.latitude) : undefined,
      longitude: row.longitude ? parseFloat(row.longitude) : undefined,
      phone: row.phone,
      email: row.email,
      website: row.website,
      logoUrl: row.logo_url,
      coverImageUrl: row.cover_image_url,
      facilities: typeof row.facilities === 'string' ? JSON.parse(row.facilities) : (row.facilities || []),
      operatingHours: row.operating_hours ? (typeof row.operating_hours === 'string' ? JSON.parse(row.operating_hours) : row.operating_hours) : undefined,
      status: row.status,
      verified: row.verified,
      ownerId: row.owner_id,
      createdAt: new Date(row.created_at),
      updatedAt: new Date(row.updated_at),
      deletedAt: row.deleted_at ? new Date(row.deleted_at) : undefined,
    };
  }

  private mapToOwnership(row: any): GymOwnership {
    return {
      id: row.id,
      gymId: row.gym_id,
      userId: row.user_id,
      role: row.role,
      permissions: row.permissions || [],
      createdAt: new Date(row.created_at),
    };
  }

  private mapToEquipment(row: any): GymEquipment {
    return {
      id: row.id,
      gymId: row.gym_id,
      name: row.name,
      category: row.category,
      brand: row.brand,
      quantity: row.quantity,
      condition: row.condition,
    };
  }
}
