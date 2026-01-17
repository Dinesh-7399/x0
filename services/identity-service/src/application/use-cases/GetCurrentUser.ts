// src/application/use-cases/GetCurrentUser.ts
import type { IUserRepository } from '../../domain/repositories/IUserRepository.js';
import { UserNotFoundError } from '../errors/AuthErrors.js';
import type { UserDTO } from '../dtos/auth.dto.js';
import { User } from '../../domain/entities/User.js';

export interface GetCurrentUserDeps {
  userRepository: IUserRepository;
}

/**
 * Get Current User Use Case
 * 
 * Returns the user profile for the authenticated user.
 */
export async function getCurrentUser(
  userId: string,
  deps: GetCurrentUserDeps,
): Promise<UserDTO> {
  // Find user by ID
  const user = await deps.userRepository.findById(userId);

  if (!user) {
    throw new UserNotFoundError();
  }

  return toUserDTO(user);
}

function toUserDTO(user: User): UserDTO {
  return {
    id: user.id,
    email: user.email,
    emailVerified: user.emailVerified,
    phoneVerified: user.phoneVerified,
    phone: user.phone,
    createdAt: user.createdAt,
  };
}
