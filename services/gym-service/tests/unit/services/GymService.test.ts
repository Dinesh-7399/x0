// tests/unit/services/GymService.test.ts
// Unit tests for GymService

import { describe, it, expect, beforeEach, mock } from 'bun:test';
import { GymService } from '../../../src/application/services/GymService.js';
import { GymNotFoundError, GymSlugTakenError, UnauthorizedError } from '../../../src/application/errors/GymErrors.js';

// Mock repository
const createMockGymRepository = () => ({
  findById: mock(() => Promise.resolve(null)),
  findBySlug: mock(() => Promise.resolve(null)),
  findByOwnerId: mock(() => Promise.resolve([])),
  findOwnership: mock(() => Promise.resolve(null)),
  create: mock((data: any) => Promise.resolve({
    id: 'gym-123',
    slug: data.slug,
    name: data.name,
    city: data.city,
    country: data.country,
    type: data.type,
    status: 'draft',
    verified: false,
    ownerId: data.ownerId,
    facilities: data.facilities || [],
    createdAt: new Date(),
    updatedAt: new Date(),
  })),
  update: mock(() => Promise.resolve(null)),
  softDelete: mock(() => Promise.resolve(true)),
  addOwnership: mock(() => Promise.resolve({ id: 'ownership-1', role: 'owner' })),
  findOwnershipsByGym: mock(() => Promise.resolve([])),
  addEquipment: mock(() => Promise.resolve({ id: 'eq-1', name: 'Treadmill' })),
  findEquipmentByGym: mock(() => Promise.resolve([])),
  search: mock(() => Promise.resolve([])),
});

describe('GymService', () => {
  let gymService: GymService;
  let gymRepo: ReturnType<typeof createMockGymRepository>;

  beforeEach(() => {
    gymRepo = createMockGymRepository();
    gymService = new GymService(gymRepo as any);
  });

  describe('createGym', () => {
    it('should create a gym successfully', async () => {
      gymRepo.findBySlug.mockReturnValue(Promise.resolve(null)); // No existing slug

      const gym = await gymService.createGym('owner-123', {
        name: 'PowerFit Gym',
        city: 'Mumbai',
        type: 'gym',
      });

      expect(gym.name).toBe('PowerFit Gym');
      expect(gym.slug).toBe('powerfit-gym');
      expect(gymRepo.create).toHaveBeenCalled();
      expect(gymRepo.addOwnership).toHaveBeenCalledWith('gym-123', 'owner-123', 'owner', ['*']);
    });

    it('should throw error if slug already taken', async () => {
      const existingGym = { id: 'existing', slug: 'powerfit-gym', name: 'PowerFit' };
      gymRepo.findBySlug.mockReturnValue(Promise.resolve(existingGym as any));

      await expect(gymService.createGym('owner-123', {
        name: 'PowerFit Gym',
        city: 'Mumbai',
      })).rejects.toThrow(GymSlugTakenError);
    });

    it('should generate URL-friendly slug from name', async () => {
      gymRepo.findBySlug.mockReturnValue(Promise.resolve(null));

      const gym = await gymService.createGym('owner-123', {
        name: 'Gym With Spaces & Special!',
        city: 'Delhi',
      });

      expect(gym.slug).toBe('gym-with-spaces-special');
    });
  });

  describe('getGymById', () => {
    it('should return gym for valid ID', async () => {
      const mockGym = {
        id: 'gym-123',
        name: 'Test Gym',
        slug: 'test-gym',
        city: 'Mumbai',
        status: 'approved',
      };
      gymRepo.findById.mockReturnValue(Promise.resolve(mockGym as any));

      const gym = await gymService.getGymById('gym-123');

      expect(gym.name).toBe('Test Gym');
    });

    it('should throw GymNotFoundError for invalid ID', async () => {
      gymRepo.findById.mockReturnValue(Promise.resolve(null));

      await expect(gymService.getGymById('invalid-id'))
        .rejects.toThrow(GymNotFoundError);
    });
  });

  describe('updateGym', () => {
    it('should update gym when user is owner', async () => {
      const mockGym = { id: 'gym-123', name: 'Old Name' };
      const mockOwnership = { role: 'owner', userId: 'user-123' };

      gymRepo.findOwnership.mockReturnValue(Promise.resolve(mockOwnership as any));
      gymRepo.update.mockReturnValue(Promise.resolve({ ...mockGym, name: 'New Name' } as any));

      const updated = await gymService.updateGym('gym-123', 'user-123', { name: 'New Name' });

      expect(updated.name).toBe('New Name');
    });

    it('should throw UnauthorizedError if user is not owner/manager', async () => {
      gymRepo.findOwnership.mockReturnValue(Promise.resolve(null));

      await expect(gymService.updateGym('gym-123', 'non-owner', { name: 'New Name' }))
        .rejects.toThrow(UnauthorizedError);
    });
  });

  describe('deleteGym', () => {
    it('should soft delete gym when owner', async () => {
      const mockOwnership = { role: 'owner' };
      gymRepo.findOwnership.mockReturnValue(Promise.resolve(mockOwnership as any));

      await gymService.deleteGym('gym-123', 'owner-123');

      expect(gymRepo.softDelete).toHaveBeenCalledWith('gym-123');
    });

    it('should not allow non-owner to delete', async () => {
      const mockOwnership = { role: 'staff' };
      gymRepo.findOwnership.mockReturnValue(Promise.resolve(mockOwnership as any));

      await expect(gymService.deleteGym('gym-123', 'staff-123'))
        .rejects.toThrow(UnauthorizedError);
    });
  });

  describe('addEquipment', () => {
    it('should add equipment when authorized', async () => {
      const mockOwnership = { role: 'manager' };
      gymRepo.findOwnership.mockReturnValue(Promise.resolve(mockOwnership as any));

      const equipment = await gymService.addEquipment('gym-123', 'manager-123', {
        name: 'Treadmill',
        category: 'Cardio',
        quantity: 5,
      });

      expect(equipment.name).toBe('Treadmill');
      expect(gymRepo.addEquipment).toHaveBeenCalled();
    });
  });

  describe('getMyGyms', () => {
    it('should return all gyms for owner', async () => {
      const mockGyms = [
        { id: 'gym-1', name: 'Gym 1' },
        { id: 'gym-2', name: 'Gym 2' },
      ];
      gymRepo.findByOwnerId.mockReturnValue(Promise.resolve(mockGyms as any));

      const gyms = await gymService.getMyGyms('owner-123');

      expect(gyms).toHaveLength(2);
    });
  });
});
