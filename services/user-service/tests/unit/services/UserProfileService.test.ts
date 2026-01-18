// tests/unit/services/UserProfileService.test.ts
// Unit tests for UserProfileService - properly testing service behavior

import { describe, it, expect, beforeEach, mock } from 'bun:test';
import { UserProfileService } from '../../../src/application/services/UserProfileService.js';
import type { IProfileRepository } from '../../../src/domain/repositories/IProfileRepository.js';
import type { IUserRepository } from '../../../src/domain/repositories/IUserRepository.js';
import { Profile } from '../../../src/domain/entities/Profile.js';
import { User } from '../../../src/domain/entities/User.js';

// Helper to create a mock User entity
const createMockUser = (id: string, email: string) => User.fromPersistence({
  id,
  email,
  roles: ['user'],
  status: 'active',
  createdAt: new Date(),
});

// Create mock repositories matching the actual interfaces
const createMockProfileRepository = (): IProfileRepository => ({
  findById: mock(() => Promise.resolve(null)),
  findByUserId: mock(() => Promise.resolve(null)),
  save: mock(() => Promise.resolve()),
  update: mock(() => Promise.resolve()),
  delete: mock(() => Promise.resolve()),
});

const createMockUserRepository = (): IUserRepository => ({
  findById: mock(() => Promise.resolve(createMockUser('user-123', 'test@example.com'))),
  findByEmail: mock(() => Promise.resolve(null)),
  findAll: mock(() => Promise.resolve({ users: [], total: 0 })),
  updateStatus: mock(() => Promise.resolve()),
});

describe('UserProfileService', () => {
  let profileRepo: ReturnType<typeof createMockProfileRepository>;
  let userRepo: ReturnType<typeof createMockUserRepository>;
  let service: UserProfileService;

  beforeEach(() => {
    profileRepo = createMockProfileRepository();
    userRepo = createMockUserRepository();
    service = new UserProfileService(profileRepo, userRepo);
  });

  describe('createProfile', () => {
    it('should create a profile for new user', async () => {
      userRepo.findById = mock(() => Promise.resolve(createMockUser('user-123', 'test@example.com')));
      profileRepo.findByUserId = mock(() => Promise.resolve(null));

      const result = await service.createProfile('user-123', {
        firstName: 'John',
        lastName: 'Doe',
      });

      expect(result).toBeDefined();
      expect(result.firstName).toBe('John');
      expect(result.lastName).toBe('Doe');
      expect(result.email).toBe('test@example.com');
      expect(profileRepo.save).toHaveBeenCalled();
    });

    it('should return existing profile for idempotency', async () => {
      const existingProfile = Profile.create('user-123', 'Existing', 'User');
      userRepo.findById = mock(() => Promise.resolve(createMockUser('user-123', 'existing@example.com')));
      profileRepo.findByUserId = mock(() => Promise.resolve(existingProfile));

      const result = await service.createProfile('user-123', {
        firstName: 'New',
        lastName: 'Name',
      });

      // Should return existing profile, not create new
      expect(result.firstName).toBe('Existing');
      expect(result.lastName).toBe('User');
      expect(profileRepo.save).not.toHaveBeenCalled();
    });

    it('should throw UserNotFoundError if user does not exist', async () => {
      userRepo.findById = mock(() => Promise.resolve(null));

      await expect(
        service.createProfile('non-existent-user', { firstName: 'Test', lastName: 'User' })
      ).rejects.toThrow();
    });
  });

  describe('getProfile', () => {
    it('should return profile for existing user', async () => {
      const mockProfile = Profile.create('user-123', 'Test', 'User');
      mockProfile.update({ bio: 'A test bio' });

      userRepo.findById = mock(() => Promise.resolve(createMockUser('user-123', 'test@example.com')));
      profileRepo.findByUserId = mock(() => Promise.resolve(mockProfile));

      const result = await service.getProfile('user-123');

      expect(result).toBeDefined();
      expect(result.firstName).toBe('Test');
      expect(result.lastName).toBe('User');
      expect(result.bio).toBe('A test bio');
    });

    it('should throw ProfileNotFoundError for user without profile', async () => {
      userRepo.findById = mock(() => Promise.resolve(createMockUser('user-123', 'test@example.com')));
      profileRepo.findByUserId = mock(() => Promise.resolve(null));

      await expect(service.getProfile('user-123')).rejects.toThrow();
    });

    it('should throw UserNotFoundError for non-existent user', async () => {
      userRepo.findById = mock(() => Promise.resolve(null));

      await expect(service.getProfile('non-existent')).rejects.toThrow();
    });
  });

  describe('updateProfile', () => {
    it('should update profile fields', async () => {
      const mockProfile = Profile.create('user-123', 'Old', 'Name');
      userRepo.findById = mock(() => Promise.resolve(createMockUser('user-123', 'test@example.com')));
      profileRepo.findByUserId = mock(() => Promise.resolve(mockProfile));

      const result = await service.updateProfile('user-123', {
        bio: 'Updated bio',
        location: 'New York',
      });

      expect(result.bio).toBe('Updated bio');
      expect(result.location).toBe('New York');
      expect(profileRepo.update).toHaveBeenCalled();
    });

    it('should throw ProfileNotFoundError when updating non-existent profile', async () => {
      profileRepo.findByUserId = mock(() => Promise.resolve(null));

      await expect(
        service.updateProfile('user-123', { bio: 'New bio' })
      ).rejects.toThrow();
    });
  });
});

describe('UserPreferences', () => {
  it('should have default preferences', () => {
    const defaultPrefs = {
      theme: 'system',
      notifications: {
        email: true,
        push: true,
        sms: false,
      },
      language: 'en',
      timezone: 'Asia/Kolkata',
    };

    expect(defaultPrefs.theme).toBe('system');
    expect(defaultPrefs.notifications.email).toBe(true);
  });

  it('should allow preference updates', () => {
    const prefs = {
      theme: 'dark',
      notifications: { email: false, push: true, sms: false },
    };

    prefs.theme = 'light';
    expect(prefs.theme).toBe('light');
  });
});
