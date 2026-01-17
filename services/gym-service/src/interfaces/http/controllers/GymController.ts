// src/interfaces/http/controllers/GymController.ts

import type { Context } from 'hono';
import type { GymService } from '../../../application/services/GymService.js';
import type { GymSearchService } from '../../../application/services/GymSearchService.js';
import { toGymResponse } from '../../../application/dtos/gym.dtos.js';
import {
  CreateGymSchema,
  UpdateGymSchema,
  SearchGymsSchema,
  AddStaffSchema,
  AddEquipmentSchema,
  UpdateEquipmentSchema,
} from '../validation/gym.schemas.js';

export class GymController {
  constructor(
    private readonly gymService: GymService,
    private readonly searchService: GymSearchService,
  ) { }

  // ============ PUBLIC ENDPOINTS ============

  async search(c: Context): Promise<Response> {
    const query = SearchGymsSchema.parse(c.req.query());
    const { gyms } = await this.searchService.search(query);

    return c.json({
      gyms: gyms.map(toGymResponse),
      page: query.page,
      limit: query.limit,
    });
  }

  async getBySlug(c: Context): Promise<Response> {
    const slug = c.req.param('slug');
    const gym = await this.gymService.getGymBySlug(slug);
    return c.json(toGymResponse(gym));
  }

  async getFacilities(c: Context): Promise<Response> {
    const gymId = c.req.param('gymId');
    const gym = await this.gymService.getGymById(gymId);
    return c.json({ facilities: gym.facilities });
  }

  async getHours(c: Context): Promise<Response> {
    const gymId = c.req.param('gymId');
    const gym = await this.gymService.getGymById(gymId);
    return c.json({ operatingHours: gym.operatingHours });
  }

  // ============ AUTHENTICATED ENDPOINTS ============

  async create(c: Context): Promise<Response> {
    const userId = this.getUserId(c);
    const body = CreateGymSchema.parse(await c.req.json());

    const gym = await this.gymService.createGym(userId, body);
    return c.json(toGymResponse(gym), 201);
  }

  async getMyGyms(c: Context): Promise<Response> {
    const userId = this.getUserId(c);
    const gyms = await this.gymService.getMyGyms(userId);
    return c.json({ gyms: gyms.map(toGymResponse) });
  }

  async getById(c: Context): Promise<Response> {
    const gymId = c.req.param('gymId');
    const gym = await this.gymService.getGymById(gymId);
    return c.json(toGymResponse(gym));
  }

  async update(c: Context): Promise<Response> {
    const gymId = c.req.param('gymId');
    const userId = this.getUserId(c);
    const body = UpdateGymSchema.parse(await c.req.json());

    const gym = await this.gymService.updateGym(gymId, userId, body);
    return c.json(toGymResponse(gym));
  }

  async updateStatus(c: Context): Promise<Response> {
    const gymId = c.req.param('gymId');
    const userId = this.getUserId(c);
    const { status } = await c.req.json();

    const allowedStatuses = ['draft', 'pending_verification', 'under_review', 'approved', 'rejected', 'corrections_needed', 'suspended'];
    if (!status || !allowedStatuses.includes(status)) {
      return c.json({ error: `Invalid status. Allowed values: ${allowedStatuses.join(', ')}` }, 400);
    }

    const gym = await this.gymService.updateGymStatus(gymId, userId, status);
    return c.json(toGymResponse(gym));
  }

  async delete(c: Context): Promise<Response> {
    const gymId = c.req.param('gymId');
    const userId = this.getUserId(c);

    await this.gymService.deleteGym(gymId, userId);
    return c.json({ message: 'Gym deleted successfully' });
  }

  // ============ STAFF ============

  async getStaff(c: Context): Promise<Response> {
    const gymId = c.req.param('gymId');
    const staff = await this.gymService.getStaff(gymId);
    return c.json({ staff });
  }

  async addStaff(c: Context): Promise<Response> {
    const gymId = c.req.param('gymId');
    const userId = this.getUserId(c);
    const body = AddStaffSchema.parse(await c.req.json());

    const ownership = await this.gymService.addStaff(gymId, userId, body);
    return c.json(ownership, 201);
  }

  async updateStaff(c: Context): Promise<Response> {
    const gymId = c.req.param('gymId');
    const staffUserId = c.req.param('userId');
    const ownerId = this.getUserId(c);

    // Reuse AddStaffSchema but without userId since it's in path
    const schema = AddStaffSchema.omit({ userId: true });
    const { role, permissions } = schema.parse(await c.req.json());

    const ownership = await this.gymService.updateStaff(gymId, ownerId, staffUserId, role, permissions);
    return c.json(ownership);
  }

  async removeStaff(c: Context): Promise<Response> {
    const gymId = c.req.param('gymId');
    const staffUserId = c.req.param('userId');
    const ownerId = this.getUserId(c);

    await this.gymService.removeStaff(gymId, ownerId, staffUserId);
    return c.json({ message: 'Staff removed successfully' });
  }

  // ============ EQUIPMENT ============

  async getEquipment(c: Context): Promise<Response> {
    const gymId = c.req.param('gymId');
    const equipment = await this.gymService.getEquipment(gymId);
    return c.json({ equipment });
  }

  async addEquipment(c: Context): Promise<Response> {
    const gymId = c.req.param('gymId');
    const userId = this.getUserId(c);
    const body = AddEquipmentSchema.parse(await c.req.json());

    const equipment = await this.gymService.addEquipment(gymId, userId, body);
    return c.json(equipment, 201);
  }

  async updateEquipment(c: Context): Promise<Response> {
    const gymId = c.req.param('gymId');
    const equipmentId = c.req.param('equipmentId');
    const userId = this.getUserId(c);
    const body = UpdateEquipmentSchema.parse(await c.req.json());

    const equipment = await this.gymService.updateEquipment(gymId, userId, equipmentId, body);
    return c.json(equipment);
  }

  async removeEquipment(c: Context): Promise<Response> {
    const gymId = c.req.param('gymId');
    const equipmentId = c.req.param('equipmentId');
    const userId = this.getUserId(c);

    await this.gymService.removeEquipment(gymId, userId, equipmentId);
    return c.json({ message: 'Equipment removed successfully' });
  }

  // ============ HELPERS ============

  private getUserId(c: Context): string {
    // Get from X-User-ID header set by API gateway
    const userId = c.req.header('x-user-id');
    if (!userId) {
      throw new Error('User ID not found in request headers');
    }
    return userId;
  }
}
