// src/interfaces/http/controllers/SessionController.ts

import type { Context } from 'hono';
import type { ISessionService } from '../../../application/services/SessionService.js';
import type { IJwtService } from '../../../application/services/interfaces.js';
import { AuthError } from '../../../application/errors/AuthErrors.js';

/**
 * SessionController
 * 
 * Handles HTTP concerns for session management.
 * Single Responsibility: HTTP request/response handling only.
 */
export class SessionController {
  constructor(
    private readonly sessionService: ISessionService,
    private readonly jwtService: IJwtService,
  ) { }

  /**
   * GET /auth/sessions - List active sessions
   */
  async listSessions(c: Context): Promise<Response> {
    try {
      const userId = await this.getAuthenticatedUserId(c);
      if (!userId) {
        return c.json({ error: 'UNAUTHORIZED', message: 'Valid access token required' }, 401);
      }

      // Get current token to mark current session
      const currentToken = c.req.header('X-Refresh-Token');

      const sessions = await this.sessionService.listSessions(userId, currentToken);

      return c.json({
        sessions,
        total: sessions.length,
      }, 200);
    } catch (error) {
      return this.handleError(c, error);
    }
  }

  /**
   * DELETE /auth/sessions/:id - Revoke specific session
   */
  async revokeSession(c: Context): Promise<Response> {
    try {
      const userId = await this.getAuthenticatedUserId(c);
      if (!userId) {
        return c.json({ error: 'UNAUTHORIZED', message: 'Valid access token required' }, 401);
      }

      const sessionId = c.req.param('id');
      if (!sessionId) {
        return c.json({ error: 'BAD_REQUEST', message: 'Session ID required' }, 400);
      }

      const result = await this.sessionService.revokeSession(userId, sessionId);

      return c.json(result, 200);
    } catch (error) {
      return this.handleError(c, error);
    }
  }

  /**
   * POST /auth/sessions/revoke-others - Revoke all sessions except current
   */
  async revokeOtherSessions(c: Context): Promise<Response> {
    try {
      const userId = await this.getAuthenticatedUserId(c);
      if (!userId) {
        return c.json({ error: 'UNAUTHORIZED', message: 'Valid access token required' }, 401);
      }

      // Get current refresh token to preserve it
      const body = await c.req.json().catch(() => ({}));
      const currentToken = body.currentRefreshToken;

      const result = await this.sessionService.revokeAllSessions(userId, currentToken);

      return c.json(result, 200);
    } catch (error) {
      return this.handleError(c, error);
    }
  }

  /**
   * GET /auth/sessions/count - Get session count
   */
  async getSessionCount(c: Context): Promise<Response> {
    try {
      const userId = await this.getAuthenticatedUserId(c);
      if (!userId) {
        return c.json({ error: 'UNAUTHORIZED', message: 'Valid access token required' }, 401);
      }

      const count = await this.sessionService.getSessionCount(userId);

      return c.json({ activeSessions: count }, 200);
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
      }, 400);
    }

    console.error('Unhandled error:', error);
    throw error;
  }
}
