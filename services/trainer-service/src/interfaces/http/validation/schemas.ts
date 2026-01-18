import { z } from 'zod';

export const CreateProfileSchema = z.object({
  bio: z.string().max(2000).optional(),
  specializations: z.array(z.string()),
  experienceYears: z.coerce.number().min(0),
});

export const UpdateProfileSchema = CreateProfileSchema.partial();

export const AddCertSchema = z.object({
  name: z.string().min(2),
  issuingOrganization: z.string().min(2),
  issueDate: z.coerce.date(),
  expiryDate: z.coerce.date().optional(),
  url: z.string().url().optional(),
});

export const EmploymentRequestSchema = z.object({
  gymId: z.string().uuid(),
  type: z.enum(['full_time', 'part_time', 'contract', 'freelance']),
});

export const SetAvailabilitySchema = z.object({
  gymId: z.string().uuid(),
  dayOfWeek: z.coerce.number().min(0).max(6),
  startTime: z.string().regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, 'Invalid time format (HH:mm)'),
  endTime: z.string().regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, 'Invalid time format (HH:mm)'),
});
