import { Context } from 'hono';
import { container } from '../../../infrastructure/container.js';
import { SetAvailabilitySchema } from '../validation/schemas.js';

export class ScheduleController {

  async setAvailability(c: Context) {
    const userId = c.req.header('x-user-id');
    if (!userId) return c.json({ error: 'Unauthorized' }, 401);

    const trainer = await container.trainerService.getProfileByUserId(userId);
    const body = SetAvailabilitySchema.parse(await c.req.json());

    const availability = await container.schedulingService.setAvailability(trainer.id, body);
    return c.json(availability, 201);
  }

  async getAvailability(c: Context) {
    const trainerId = c.req.param('trainerId');
    const gymId = c.req.query('gymId');

    const availability = await container.schedulingService.getAvailability(trainerId, gymId);
    return c.json({ availability });
  }

  async clearDay(c: Context) {
    const userId = c.req.header('x-user-id');
    if (!userId) return c.json({ error: 'Unauthorized' }, 401);

    const trainer = await container.trainerService.getProfileByUserId(userId);
    const gymId = c.req.query('gymId');
    const day = c.req.query('day');

    if (!gymId) return c.json({ error: 'Gym ID required' }, 400);

    await container.schedulingService.clearDay(trainer.id, gymId, day ? parseInt(day) : undefined as any);
    return c.json({ message: 'Availability cleared' });
  }
}
