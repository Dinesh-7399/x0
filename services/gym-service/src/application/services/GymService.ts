// src/application/services/GymService.ts

import type { IGymRepository } from '../../domain/repositories/IGymRepository.js';
import type { Gym, GymOwnership, GymEquipment } from '../../domain/entities/Gym.js';
import type { CreateGymDto, UpdateGymDto, AddStaffDto, AddEquipmentDto } from '../dtos/gym.dtos.js';
import { GymNotFoundError, GymSlugTakenError, UnauthorizedError, ValidationError } from '../errors/GymErrors.js';
import { publish } from '../../infrastructure/messaging/publisher.js';
import { GymEventTypes } from '../../domain/events/GymEvents.js';

export class GymService {
  constructor(private readonly gymRepo: IGymRepository) { }

  // ============ GYM CRUD ============

  async createGym(ownerId: string, dto: CreateGymDto): Promise<Gym> {
    // Generate slug from name
    const slug = this.generateSlug(dto.name);

    // Check if slug is taken
    const existing = await this.gymRepo.findBySlug(slug);
    if (existing) {
      throw new GymSlugTakenError(slug);
    }

    // Create gym
    const gym = await this.gymRepo.create({
      slug,
      name: dto.name,
      description: dto.description,
      type: dto.type || 'gym',
      address: dto.address,
      city: dto.city,
      state: dto.state,
      country: dto.country || 'India',
      postalCode: dto.postalCode,
      latitude: dto.latitude,
      longitude: dto.longitude,
      phone: dto.phone,
      email: dto.email,
      website: dto.website,
      logoUrl: dto.logoUrl,
      coverImageUrl: dto.coverImageUrl,
      facilities: dto.facilities,
      operatingHours: dto.operatingHours,
      ownerId,
    });

    // Add owner to ownership table
    await this.gymRepo.addOwnership(gym.id, ownerId, 'owner', ['*']);

    // Publish event
    await publish(GymEventTypes.GYM_CREATED, {
      gymId: gym.id,
      ownerId,
      name: gym.name,
      type: gym.type,
      city: gym.city,
    });

    return gym;
  }

  async getGymById(gymId: string): Promise<Gym> {
    const gym = await this.gymRepo.findById(gymId);
    if (!gym) throw new GymNotFoundError(gymId);
    return gym;
  }

  async getGymBySlug(slug: string): Promise<Gym> {
    const gym = await this.gymRepo.findBySlug(slug);
    if (!gym) throw new GymNotFoundError(slug);
    return gym;
  }

  async getMyGyms(ownerId: string): Promise<Gym[]> {
    return this.gymRepo.findByOwnerId(ownerId);
  }

  async updateGym(gymId: string, userId: string, dto: UpdateGymDto): Promise<Gym> {
    // Check ownership
    await this.checkOwnership(gymId, userId, ['owner', 'manager']);

    const gym = await this.gymRepo.update(gymId, dto);
    if (!gym) throw new GymNotFoundError(gymId);

    // Publish event
    await publish(GymEventTypes.GYM_UPDATED, {
      gymId: gym.id,
      changes: Object.keys(dto),
    });

    return gym;
  }

  async updateGymStatus(gymId: string, userId: string, status: string): Promise<Gym> {
    await this.checkOwnership(gymId, userId, ['owner']);

    const gym = await this.gymRepo.update(gymId, { status });
    if (!gym) throw new GymNotFoundError(gymId);

    return gym;
  }

  async deleteGym(gymId: string, userId: string): Promise<void> {
    await this.checkOwnership(gymId, userId, ['owner']);
    await this.gymRepo.softDelete(gymId);
  }

  // ============ STAFF MANAGEMENT ============

  async addStaff(gymId: string, ownerId: string, dto: AddStaffDto): Promise<GymOwnership> {
    await this.checkOwnership(gymId, ownerId, ['owner', 'manager']);

    // Cannot add as owner via this method
    if ((dto.role as string) === 'owner') {
      throw new ValidationError('Cannot add user as owner. Use transfer instead.');
    }

    const ownership = await this.gymRepo.addOwnership(gymId, dto.userId, dto.role, dto.permissions);

    await publish(GymEventTypes.STAFF_ADDED, {
      gymId,
      userId: dto.userId,
      role: dto.role,
      addedBy: ownerId,
    });

    return ownership;
  }

  async getStaff(gymId: string): Promise<GymOwnership[]> {
    return this.gymRepo.findOwnershipsByGym(gymId);
  }

  async updateStaff(gymId: string, ownerId: string, userId: string, role: string, permissions?: string[]): Promise<GymOwnership> {
    // Cannot promote to owner via this method
    if (role === 'owner') {
      throw new ValidationError('Cannot update user to owner. Use transfer instead.');
    }

    await this.checkOwnership(gymId, ownerId, ['owner']);

    const ownership = await this.gymRepo.updateOwnership(gymId, userId, role, permissions);
    if (!ownership) throw new GymNotFoundError(`Staff ${userId} not found`);

    return ownership;
  }

  async removeStaff(gymId: string, ownerId: string, userId: string): Promise<void> {
    await this.checkOwnership(gymId, ownerId, ['owner', 'manager']);

    // Cannot remove owner
    const target = await this.gymRepo.findOwnership(gymId, userId);
    if (target?.role === 'owner') {
      throw new ValidationError('Cannot remove owner. Use transfer instead.');
    }

    await this.gymRepo.removeOwnership(gymId, userId);

    await publish(GymEventTypes.STAFF_REMOVED, {
      gymId,
      userId,
      removedBy: ownerId,
    });
  }

  // ============ EQUIPMENT ============

  async addEquipment(gymId: string, userId: string, dto: AddEquipmentDto): Promise<GymEquipment> {
    await this.checkOwnership(gymId, userId, ['owner', 'manager', 'staff']);
    return this.gymRepo.addEquipment(gymId, {
      ...dto,
      quantity: dto.quantity ?? 1,
      condition: dto.condition ?? 'good',
    });
  }

  async getEquipment(gymId: string): Promise<GymEquipment[]> {
    return this.gymRepo.findEquipmentByGym(gymId);
  }

  async updateEquipment(gymId: string, userId: string, equipmentId: string, data: Partial<GymEquipment>): Promise<GymEquipment> {
    await this.checkOwnership(gymId, userId, ['owner', 'manager', 'staff']);
    const equipment = await this.gymRepo.updateEquipment(equipmentId, data);
    if (!equipment) throw new GymNotFoundError(`Equipment ${equipmentId}`);
    return equipment;
  }

  async removeEquipment(gymId: string, userId: string, equipmentId: string): Promise<void> {
    await this.checkOwnership(gymId, userId, ['owner', 'manager']);
    await this.gymRepo.removeEquipment(equipmentId);
  }

  // ============ HELPERS ============

  private async checkOwnership(gymId: string, userId: string, allowedRoles: string[]): Promise<void> {
    const ownership = await this.gymRepo.findOwnership(gymId, userId);

    if (!ownership || !allowedRoles.includes(ownership.role)) {
      throw new UnauthorizedError('You do not have permission to perform this action');
    }
  }

  private generateSlug(name: string): string {
    return name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '')
      .substring(0, 100);
  }
}
