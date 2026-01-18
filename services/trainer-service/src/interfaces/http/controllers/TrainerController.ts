import { Context } from 'hono';
import { container } from '../../../infrastructure/container.js';
import { CreateProfileSchema, UpdateProfileSchema, AddCertSchema, EmploymentRequestSchema } from '../validation/schemas.js';

export class TrainerController {

  // Profile
  async createProfile(c: Context) {
    const userId = c.req.header('x-user-id');
    if (!userId) return c.json({ error: 'Unauthorized' }, 401);

    const body = CreateProfileSchema.parse(await c.req.json());
    const trainer = await container.trainerService.createProfile(userId, body);
    return c.json(trainer, 201);
  }

  async getProfile(c: Context) {
    const id = c.req.param('id');
    const trainer = await container.trainerService.getProfile(id);
    return c.json(trainer);
  }

  async getMyProfile(c: Context) {
    const userId = c.req.header('x-user-id');
    if (!userId) return c.json({ error: 'Unauthorized' }, 401);

    const trainer = await container.trainerService.getProfileByUserId(userId);
    return c.json(trainer);
  }

  async updateProfile(c: Context) {
    const userId = c.req.header('x-user-id');
    if (!userId) return c.json({ error: 'Unauthorized' }, 401);

    const body = UpdateProfileSchema.parse(await c.req.json());
    const trainer = await container.trainerService.updateProfile(userId, body);
    return c.json(trainer);
  }

  // Certifications
  async addCertification(c: Context) {
    const userId = c.req.header('x-user-id');
    if (!userId) return c.json({ error: 'Unauthorized' }, 401);

    // Resolve trainer ID from user ID
    const trainer = await container.trainerService.getProfileByUserId(userId);

    const body = AddCertSchema.parse(await c.req.json());
    const cert = await container.certificationService.addCertification(trainer.id, body);
    return c.json(cert, 201);
  }

  async getCertifications(c: Context) {
    const id = c.req.param('id');
    const certs = await container.certificationService.getCertifications(id);
    return c.json({ certifications: certs });
  }

  // Employment
  async requestEmployment(c: Context) {
    const userId = c.req.header('x-user-id');
    if (!userId) return c.json({ error: 'Unauthorized' }, 401);

    const trainer = await container.trainerService.getProfileByUserId(userId);
    const body = EmploymentRequestSchema.parse(await c.req.json());

    // Cast string 'type' to enum
    const employment = await container.employmentService.requestToJoinGym(trainer.id, body.gymId, body.type as any);
    return c.json(employment, 201);
  }

  async getEmployments(c: Context) {
    const id = c.req.param('id');
    const employments = await container.employmentService.getEmployments(id);
    return c.json({ employments });
  }
}
