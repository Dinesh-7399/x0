// src/interfaces/http/controllers/LoginHistoryController.ts

import type { Context } from 'hono';
import type { ILoginHistoryService } from '../../../application/services/LoginHistoryService.js';
import type { IJwtService } from '../../../application/services/interfaces.js';
import { AuthError } from '../../../application/errors/AuthErrors.js';

/**
 * LoginHistoryController
 * 
 * Handles HTTP concerns for login history endpoints.
 */
export class LoginHistoryController {
  constructor(
    private readonly loginHistoryService: ILoginHistoryService,
    private readonly jwtService: IJwtService,
  ) { }

  /**
   * GET /auth/login-history - Get user's login history
   */
  async getHistory(c: Context): Promise<Response> {
    try {
      const userId = await this.getAuthenticatedUserId(c);
      if (!userId) {
        return c.json({ error: 'UNAUTHORIZED', message: 'Valid access token required' }, 401);
      }

      const limit = parseInt(c.req.query('limit') || '20', 10);
      const history = await this.loginHistoryService.getHistory(userId, limit);

      return c.json({ history, total: history.length }, 200);
    } catch (error) {
      return this.handleError(c, error);
    }
  }

  /**
   * GET /auth/login-history/status - Check if account is locked
   */
  async getLockStatus(c: Context): Promise<Response> {
    try {
      const userId = await this.getAuthenticatedUserId(c);
      if (!userId) {
        return c.json({ error: 'UNAUTHORIZED', message: 'Valid access token required' }, 401);
      }

      const lockStatus = await this.loginHistoryService.isAccountLocked(userId);

      return c.json(lockStatus, 200);
    } catch (error) {
      return this.handleError(c, error);
    }
  }

  // ============ PRIVATE HELPERS ============

  private async getAuthenticatedUserId(c: Context): Promise<string | null> {
    const authHeader = c.req.header('Authorization');
    if (!authHeader?.startsWith('Bearer ')) return null;

    const token = authHeader.slice(7);
    const result = await this.jwtService.verifyAccessToken(token);

    if (!result.valid || !result.payload?.sub) return null;
    return result.payload.sub;
  }

  private handleError(c: Context, error: unknown): Response {
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
