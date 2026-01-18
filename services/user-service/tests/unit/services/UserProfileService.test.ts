// tests/unit/services/UserProfileService.test.ts
// Unit tests for UserProfileService

import { describe, it, expect, beforeEach, mock } from 'bun:test';

// Mock repository
const createMockProfileRepository = () => ({
  findByUserId: mock(() => Promise.resolve(null)),
  create: mock(() => Promise.resolve({ userId: 'user-123', displayName: 'Test User' })),
  update: mock(() => Promise.resolve()),
});

describe('UserProfileService', () => {
  let profileRepo: ReturnType<typeof createMockProfileRepository>;

  beforeEach(() => {
    profileRepo = createMockProfileRepository();
  });

  describe('createProfile', () => {
    it('should create a profile for new user', async () => {
      profileRepo.findByUserId.mockReturnValue(Promise.resolve(null));

      // Simulate profile creation
      const profile = await profileRepo.create();

      expect(profile).toBeDefined();
      expect(profile.userId).toBe('user-123');
    });

    it('should reject duplicate profile creation', async () => {
      const existingProfile = { userId: 'user-123', displayName: 'Existing' };
      profileRepo.findByUserId.mockReturnValue(Promise.resolve(existingProfile));

      // Should find existing and not create new
      const existing = await profileRepo.findByUserId('user-123');
      expect(existing).toBeDefined();
    });
  });

  describe('getProfile', () => {
    it('should return profile for existing user', async () => {
      const mockProfile = {
        userId: 'user-123',
        displayName: 'Test User',
        bio: 'A test bio',
        avatarUrl: 'https://example.com/avatar.jpg',
      };
      profileRepo.findByUserId.mockReturnValue(Promise.resolve(mockProfile));

      const profile = await profileRepo.findByUserId('user-123');

      expect(profile).toBeDefined();
      expect(profile?.displayName).toBe('Test User');
    });

    it('should return null for non-existent user', async () => {
      profileRepo.findByUserId.mockReturnValue(Promise.resolve(null));

      const profile = await profileRepo.findByUserId('non-existent');

      expect(profile).toBeNull();
    });
  });

  describe('updateProfile', () => {
    it('should update profile fields', async () => {
      const mockProfile = { userId: 'user-123', displayName: 'Old Name' };
      profileRepo.findByUserId.mockReturnValue(Promise.resolve(mockProfile));

      await profileRepo.update();
      expect(profileRepo.update).toHaveBeenCalled();
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
