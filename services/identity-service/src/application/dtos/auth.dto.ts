// src/application/dtos/auth.dto.ts
import { z } from 'zod';

/**
 * Request DTOs with Zod validation
 */

// Register
export const RegisterRequestSchema = z.object({
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

export type RegisterRequest = z.infer<typeof RegisterRequestSchema>;

// Login
export const LoginRequestSchema = z.object({
  email: z.string().email('Invalid email format'),
  password: z.string().min(1, 'Password is required'),
});

export type LoginRequest = z.infer<typeof LoginRequestSchema>;

// Refresh Token
export const RefreshTokenRequestSchema = z.object({
  refreshToken: z.string().uuid('Invalid refresh token format'),
});

export type RefreshTokenRequest = z.infer<typeof RefreshTokenRequestSchema>;

// Forgot Password
export const ForgotPasswordRequestSchema = z.object({
  email: z.string().email('Invalid email format'),
});

export type ForgotPasswordRequest = z.infer<typeof ForgotPasswordRequestSchema>;

// Reset Password
export const ResetPasswordRequestSchema = z.object({
  token: z.string().uuid('Invalid token format'),
  password: z
    .string()
    .min(8, 'Password must be at least 8 characters')
    .regex(/[A-Z]/, 'Password must contain uppercase letter')
    .regex(/[a-z]/, 'Password must contain lowercase letter')
    .regex(/\d/, 'Password must contain a number')
    .regex(/[!@#$%^&*(),.?":{}|<>]/, 'Password must contain special character'),
});

export type ResetPasswordRequest = z.infer<typeof ResetPasswordRequestSchema>;

// Verify Email
export const VerifyEmailRequestSchema = z.object({
  code: z.string().length(6, 'Verification code must be 6 digits'),
});

export type VerifyEmailRequest = z.infer<typeof VerifyEmailRequestSchema>;

/**
 * Response DTOs
 */

export interface AuthResponse {
  user: UserDTO;
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
}

export interface RefreshResponse {
  accessToken: string;
  expiresIn: number;
}

export interface UserDTO {
  id: string;
  email: string;
  emailVerified: boolean;
  phoneVerified: boolean;
  phone?: string;
  createdAt: Date;
}

export interface MessageResponse {
  message: string;
}
