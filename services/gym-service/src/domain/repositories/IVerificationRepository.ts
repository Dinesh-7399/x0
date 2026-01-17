// src/domain/repositories/IVerificationRepository.ts

import type { GymVerificationReview, VerificationChecklist, VerificationPhoto } from '../entities/GymVerification.js';

export interface CreateVerificationReviewData {
  gymId: string;
  reviewerId: string;
  minPhotosRequired?: number;
}

export interface IVerificationRepository {
  // Review CRUD
  create(data: CreateVerificationReviewData): Promise<GymVerificationReview>;
  findById(id: string): Promise<GymVerificationReview | null>;
  findByGymId(gymId: string): Promise<GymVerificationReview | null>;
  findByReviewerId(reviewerId: string): Promise<GymVerificationReview[]>;

  // Queue
  findPendingReviews(limit?: number): Promise<GymVerificationReview[]>;
  findReviewsByStatus(status: string, limit?: number): Promise<GymVerificationReview[]>;

  // Update
  updateStatus(id: string, status: string): Promise<GymVerificationReview | null>;
  updateChecklist(id: string, checklist: VerificationChecklist): Promise<GymVerificationReview | null>;
  updateRecommendation(id: string, recommendation: string, notes?: string, corrections?: string[]): Promise<GymVerificationReview | null>;

  // Photos
  addPhoto(reviewId: string, photo: Omit<VerificationPhoto, 'id'>): Promise<VerificationPhoto>;
  updatePhotoAiReview(photoId: string, aiScore: number, aiFlags: string[], aiApproved: boolean): Promise<void>;

  // AI Review
  updateAiReview(reviewId: string, score: number, approved: boolean): Promise<void>;

  // Final Decision
  setFinalDecision(reviewId: string, decision: 'approved' | 'rejected', decidedBy: string, reason?: string): Promise<void>;
}
