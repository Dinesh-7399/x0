// src/interfaces/http/validation/schemas.ts

import { z } from 'zod';

// Upload schemas
export const UploadMediaSchema = z.object({
  entityType: z.string().optional(),
  entityId: z.string().uuid().optional(),
  isPublic: z.boolean().optional(),
});

export const UpdateMediaSchema = z.object({
  entityType: z.string().optional(),
  entityId: z.string().uuid().optional(),
  isPublic: z.boolean().optional(),
});

// Query schemas
export const ListMediaQuerySchema = z.object({
  limit: z.coerce.number().min(1).max(100).optional().default(20),
  offset: z.coerce.number().min(0).optional().default(0),
  type: z.enum(['image', 'video', 'document', 'audio']).optional(),
  entityType: z.string().optional(),
  entityId: z.string().uuid().optional(),
});

export const EntityMediaQuerySchema = z.object({
  entityType: z.string(),
  entityId: z.string().uuid(),
});

// Presigned URL schema
export const GeneratePresignedUrlSchema = z.object({
  filename: z.string().min(1).max(255),
  mimeType: z.string().min(1),
  size: z.number().positive(),
  entityType: z.string().optional(),
  entityId: z.string().uuid().optional(),
});

// Types
export type UploadMediaInput = z.infer<typeof UploadMediaSchema>;
export type UpdateMediaInput = z.infer<typeof UpdateMediaSchema>;
export type ListMediaQuery = z.infer<typeof ListMediaQuerySchema>;
export type EntityMediaQuery = z.infer<typeof EntityMediaQuerySchema>;
export type GeneratePresignedUrlInput = z.infer<typeof GeneratePresignedUrlSchema>;
