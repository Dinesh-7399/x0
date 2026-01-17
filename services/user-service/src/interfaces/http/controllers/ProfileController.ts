// src/interfaces/http/controllers/ProfileController.ts

import type { Context } from 'hono';
import { z } from 'zod';
import type { IUserProfileService } from '../../../application/services/UserProfileService.js';
import { UpdateProfileSchema } from '../../../application/dtos/user.dto.js';
import { UserError } from '../../../application/errors/UserErrors.js';

const CreateProfileSchema = z.object({
  firstName: z.string().min(1),
  lastName: z.string().min(1),
});

export class ProfileController {
  constructor(
    private readonly userProfileService: IUserProfileService,
  ) { }

  /**
   * GET /users/me
   */
  async getMyProfile(c: Context): Promise<Response> {
    try {
      const user = c.get('user');
      const result = await this.userProfileService.getProfile(user.sub);
      return c.json(result, 200);
    } catch (error) {
      return this.handleError(c, error);
    }
  }

  /**
   * PUT /users/me
   */
  async updateMyProfile(c: Context): Promise<Response> {
    try {
      const user = c.get('user');
      const body = await c.req.json();

      const data = UpdateProfileSchema.parse(body);
      const result = await this.userProfileService.updateProfile(user.sub, data);

      return c.json(result, 200);
    } catch (error) {
      return this.handleError(c, error);
    }
  }

  /**
   * POST /users/me (Create profile if missing)
   */
  async createMyProfile(c: Context): Promise<Response> {
    try {
      const user = c.get('user');
      const body = await c.req.json();

      const data = CreateProfileSchema.parse(body);
      const result = await this.userProfileService.createProfile(user.sub, data);

      return c.json(result, 201);
    } catch (error) {
      return this.handleError(c, error);
    }
  }

  /**
   * GET /users/:id (Public profile)
   * Note: This might need different serialization (hide phone, location based on visibility settings)
   * For now returning full profile
   */
  async getUserProfile(c: Context): Promise<Response> {
    try {
      const id = c.req.param('id');
      // For findById we might need a method that searches by profileId OR userId? 
      // The path says /users/:id, implying userId.
      // Our service has getProfile(userId).

      const result = await this.userProfileService.getProfile(id);

      // Strip sensitive PII for public view
      const publicProfile = {
        id: result.id,
        firstName: result.firstName,
        lastName: result.lastName,
        bio: result.bio,
        avatarUrl: result.avatarUrl,
        location: result.location, // Location is usually public, but can be debatable
        createdAt: result.createdAt,
        // Exclude: email, phoneNumber, userId (internal), updatedAt
      };

      return c.json(publicProfile, 200);
    } catch (error) {
      return this.handleError(c, error);
    }
  }

  private handleError(c: Context, error: unknown): Response {
    if (error instanceof z.ZodError) {
      return c.json({
        error: 'VALIDATION_ERROR',
        message: 'Invalid request data',
        details: error.issues,
      }, 400);
    }

    if (error instanceof UserError) {
      return c.json({
        error: error.code,
        message: error.message,
      }, error.statusCode as any);
    }

    console.error('Unhandled error:', error);
    return c.json({ error: 'INTERNAL_ERROR', message: 'Internal server error' }, 500);
  }
}
