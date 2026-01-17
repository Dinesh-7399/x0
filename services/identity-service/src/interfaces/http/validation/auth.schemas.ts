// src/interfaces/http/validation/auth.schemas.ts

import { z } from 'zod';

/**
 * Validation Schemas
 * 
 * Centralized Zod schemas for request validation.
 * Single Responsibility: Validation only.
 */

export const RegisterSchema = z.object({
  email: z.string().email('Invalid email format').max(255),
  password: z
    .string()
    .min(8, 'Password must be at least 8 characters')
    .regex(/[A-Z]/, 'Password must contain uppercase letter')
    .regex(/[a-z]/, 'Password must contain lowercase letter')
    .regex(/\d/, 'Password must contain a number')
    .regex(/[!@#$%^&*(),.?":{}|<>]/, 'Password must contain special character'),
  phone: z.string().optional(),
});

export const LoginSchema = z.object({
  email: z.string().email('Invalid email format'),
  password: z.string().min(1, 'Password is required'),
});

export const RefreshTokenSchema = z.object({
  refreshToken: z.string().uuid('Invalid refresh token format'),
});

export const VerifyEmailSchema = z.object({
  code: z.string().length(6, 'Verification code must be 6 digits'),
});

export const ForgotPasswordSchema = z.object({
  email: z.string().email('Invalid email format'),
});

export const ResetPasswordSchema = z.object({
  token: z.string().uuid('Invalid token format'),
  password: z
    .string()
    .min(8, 'Password must be at least 8 characters')
    .regex(/[A-Z]/, 'Password must contain uppercase letter')
    .regex(/[a-z]/, 'Password must contain lowercase letter')
    .regex(/\d/, 'Password must contain a number')
    .regex(/[!@#$%^&*(),.?":{}|<>]/, 'Password must contain special character'),
});

// Type exports
export type RegisterInput = z.infer<typeof RegisterSchema>;
export type LoginInput = z.infer<typeof LoginSchema>;
export type RefreshTokenInput = z.infer<typeof RefreshTokenSchema>;
export type VerifyEmailInput = z.infer<typeof VerifyEmailSchema>;
export type ForgotPasswordInput = z.infer<typeof ForgotPasswordSchema>;
export type ResetPasswordInput = z.infer<typeof ResetPasswordSchema>;
