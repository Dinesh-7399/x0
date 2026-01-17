// src/application/services/VerificationService.ts

import type { IGymRepository } from '../../domain/repositories/IGymRepository.js';
import type { Gym } from '../../domain/entities/Gym.js';
import type { GymVerificationReview, VerificationChecklist, VerificationPhoto } from '../../domain/entities/GymVerification.js';
import { createEmptyChecklist, isChecklistComplete } from '../../domain/entities/GymVerification.js';
import { GymNotFoundError, UnauthorizedError, ValidationError } from '../errors/GymErrors.js';
import { publish } from '../../infrastructure/messaging/publisher.js';

/**
 * VerificationService
 * Handles the gym verification queue workflow
 */
export class VerificationService {
  constructor(private readonly gymRepo: IGymRepository) { }

  // ============ OWNER ACTIONS ============

  /**
   * Submit gym for verification (owner action)
   */
  async submitForVerification(gymId: string, ownerId: string): Promise<Gym> {
    const gym = await this.gymRepo.findById(gymId);
    if (!gym) throw new GymNotFoundError(gymId);

    // Verify ownership
    const ownership = await this.gymRepo.findOwnership(gymId, ownerId);
    if (!ownership || ownership.role !== 'owner') {
      throw new UnauthorizedError('Only owners can submit for verification');
    }

    // Can only submit from draft or corrections_needed
    if (!['draft', 'corrections_needed'].includes(gym.status)) {
      throw new ValidationError(`Cannot submit gym with status: ${gym.status}`);
    }

    // Validate required fields
    this.validateForSubmission(gym);

    // Update status
    const updated = await this.gymRepo.update(gymId, {
      status: 'pending_verification',
    });

    // TODO: Also set submittedAt timestamp
    await publish('gym.submitted', { gymId, ownerId });

    return updated!;
  }

  /**
   * Apply corrections and resubmit (owner action)
   */
  async applyCorrections(gymId: string, ownerId: string, corrections: Record<string, any>): Promise<Gym> {
    const gym = await this.gymRepo.findById(gymId);
    if (!gym) throw new GymNotFoundError(gymId);

    if (gym.status !== 'corrections_needed') {
      throw new ValidationError('Gym is not in corrections_needed status');
    }

    // Verify ownership
    const ownership = await this.gymRepo.findOwnership(gymId, ownerId);
    if (!ownership || ownership.role !== 'owner') {
      throw new UnauthorizedError('Only owners can submit corrections');
    }

    // Apply corrections and resubmit
    const updated = await this.gymRepo.update(gymId, {
      ...corrections,
      status: 'pending_verification',
    });

    return updated!;
  }

  // ============ PARTNER ACTIONS ============

  /**
   * Get pending gyms in queue (partner view)
   */
  async getVerificationQueue(city?: string): Promise<Gym[]> {
    // For now using search with status filter
    // In production, would have dedicated verification queue repository
    const gyms = await this.gymRepo.search({
      city,
      limit: 50,
    });

    // Filter for pending/under_review status manually
    return gyms.filter(g =>
      g.status === 'pending_verification' ||
      g.status === 'under_review'
    );
  }

  /**
   * Assign gym to partner for review
   */
  async assignToPartner(gymId: string, partnerId: string): Promise<Gym> {
    const gym = await this.gymRepo.findById(gymId);
    if (!gym) throw new GymNotFoundError(gymId);

    if (gym.status !== 'pending_verification') {
      throw new ValidationError(`Cannot assign gym with status: ${gym.status}`);
    }

    const updated = await this.gymRepo.update(gymId, {
      status: 'under_review',
    });

    // TODO: Store reviewerId and reviewStartedAt
    await publish('gym.assigned', { gymId, partnerId });

    return updated!;
  }

  /**
   * Partner submits their review
   */
  async submitPartnerReview(
    gymId: string,
    partnerId: string,
    review: {
      checklist: VerificationChecklist;
      photos: { url: string; category: string; caption?: string }[];
      notes: string;
      recommendation: 'approve' | 'reject' | 'needs_corrections';
      correctionsNeeded?: string[];
      rejectionReason?: string;
    }
  ): Promise<Gym> {
    const gym = await this.gymRepo.findById(gymId);
    if (!gym) throw new GymNotFoundError(gymId);

    if (gym.status !== 'under_review') {
      throw new ValidationError('Gym is not under review');
    }

    // Validate minimum photos
    if (review.photos.length < 5) {
      throw new ValidationError('Minimum 5 photos required for verification');
    }

    // Validate critical checklist items
    if (!isChecklistComplete(review.checklist)) {
      throw new ValidationError('Critical checklist items not verified');
    }

    // Based on recommendation, update gym status
    let newStatus: string;
    if (review.recommendation === 'approve') {
      newStatus = 'approved';
    } else if (review.recommendation === 'needs_corrections') {
      newStatus = 'corrections_needed';
    } else {
      newStatus = 'rejected';
    }

    const updated = await this.gymRepo.update(gymId, {
      status: newStatus,
      verified: review.recommendation === 'approve',
    });

    // Publish for AI review of photos
    await publish('gym.review.completed', {
      gymId,
      partnerId,
      recommendation: review.recommendation,
      photoUrls: review.photos.map(p => p.url),
    });

    return updated!;
  }

  // ============ HELPERS ============

  private validateForSubmission(gym: Gym): void {
    const errors: string[] = [];

    if (!gym.name || gym.name.length < 3) errors.push('Name is required');
    if (!gym.city) errors.push('City is required');
    if (!gym.address) errors.push('Address is required');
    if (!gym.phone && !gym.email) errors.push('At least phone or email required');

    if (errors.length > 0) {
      throw new ValidationError(`Missing required fields: ${errors.join(', ')}`);
    }
  }
}
