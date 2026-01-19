// src/interfaces/http/validation/schemas.ts

import { z } from 'zod';

// UUID validation helper
const uuidSchema = z.string().uuid('Invalid ID format');

// Common reusable patterns
const nameSchema = z.string().min(2).max(100).trim();
const descriptionSchema = z.string().max(2000).trim().optional();
const notesSchema = z.string().max(1000).trim().optional();

// ============================================
// Exercise Schemas
// ============================================

export const CreateExerciseSchema = z.object({
  name: nameSchema,
  description: z.string().max(2000).trim().default(''),
  instructions: z.array(z.string().max(500).trim()).max(20).optional(),
  category: z
    .enum([
      'chest',
      'back',
      'shoulders',
      'biceps',
      'triceps',
      'legs',
      'glutes',
      'core',
      'cardio',
      'full_body',
      'other',
    ])
    .optional(),
  primaryMuscles: z.array(z.string()).optional(),
  secondaryMuscles: z.array(z.string()).optional(),
  equipment: z.array(z.string()).optional(),
  difficulty: z.enum(['beginner', 'intermediate', 'advanced', 'expert']).optional(),
  exerciseType: z
    .enum(['strength', 'cardio', 'flexibility', 'balance', 'plyometric', 'warmup', 'cooldown'])
    .optional(),
  mediaUrls: z.array(z.string().url()).max(10).optional(),
  isPublic: z.boolean().optional(),
});

export const UpdateExerciseSchema = CreateExerciseSchema.partial();

export const ListExercisesQuerySchema = z.object({
  query: z.string().max(100).optional(),
  category: z.string().optional(),
  equipment: z.string().optional(), // Comma-separated
  difficulty: z.string().optional(),
  muscleGroup: z.string().optional(),
  limit: z.coerce.number().min(1).max(100).default(20),
  offset: z.coerce.number().min(0).default(0),
});

// ============================================
// Workout Schemas
// ============================================

export const StartWorkoutSchema = z.object({
  name: nameSchema,
  templateId: uuidSchema.optional(),
  programId: uuidSchema.optional(),
  programWeek: z.number().int().min(1).max(52).optional(),
  programDay: z.number().int().min(1).max(7).optional(),
  location: z.string().max(200).trim().optional(),
  gymId: uuidSchema.optional(),
  mood: z.number().int().min(1).max(5).optional(),
  energy: z.number().int().min(1).max(5).optional(),
});

export const AddExerciseSchema = z.object({
  exerciseId: uuidSchema,
});

export const LogSetSchema = z.object({
  actualReps: z.number().int().min(0).max(1000),
  actualWeight: z.number().min(0).max(2000),
  weightUnit: z.enum(['kg', 'lbs']),
  targetReps: z.number().int().min(0).max(1000).optional(),
  targetWeight: z.number().min(0).max(2000).optional(),
  rpe: z.number().min(1).max(10).optional(),
  isWarmup: z.boolean().optional(),
  notes: z.string().max(200).trim().optional(),
});

export const CompleteWorkoutSchema = z.object({
  notes: notesSchema,
});

export const SkipExerciseSchema = z.object({
  reason: z.string().max(200).trim().optional(),
});

export const ListWorkoutsQuerySchema = z.object({
  status: z.enum(['in_progress', 'completed', 'abandoned']).optional(),
  startDate: z.string().datetime().optional(),
  endDate: z.string().datetime().optional(),
  limit: z.coerce.number().min(1).max(100).default(20),
  offset: z.coerce.number().min(0).default(0),
});

// ============================================
// Progress Schemas
// ============================================

export const ExerciseHistoryQuerySchema = z.object({
  limit: z.coerce.number().min(1).max(50).default(10),
  offset: z.coerce.number().min(0).default(0),
});

// Types
export type CreateExerciseInput = z.infer<typeof CreateExerciseSchema>;
export type UpdateExerciseInput = z.infer<typeof UpdateExerciseSchema>;
export type ListExercisesQuery = z.infer<typeof ListExercisesQuerySchema>;
export type StartWorkoutInput = z.infer<typeof StartWorkoutSchema>;
export type AddExerciseInput = z.infer<typeof AddExerciseSchema>;
export type LogSetInput = z.infer<typeof LogSetSchema>;
export type CompleteWorkoutInput = z.infer<typeof CompleteWorkoutSchema>;
export type ListWorkoutsQuery = z.infer<typeof ListWorkoutsQuerySchema>;
