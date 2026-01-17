// src/interfaces/http/controllers/VerificationController.ts

import type { Context } from 'hono';
import type { VerificationService } from '../../../application/services/VerificationService.js';
import { toGymResponse } from '../../../application/dtos/gym.dtos.js';
import { z } from 'zod';

// Validation schemas
const SubmitReviewSchema = z.object({
  checklist: z.object({
    environmentClean: z.boolean(),
    environmentSafe: z.boolean(),
    environmentWellLit: z.boolean(),
    environmentVentilated: z.boolean(),
    equipmentExists: z.boolean(),
    equipmentFunctional: z.boolean(),
    equipmentMaintained: z.boolean(),
    equipmentMatchesList: z.boolean(),
    facilitiesExist: z.boolean(),
    facilitiesClean: z.boolean(),
    facilitiesFunctional: z.boolean(),
    fireExtinguishers: z.boolean(),
    firstAidKit: z.boolean(),
    emergencyExits: z.boolean(),
    staffPresent: z.boolean(),
    operationalDuringHours: z.boolean(),
    businessLicenseVerified: z.boolean(),
    insuranceVerified: z.boolean(),
  }),
  photos: z.array(z.object({
    url: z.string().url(),
    category: z.enum(['entrance', 'equipment', 'facilities', 'environment', 'safety', 'other']),
    caption: z.string().optional(),
  })).min(5, 'Minimum 5 photos required'),
  notes: z.string(),
  recommendation: z.enum(['approve', 'reject', 'needs_corrections']),
  correctionsNeeded: z.array(z.string()).optional(),
  rejectionReason: z.string().optional(),
});

export class VerificationController {
  constructor(private readonly verificationService: VerificationService) { }

  // ============ OWNER ENDPOINTS ============

  /**
   * POST /gyms/:gymId/submit
   * Owner submits gym for verification
   */
  async submitForVerification(c: Context): Promise<Response> {
    const gymId = c.req.param('gymId');
    const userId = this.getUserId(c);

    const gym = await this.verificationService.submitForVerification(gymId, userId);
    return c.json({
      message: 'Gym submitted for verification',
      gym: toGymResponse(gym),
    });
  }

  /**
   * POST /gyms/:gymId/corrections
   * Owner applies corrections and resubmits
   */
  async applyCorrections(c: Context): Promise<Response> {
    const gymId = c.req.param('gymId');
    const userId = this.getUserId(c);
    const corrections = await c.req.json();

    const gym = await this.verificationService.applyCorrections(gymId, userId, corrections);
    return c.json({
      message: 'Corrections applied and resubmitted',
      gym: toGymResponse(gym),
    });
  }

  // ============ PARTNER ENDPOINTS ============

  /**
   * GET /verification/queue
   * Get pending gyms awaiting verification
   */
  async getQueue(c: Context): Promise<Response> {
    const city = c.req.query('city');
    const gyms = await this.verificationService.getVerificationQueue(city);

    return c.json({
      queue: gyms.map(toGymResponse),
      count: gyms.length,
    });
  }

  /**
   * POST /verification/:gymId/assign
   * Partner claims a gym for review
   */
  async assignToSelf(c: Context): Promise<Response> {
    const gymId = c.req.param('gymId');
    const partnerId = this.getUserId(c);

    const gym = await this.verificationService.assignToPartner(gymId, partnerId);
    return c.json({
      message: 'Gym assigned for review',
      gym: toGymResponse(gym),
    });
  }

  /**
   * POST /verification/:gymId/review
   * Partner submits their verification review
   */
  async submitReview(c: Context): Promise<Response> {
    const gymId = c.req.param('gymId');
    const partnerId = this.getUserId(c);
    const body = SubmitReviewSchema.parse(await c.req.json());

    const gym = await this.verificationService.submitPartnerReview(gymId, partnerId, body);

    return c.json({
      message: `Gym verification ${body.recommendation === 'approve' ? 'approved' : body.recommendation}`,
      gym: toGymResponse(gym),
    });
  }

  // ============ HELPERS ============

  private getUserId(c: Context): string {
    const userId = c.req.header('x-user-id');
    if (!userId) throw new Error('User ID not found');
    return userId;
  }
}
