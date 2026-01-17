// src/application/services/UserProfileService.ts

import { Profile } from '../../domain/entities/Profile.js';
import type { IProfileRepository } from '../../domain/repositories/IProfileRepository.js';
import type { IUserRepository } from '../../domain/repositories/IUserRepository.js';
import type { UpdateProfileDto, UserProfileResponse } from '../dtos/user.dto.js';
import { ProfileNotFoundError, UserNotFoundError } from '../errors/UserErrors.js';

export interface IUserProfileService {
  getProfile(userId: string): Promise<UserProfileResponse>;
  updateProfile(userId: string, data: UpdateProfileDto): Promise<UserProfileResponse>;
  createProfile(userId: string, data: { firstName: string; lastName: string }): Promise<UserProfileResponse>;
}

export class UserProfileService implements IUserProfileService {
  constructor(
    private readonly profileRepository: IProfileRepository,
    private readonly userRepository: IUserRepository,
  ) { }

  /**
   * Get user profile combined with user info
   */
  async getProfile(userId: string): Promise<UserProfileResponse> {
    const [profile, user] = await Promise.all([
      this.profileRepository.findByUserId(userId),
      this.userRepository.findById(userId),
    ]);

    if (!user) {
      throw new UserNotFoundError();
    }

    // Return partial profile if not created yet? Or strict check?
    // Let's assume every user MUST have a profile. If not found, return basic info or throw.
    // For now, if no profile, we can return just user info with empty fields or throw "Profile incomplete".
    // Better UX: throw dedicated error or return null profile data.
    // Decision: If profile missing, throw ProfileNotFoundError which frontend can handle (e.g. redirect to setup).
    if (!profile) {
      throw new ProfileNotFoundError();
    }

    return this.mapToResponse(profile, user);
  }

  /**
   * Update existing profile
   */
  async updateProfile(userId: string, data: UpdateProfileDto): Promise<UserProfileResponse> {
    const profile = await this.profileRepository.findByUserId(userId);
    if (!profile) {
      throw new ProfileNotFoundError();
    }

    profile.update(data);
    await this.profileRepository.update(profile);

    const user = await this.userRepository.findById(userId);
    if (!user) {
      throw new UserNotFoundError(); // Should ideally never happen if profile exists
    }

    return this.mapToResponse(profile, user);
  }

  /**
   * Create new profile (e.g. after registration)
   */
  async createProfile(userId: string, data: { firstName: string; lastName: string }): Promise<UserProfileResponse> {
    const user = await this.userRepository.findById(userId);
    if (!user) {
      throw new UserNotFoundError();
    }

    // Optimistic creation to handle race conditions
    try {
      const profile = Profile.create(userId, data.firstName, data.lastName);
      await this.profileRepository.save(profile);
      return this.mapToResponse(profile, user);
    } catch (error: any) {
      // Postgres unique constraint violation code is 23505
      if (error?.code === '23505') {
        const existing = await this.profileRepository.findByUserId(userId);
        if (existing) {
          return this.mapToResponse(existing, user);
        }
      }
      throw error;
    }
  }

  private mapToResponse(profile: Profile, user: { email: string }): UserProfileResponse {
    return {
      id: profile.id,
      userId: profile.userId,
      email: user.email,
      firstName: profile.firstName,
      lastName: profile.lastName,
      bio: profile.bio,
      avatarUrl: profile.avatarUrl,
      phoneNumber: profile.phoneNumber,
      location: profile.location,
      createdAt: profile.createdAt,
      updatedAt: profile.updatedAt,
    };
  }
}
