// src/domain/entities/GymVerification.ts

/**
 * Partner Verification Review
 * Partners physically visit gyms and complete this verification
 */

export type VerificationStatus =
  | 'pending'      // Waiting for partner
  | 'in_progress'  // Partner working on it
  | 'completed'    // Partner finished
  | 'ai_review'    // AI analyzing photos
  | 'final_review' // Admin final check if needed
  | 'done';        // All reviews complete

export interface VerificationChecklist {
  // Environment
  environmentClean: boolean;
  environmentSafe: boolean;
  environmentWellLit: boolean;
  environmentVentilated: boolean;

  // Equipment
  equipmentExists: boolean;       // Listed equipment actually exists
  equipmentFunctional: boolean;   // Equipment works properly
  equipmentMaintained: boolean;   // Well maintained condition
  equipmentMatchesList: boolean;  // Matches what was listed

  // Facilities
  facilitiesExist: boolean;       // Listed facilities (shower, locker, etc.)
  facilitiesClean: boolean;
  facilitiesFunctional: boolean;

  // Safety
  fireExtinguishers: boolean;
  firstAidKit: boolean;
  emergencyExits: boolean;

  // Staff & Operations
  staffPresent: boolean;
  operationalDuringHours: boolean;

  // Documentation
  businessLicenseVerified: boolean;
  insuranceVerified: boolean;
}

export interface VerificationPhoto {
  id: string;
  url: string;
  category: 'entrance' | 'equipment' | 'facilities' | 'environment' | 'safety' | 'other';
  caption?: string;
  uploadedAt: Date;

  // AI Review
  aiAnalyzed: boolean;
  aiScore?: number;           // 0-100 confidence score
  aiFlags?: string[];         // Issues detected by AI
  aiApproved?: boolean;
}

export interface GymVerificationReview {
  id: string;
  gymId: string;
  reviewerId: string;         // Partner who visited

  // Status
  status: VerificationStatus;
  assignedAt: Date;
  startedAt?: Date;
  completedAt?: Date;

  // Checklist
  checklist?: VerificationChecklist;
  checklistCompletedAt?: Date;

  // Photos (required for AI review)
  photos: VerificationPhoto[];
  photosUploadedAt?: Date;
  minPhotosRequired: number;   // Usually 5-10

  // AI Review
  aiReviewStatus: 'pending' | 'processing' | 'completed' | 'failed';
  aiOverallScore?: number;
  aiApproved?: boolean;
  aiReviewedAt?: Date;

  // Partner's Assessment
  partnerNotes?: string;
  correctionsNeeded?: string[];  // What owner needs to fix
  recommendation: 'approve' | 'reject' | 'needs_corrections';

  // Final Decision
  finalDecision?: 'approved' | 'rejected';
  finalDecisionBy?: string;      // Admin who made final call
  finalDecisionAt?: Date;
  rejectionReason?: string;
}

// Default checklist (all false initially)
export function createEmptyChecklist(): VerificationChecklist {
  return {
    environmentClean: false,
    environmentSafe: false,
    environmentWellLit: false,
    environmentVentilated: false,
    equipmentExists: false,
    equipmentFunctional: false,
    equipmentMaintained: false,
    equipmentMatchesList: false,
    facilitiesExist: false,
    facilitiesClean: false,
    facilitiesFunctional: false,
    fireExtinguishers: false,
    firstAidKit: false,
    emergencyExits: false,
    staffPresent: false,
    operationalDuringHours: false,
    businessLicenseVerified: false,
    insuranceVerified: false,
  };
}

// Check if checklist is complete enough
export function isChecklistComplete(checklist: VerificationChecklist): boolean {
  const critical = [
    checklist.environmentSafe,
    checklist.equipmentExists,
    checklist.equipmentFunctional,
    checklist.fireExtinguishers,
    checklist.emergencyExits,
  ];
  return critical.every(Boolean);
}
