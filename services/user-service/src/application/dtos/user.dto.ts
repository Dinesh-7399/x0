// src/application/dtos/user.dto.ts

import { z } from 'zod';

export const UpdateProfileSchema = z.object({
  firstName: z.string().min(1, 'First name is required').max(100, 'First name is too long').optional(),
  lastName: z.string().min(1, 'Last name is required').max(100, 'Last name is too long').optional(),
  bio: z.string().max(500, 'Bio too long').optional(),
  avatarUrl: z.string().url('Invalid URL').max(255, 'URL too long').optional(),
  phoneNumber: z.string().max(20, 'Phone number too long').optional(),
  location: z.string().max(255, 'Location too long').optional(),
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
