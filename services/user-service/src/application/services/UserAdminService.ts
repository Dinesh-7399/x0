// src/application/services/UserAdminService.ts

import type { IUserRepository } from '../../domain/repositories/IUserRepository.js';
import type { UserProfileResponse } from '../dtos/user.dto.js';
import { UserNotFoundError } from '../errors/UserErrors.js';
import type { IProfileRepository } from '../../domain/repositories/IProfileRepository.js';

export interface IUserAdminService {
  listUsers(limit?: number, offset?: number): Promise<{ users: UserAdminDto[], total: number }>;
  banUser(userId: string): Promise<void>;
  unbanUser(userId: string): Promise<void>;
  getUserDetails(userId: string): Promise<UserAdminDto>;
}

export interface UserAdminDto {
  id: string;
  email: string;
  firstName?: string;
  lastName?: string;
  status: string;
  roles: string[];
  createdAt: Date;
}

export class UserAdminService implements IUserAdminService {
  constructor(
    private readonly userRepository: IUserRepository,
    private readonly profileRepository: IProfileRepository,
  ) { }

  async listUsers(limit: number = 20, offset: number = 0): Promise<{ users: UserAdminDto[], total: number }> {
    const { users, total } = await this.userRepository.findAll(limit, offset);

    // Enrich with profile data (N+1 problem here, but for admin lists usually acceptable or we can optimize later with batch fetching)
    // For now, let's fetch profiles in parallel
    const enrichedUsers = await Promise.all(users.map(async (user) => {
      const profile = await this.profileRepository.findByUserId(user.id);
      return {
        id: user.id,
        email: user.email,
        firstName: profile?.firstName,
        lastName: profile?.lastName,
        status: user.status,
        roles: user.roles,
        createdAt: user.createdAt,
      };
    }));

    return { users: enrichedUsers, total };
  }

  async banUser(userId: string): Promise<void> {
    const user = await this.userRepository.findById(userId);
    if (!user) throw new UserNotFoundError();

    await this.userRepository.updateStatus(userId, 'BANNED');
  }

  async unbanUser(userId: string): Promise<void> {
    const user = await this.userRepository.findById(userId);
    if (!user) throw new UserNotFoundError();

    await this.userRepository.updateStatus(userId, 'ACTIVE');
  }

  async getUserDetails(userId: string): Promise<UserAdminDto> {
    const user = await this.userRepository.findById(userId);
    if (!user) throw new UserNotFoundError();

    const profile = await this.profileRepository.findByUserId(userId);

    return {
      id: user.id,
      email: user.email,
      firstName: profile?.firstName,
      lastName: profile?.lastName,
      status: user.status,
      roles: user.roles,
      createdAt: user.createdAt,
    };
  }
}
