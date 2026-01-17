// src/interfaces/http/controllers/AuthController.ts

import type { Context } from 'hono';
import { z } from 'zod';
import type { IAuthService, IVerificationService, IPasswordService, IJwtService } from '../../../application/services/interfaces.js';
import { AuthError } from '../../../application/errors/AuthErrors.js';
import {
  RegisterSchema,
  LoginSchema,
  RefreshTokenSchema,
  VerifyEmailSchema,
  ForgotPasswordSchema,
  ResetPasswordSchema,
} from '../validation/auth.schemas.js';

/**
 * AuthController
 * 
 * Handles HTTP concerns for authentication endpoints.
 * Single Responsibility: HTTP request/response handling only.
 * Delegates business logic to services.
 */
export class AuthController {
  constructor(
    private readonly authService: IAuthService,
    private readonly verificationService: IVerificationService,
    private readonly passwordService: IPasswordService,
    private readonly jwtService: IJwtService,
  ) { }

  /**
   * POST /auth/register
   */
  async register(c: Context): Promise<Response> {
    try {
      const body = await this.parseBody(c, RegisterSchema);
      const metadata = this.extractMetadata(c);

      const result = await this.authService.register(body.email, body.password, metadata);

      return c.json(result, 201);
    } catch (error) {
      return this.handleError(c, error);
    }
  }

  /**
   * POST /auth/login
   */
  async login(c: Context): Promise<Response> {
    try {
      const body = await this.parseBody(c, LoginSchema);
      const metadata = this.extractMetadata(c);

      const result = await this.authService.login(body.email, body.password, metadata);

      return c.json(result, 200);
    } catch (error) {
      return this.handleError(c, error, 401);
    }
  }

  /**
   * POST /auth/refresh
   */
  async refresh(c: Context): Promise<Response> {
    try {
      const body = await this.parseBody(c, RefreshTokenSchema);
      const result = await this.authService.refresh(body.refreshToken);

      return c.json(result, 200);
    } catch (error) {
      return this.handleError(c, error, 401);
    }
  }

  /**
   * POST /auth/logout
   */
  async logout(c: Context): Promise<Response> {
    try {
      const body = await this.parseBody(c, RefreshTokenSchema);
      const result = await this.authService.logout(body.refreshToken);

      return c.json(result, 200);
    } catch (error) {
      return this.handleError(c, error);
    }
  }

  /**
   * GET /auth/me
   */
  async me(c: Context): Promise<Response> {
    try {
      const userId = await this.getAuthenticatedUserId(c);
      if (!userId) {
        return c.json({ error: 'UNAUTHORIZED', message: 'Valid access token required' }, 401);
      }

      const result = await this.authService.getCurrentUser(userId);

      return c.json(result, 200);
    } catch (error) {
      return this.handleError(c, error, 404);
    }
  }

  /**
   * POST /auth/send-verification
   */
  async sendVerification(c: Context): Promise<Response> {
    try {
      const userId = await this.getAuthenticatedUserId(c);
      if (!userId) {
        return c.json({ error: 'UNAUTHORIZED', message: 'Valid access token required' }, 401);
      }

      const result = await this.verificationService.sendEmailVerification(userId);

      return c.json(result, 200);
    } catch (error) {
      return this.handleError(c, error);
    }
  }

  /**
   * POST /auth/verify-email
   */
  async verifyEmail(c: Context): Promise<Response> {
    try {
      const userId = await this.getAuthenticatedUserId(c);
      if (!userId) {
        return c.json({ error: 'UNAUTHORIZED', message: 'Valid access token required' }, 401);
      }

      const body = await this.parseBody(c, VerifyEmailSchema);
      const result = await this.verificationService.verifyEmail(userId, body.code);

      return c.json(result, 200);
    } catch (error) {
      return this.handleError(c, error);
    }
  }

  /**
   * POST /auth/forgot-password
   */
  async forgotPassword(c: Context): Promise<Response> {
    try {
      const body = await this.parseBody(c, ForgotPasswordSchema);
      const result = await this.passwordService.forgotPassword(body.email);

      return c.json(result, 200);
    } catch (error) {
      // Don't reveal errors for security
      return c.json({ message: 'If an account exists, a password reset link will be sent' }, 200);
    }
  }

  /**
   * POST /auth/reset-password
   */
  async resetPassword(c: Context): Promise<Response> {
    try {
      const body = await this.parseBody(c, ResetPasswordSchema);
      const result = await this.passwordService.resetPassword(body.token, body.password);

      return c.json(result, 200);
    } catch (error) {
      return this.handleError(c, error);
    }
  }

  // ============ PRIVATE HELPERS ============

  /**
   * Parse and validate request body
   */
  private async parseBody<T>(c: Context, schema: z.ZodSchema<T>): Promise<T> {
    const body = await c.req.json();
    return schema.parse(body);
  }

  /**
   * Extract request metadata
   */
  private extractMetadata(c: Context): { ipAddress?: string; userAgent?: string } {
    return {
      ipAddress: c.req.header('x-forwarded-for') || c.req.header('x-real-ip'),
      userAgent: c.req.header('user-agent'),
    };
  }

  /**
   * Get authenticated user ID from JWT
   */
  private async getAuthenticatedUserId(c: Context): Promise<string | null> {
    const authHeader = c.req.header('Authorization');
    if (!authHeader?.startsWith('Bearer ')) return null;

    const token = authHeader.slice(7);
    const result = await this.jwtService.verifyAccessToken(token);

    if (!result.valid || !result.payload?.sub) return null;
    return result.payload.sub;
  }

  /**
   * Handle errors and return appropriate response
   */
  private handleError(c: Context, error: unknown, defaultStatus: number = 400): Response {
    // Validation error
    if (error instanceof z.ZodError) {
      return c.json({
        error: 'VALIDATION_ERROR',
        message: 'Invalid request data',
        details: error.issues.map(i => ({
          field: i.path.join('.'),
          message: i.message,
        })),
      }, 400);
    }

    // Auth error
    if (error instanceof AuthError) {
      return c.json({
        error: error.code,
        message: error.message,
      }, defaultStatus as any);
    }

    // Unknown error
    console.error('Unhandled error:', error);
    throw error;
  }
}
