// src/interfaces/http/controllers/AdminController.ts

import type { Context } from 'hono';
import type { IUserAdminService } from '../../../application/services/UserAdminService.js';
import { UserError } from '../../../application/errors/UserErrors.js';

export class AdminController {
  constructor(
    private readonly userAdminService: IUserAdminService,
  ) { }

  /**
   * GET /users/admin
   */
  async listUsers(c: Context): Promise<Response> {
    try {
      let page = parseInt(c.req.query('page') || '1');
      let limit = parseInt(c.req.query('limit') || '20');

      if (isNaN(page) || page < 1) page = 1;
      if (isNaN(limit) || limit < 1) limit = 20;
      if (limit > 100) limit = 100; // Cap limit

      const offset = (page - 1) * limit;

      const result = await this.userAdminService.listUsers(limit, offset);

      return c.json({
        data: result.users,
        meta: {
          total: result.total,
          page,
          limit,
          totalPages: Math.ceil(result.total / limit),
        }
      }, 200);
    } catch (error) {
      return this.handleError(c, error);
    }
  }

  /**
   * GET /users/admin/:id
   */
  async getUser(c: Context): Promise<Response> {
    try {
      const id = c.req.param('id');
      const result = await this.userAdminService.getUserDetails(id);
      return c.json(result, 200);
    } catch (error) {
      return this.handleError(c, error);
    }
  }

  /**
   * POST /users/admin/:id/ban
   */
  async banUser(c: Context): Promise<Response> {
    try {
      const id = c.req.param('id');
      await this.userAdminService.banUser(id);
      return c.json({ message: 'User banned successfully' }, 200);
    } catch (error) {
      return this.handleError(c, error);
    }
  }

  /**
   * POST /users/admin/:id/unban
   */
  async unbanUser(c: Context): Promise<Response> {
    try {
      const id = c.req.param('id');
      await this.userAdminService.unbanUser(id);
      return c.json({ message: 'User unbanned successfully' }, 200);
    } catch (error) {
      return this.handleError(c, error);
    }
  }

  private handleError(c: Context, error: unknown): Response {
    if (error instanceof UserError) {
      return c.json({
        error: error.code,
        message: error.message,
      }, error.statusCode as any);
    }
    console.error('Admin Error:', error);
    return c.json({ error: 'INTERNAL_ERROR', message: 'Internal server error' }, 500);
  }
}
