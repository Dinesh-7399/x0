// src/application/dtos/user.dto.ts

import { z } from 'zod';

export const UpdateProfileSchema = z.object({
  firstName: z.string().min(1, 'First name is required').optional(),
  lastName: z.string().min(1, 'Last name is required').optional(),
  bio: z.string().max(500, 'Bio too long').optional(),
  avatarUrl: z.string().url('Invalid URL').optional(),
  phoneNumber: z.string().optional(),
  location: z.string().max(100).optional(),
});

export type UpdateProfileDto = z.infer<typeof UpdateProfileSchema>;

export interface UserProfileResponse {
  id: string;
  userId: string;
  firstName: string;
  lastName: string;
  email: string; // From User entity
  bio?: string;
  avatarUrl?: string;
  phoneNumber?: string;
  location?: string;
  createdAt: Date;
  updatedAt: Date;
}
