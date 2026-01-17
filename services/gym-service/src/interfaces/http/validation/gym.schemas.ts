// src/interfaces/http/validation/gym.schemas.ts

import { z } from 'zod';

const GymTypeSchema = z.enum(['gym', 'yoga', 'crossfit', 'martial_arts', 'studio', 'other']);

const OperatingHoursSchema = z.object({
  monday: z.object({ open: z.string(), close: z.string() }).nullable().optional(),
  tuesday: z.object({ open: z.string(), close: z.string() }).nullable().optional(),
  wednesday: z.object({ open: z.string(), close: z.string() }).nullable().optional(),
  thursday: z.object({ open: z.string(), close: z.string() }).nullable().optional(),
  friday: z.object({ open: z.string(), close: z.string() }).nullable().optional(),
  saturday: z.object({ open: z.string(), close: z.string() }).nullable().optional(),
  sunday: z.object({ open: z.string(), close: z.string() }).nullable().optional(),
}).optional();

export const CreateGymSchema = z.object({
  name: z.string().min(2).max(255),
  description: z.string().max(2000).optional(),
  type: GymTypeSchema.optional().default('gym'),
  address: z.string().max(500).optional(),
  city: z.string().min(2).max(100),
  state: z.string().max(100).optional(),
  country: z.string().max(100).optional().default('India'),
  postalCode: z.string().max(20).optional(),
  latitude: z.number().min(-90).max(90).optional(),
  longitude: z.number().min(-180).max(180).optional(),
  phone: z.string().max(20).optional(),
  email: z.string().email().optional(),
  website: z.string().url().optional(),
  logoUrl: z.string().url().optional(),
  coverImageUrl: z.string().url().optional(),
  facilities: z.array(z.string()).optional(),
  operatingHours: OperatingHoursSchema,
});

export const UpdateGymSchema = CreateGymSchema.partial();

export const SearchGymsSchema = z.object({
  city: z.string().optional(),
  type: GymTypeSchema.optional(),
  query: z.string().optional(),
  verified: z.coerce.boolean().optional(),
  page: z.coerce.number().min(1).optional().default(1),
  limit: z.coerce.number().min(1).max(100).optional().default(20),
});

export const AddStaffSchema = z.object({
  userId: z.string().uuid(),
  role: z.enum(['manager', 'staff']),
  permissions: z.array(z.string()).optional(),
});

export const AddEquipmentSchema = z.object({
  name: z.string().min(1).max(100),
  category: z.string().max(50).optional(),
  brand: z.string().max(100).optional(),
  quantity: z.number().int().min(1).optional().default(1),
  condition: z.enum(['new', 'good', 'fair', 'poor']).optional().default('good'),
});

export const UpdateEquipmentSchema = AddEquipmentSchema.partial();
