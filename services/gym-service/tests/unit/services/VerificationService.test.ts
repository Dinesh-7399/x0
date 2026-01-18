// tests/unit/services/VerificationService.test.ts
// Unit tests for VerificationService

import { describe, it, expect, beforeEach, mock } from 'bun:test';
import { VerificationService } from '../../../src/application/services/VerificationService.js';
import { GymNotFoundError, ValidationError, UnauthorizedError } from '../../../src/application/errors/GymErrors.js';

const createMockGymRepository = () => ({
  findById: mock(() => Promise.resolve(null)),
  findOwnership: mock(() => Promise.resolve(null)),
  update: mock(() => Promise.resolve(null)),
  search: mock(() => Promise.resolve([])),
});

describe('VerificationService', () => {
  let verificationService: VerificationService;
  let gymRepo: ReturnType<typeof createMockGymRepository>;

  beforeEach(() => {
    gymRepo = createMockGymRepository();
    verificationService = new VerificationService(gymRepo as any);
  });

  describe('submitForVerification', () => {
    const draftGym = {
      id: 'gym-123',
      name: 'Test Gym',
      status: 'draft',
      city: 'Mumbai',
      address: '123 Main St',
      phone: '9876543210',
    };

    it('should submit draft gym for verification', async () => {
      gymRepo.findById.mockReturnValue(Promise.resolve(draftGym as any));
      gymRepo.findOwnership.mockReturnValue(Promise.resolve({ role: 'owner' } as any));
      gymRepo.update.mockReturnValue(Promise.resolve({ ...draftGym, status: 'pending_verification' } as any));

      const result = await verificationService.submitForVerification('gym-123', 'owner-123');

      expect(result.status).toBe('pending_verification');
      expect(gymRepo.update).toHaveBeenCalled();
    });

    it('should reject if not owner', async () => {
      gymRepo.findById.mockReturnValue(Promise.resolve(draftGym as any));
      gymRepo.findOwnership.mockReturnValue(Promise.resolve({ role: 'staff' } as any));

      await expect(verificationService.submitForVerification('gym-123', 'staff-123'))
        .rejects.toThrow(UnauthorizedError);
    });

    it('should reject if gym not in draft status', async () => {
      const approvedGym = { ...draftGym, status: 'approved' };
      gymRepo.findById.mockReturnValue(Promise.resolve(approvedGym as any));
      gymRepo.findOwnership.mockReturnValue(Promise.resolve({ role: 'owner' } as any));

      await expect(verificationService.submitForVerification('gym-123', 'owner-123'))
        .rejects.toThrow(ValidationError);
    });

    it('should reject if missing required fields', async () => {
      const incompleteGym = { id: 'gym-123', name: 'X', status: 'draft', city: 'Mumbai' }; // No address/phone
      gymRepo.findById.mockReturnValue(Promise.resolve(incompleteGym as any));
      gymRepo.findOwnership.mockReturnValue(Promise.resolve({ role: 'owner' } as any));

      await expect(verificationService.submitForVerification('gym-123', 'owner-123'))
        .rejects.toThrow(ValidationError);
    });
  });

  describe('getVerificationQueue', () => {
    it('should return pending gyms', async () => {
      const pendingGyms = [
        { id: 'gym-1', status: 'pending_verification' },
        { id: 'gym-2', status: 'under_review' },
        { id: 'gym-3', status: 'approved' }, // Should be filtered out
      ];
      gymRepo.search.mockReturnValue(Promise.resolve(pendingGyms as any));

      const queue = await verificationService.getVerificationQueue();

      expect(queue).toHaveLength(2);
      expect(queue.every(g => ['pending_verification', 'under_review'].includes(g.status))).toBe(true);
    });

    it('should filter by city', async () => {
      const mumbaiGyms = [{ id: 'gym-1', status: 'pending_verification', city: 'Mumbai' }];
      gymRepo.search.mockReturnValue(Promise.resolve(mumbaiGyms as any));

      const queue = await verificationService.getVerificationQueue('Mumbai');

      expect(gymRepo.search).toHaveBeenCalledWith(expect.objectContaining({ city: 'Mumbai' }));
    });
  });

  describe('assignToPartner', () => {
    it('should assign pending gym to partner', async () => {
      const pendingGym = { id: 'gym-123', status: 'pending_verification' };
      gymRepo.findById.mockReturnValue(Promise.resolve(pendingGym as any));
      gymRepo.update.mockReturnValue(Promise.resolve({ ...pendingGym, status: 'under_review' } as any));

      const result = await verificationService.assignToPartner('gym-123', 'partner-123');

      expect(result.status).toBe('under_review');
    });

    it('should reject if gym not pending', async () => {
      const draftGym = { id: 'gym-123', status: 'draft' };
      gymRepo.findById.mockReturnValue(Promise.resolve(draftGym as any));

      await expect(verificationService.assignToPartner('gym-123', 'partner-123'))
        .rejects.toThrow(ValidationError);
    });
  });

  describe('submitPartnerReview', () => {
    const underReviewGym = { id: 'gym-123', status: 'under_review' };

    const validReview = {
      checklist: {
        environmentClean: true,
        environmentSafe: true,
        environmentWellLit: true,
        environmentVentilated: true,
        equipmentExists: true,
        equipmentFunctional: true,
        equipmentMaintained: true,
        equipmentMatchesList: true,
        facilitiesExist: true,
        facilitiesClean: true,
        facilitiesFunctional: true,
        fireExtinguishers: true,
        firstAidKit: true,
        emergencyExits: true,
        staffPresent: true,
        operationalDuringHours: true,
        businessLicenseVerified: true,
        insuranceVerified: true,
      },
      photos: [
        { url: 'https://example.com/1.jpg', category: 'entrance' },
        { url: 'https://example.com/2.jpg', category: 'equipment' },
        { url: 'https://example.com/3.jpg', category: 'facilities' },
        { url: 'https://example.com/4.jpg', category: 'environment' },
        { url: 'https://example.com/5.jpg', category: 'safety' },
      ],
      notes: 'All looks good',
      recommendation: 'approve' as const,
    };

    it('should approve gym with valid review', async () => {
      gymRepo.findById.mockReturnValue(Promise.resolve(underReviewGym as any));
      gymRepo.update.mockReturnValue(Promise.resolve({ ...underReviewGym, status: 'approved', verified: true } as any));

      const result = await verificationService.submitPartnerReview('gym-123', 'partner-123', validReview);

      expect(result.status).toBe('approved');
      expect(result.verified).toBe(true);
    });

    it('should reject if less than 5 photos', async () => {
      gymRepo.findById.mockReturnValue(Promise.resolve(underReviewGym as any));

      const invalidReview = { ...validReview, photos: [{ url: 'https://example.com/1.jpg', category: 'entrance' }] };

      await expect(verificationService.submitPartnerReview('gym-123', 'partner-123', invalidReview))
        .rejects.toThrow(ValidationError);
    });

    it('should set corrections_needed status', async () => {
      gymRepo.findById.mockReturnValue(Promise.resolve(underReviewGym as any));
      gymRepo.update.mockReturnValue(Promise.resolve({ ...underReviewGym, status: 'corrections_needed' } as any));

      const correctionReview = {
        ...validReview,
        recommendation: 'needs_corrections' as const,
        correctionsNeeded: ['Update address', 'Add phone number'],
      };

      const result = await verificationService.submitPartnerReview('gym-123', 'partner-123', correctionReview);

      expect(result.status).toBe('corrections_needed');
    });
  });
});
