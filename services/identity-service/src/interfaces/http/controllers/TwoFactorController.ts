// src/interfaces/http/controllers/TwoFactorController.ts

import type { Context } from 'hono';
import type { ITwoFactorService } from '../../../application/services/TwoFactorService.js';
import type { IJwtService } from '../../../application/services/interfaces.js';
import { AuthError } from '../../../application/errors/AuthErrors.js';
import { z } from 'zod';

const TokenSchema = z.object({
  token: z.string().length(6, 'Token must be 6 digits'),
});

const BackupCodeSchema = z.object({
  code: z.string().min(6, 'Invalid backup code'),
});

/**
 * TwoFactorController
 * 
 * Handles HTTP concerns for 2FA endpoints.
 */
export class TwoFactorController {
  constructor(
    private readonly twoFactorService: ITwoFactorService,
    private readonly jwtService: IJwtService,
  ) { }

  /**
   * POST /auth/2fa/setup - Setup 2FA
   */
  async setup(c: Context): Promise<Response> {
    try {
      const userId = await this.getAuthenticatedUserId(c);
      if (!userId) {
        return c.json({ error: 'UNAUTHORIZED', message: 'Valid access token required' }, 401);
      }

      const result = await this.twoFactorService.setup(userId);

      return c.json(result, 200);
    } catch (error) {
      return this.handleError(c, error);
    }
  }

  /**
   * POST /auth/2fa/enable - Enable 2FA with verification code
   */
  async enable(c: Context): Promise<Response> {
    try {
      const userId = await this.getAuthenticatedUserId(c);
      if (!userId) {
        return c.json({ error: 'UNAUTHORIZED', message: 'Valid access token required' }, 401);
      }

      const body = await this.parseBody(c, TokenSchema);
      const result = await this.twoFactorService.enable(userId, body.token);

      return c.json(result, 200);
    } catch (error) {
      return this.handleError(c, error);
    }
  }

  /**
   * POST /auth/2fa/disable - Disable 2FA
   */
  async disable(c: Context): Promise<Response> {
    try {
      const userId = await this.getAuthenticatedUserId(c);
      if (!userId) {
        return c.json({ error: 'UNAUTHORIZED', message: 'Valid access token required' }, 401);
      }

      const body = await this.parseBody(c, TokenSchema);
      const result = await this.twoFactorService.disable(userId, body.token);

      return c.json(result, 200);
    } catch (error) {
      return this.handleError(c, error);
    }
  }

  /**
   * POST /auth/2fa/verify - Verify 2FA token (for login)
   */
  async verify(c: Context): Promise<Response> {
    try {
      const userId = await this.getAuthenticatedUserId(c);
      if (!userId) {
        return c.json({ error: 'UNAUTHORIZED', message: 'Valid access token required' }, 401);
      }

      const body = await this.parseBody(c, TokenSchema);
      const isValid = await this.twoFactorService.verify(userId, body.token);

      if (!isValid) {
        return c.json({ error: 'INVALID_TOKEN', message: 'Invalid 2FA token' }, 400);
      }

      return c.json({ valid: true }, 200);
    } catch (error) {
      return this.handleError(c, error);
    }
  }

  /**
   * GET /auth/2fa/status - Check if 2FA is enabled
   */
  async status(c: Context): Promise<Response> {
    try {
      const userId = await this.getAuthenticatedUserId(c);
      if (!userId) {
        return c.json({ error: 'UNAUTHORIZED', message: 'Valid access token required' }, 401);
      }

      const enabled = await this.twoFactorService.isEnabled(userId);

      return c.json({ enabled }, 200);
    } catch (error) {
      return this.handleError(c, error);
    }
  }

  /**
   * POST /auth/2fa/backup-codes/regenerate - Regenerate backup codes
   */
  async regenerateBackupCodes(c: Context): Promise<Response> {
    try {
      const userId = await this.getAuthenticatedUserId(c);
      if (!userId) {
        return c.json({ error: 'UNAUTHORIZED', message: 'Valid access token required' }, 401);
      }

      const body = await this.parseBody(c, TokenSchema);
      const result = await this.twoFactorService.regenerateBackupCodes(userId, body.token);

      return c.json(result, 200);
    } catch (error) {
      return this.handleError(c, error);
    }
  }

  // ============ PRIVATE HELPERS ============

  private async parseBody<T>(c: Context, schema: z.ZodSchema<T>): Promise<T> {
    const body = await c.req.json();
    return schema.parse(body);
  }

  private async getAuthenticatedUserId(c: Context): Promise<string | null> {
    const authHeader = c.req.header('Authorization');
    if (!authHeader?.startsWith('Bearer ')) return null;

    const token = authHeader.slice(7);
    const result = await this.jwtService.verifyAccessToken(token);

    if (!result.valid || !result.payload?.sub) return null;
    return result.payload.sub;
  }

  private handleError(c: Context, error: unknown): Response {
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

    if (error instanceof AuthError) {
      return c.json({
        error: error.code,
        message: error.message,
      }, error.statusCode as any);
    }

    console.error('Unhandled error:', error);
    throw error;
  }
}
