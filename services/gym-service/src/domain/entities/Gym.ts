// src/domain/entities/Gym.ts

export type GymType = 'gym' | 'yoga' | 'crossfit' | 'martial_arts' | 'studio' | 'other';

// Verification workflow statuses
export type GymStatus =
  | 'draft'              // Owner just created, not yet submitted
  | 'pending_verification' // Submitted, waiting for partner assignment
  | 'under_review'       // Partner assigned, reviewing in progress
  | 'corrections_needed' // Partner found issues, owner needs to fix
  | 'approved'           // Verified and live
  | 'rejected'           // Rejected, not eligible
  | 'suspended';         // Was approved, now suspended

export type StaffRole = 'owner' | 'manager' | 'staff';

export interface OperatingHours {
  monday?: { open: string; close: string } | null;
  tuesday?: { open: string; close: string } | null;
  wednesday?: { open: string; close: string } | null;
  thursday?: { open: string; close: string } | null;
  friday?: { open: string; close: string } | null;
  saturday?: { open: string; close: string } | null;
  sunday?: { open: string; close: string } | null;
}

export interface Gym {
  id: string;
  slug: string;
  name: string;
  description?: string;
  type: GymType;

  // Location
  address?: string;
  city: string;
  state?: string;
  country: string;
  postalCode?: string;
  latitude?: number;
  longitude?: number;

  // Contact
  phone?: string;
  email?: string;
  website?: string;

  // Media
  logoUrl?: string;
  coverImageUrl?: string;

  // Embedded data
  facilities: string[];
  operatingHours?: OperatingHours;

  // Status & Verification
  status: GymStatus;
  verified: boolean;
  ownerId: string;

  // Verification workflow
  reviewerId?: string;          // Partner assigned to review
  reviewNotes?: string;         // Partner's internal notes
  rejectionReason?: string;     // Why rejected (shown to owner)
  submittedAt?: Date;           // When owner submitted for review
  reviewStartedAt?: Date;       // When partner started review
  verifiedAt?: Date;            // When partner approved

  // Timestamps
  createdAt: Date;
  updatedAt: Date;
  deletedAt?: Date;
}

export interface GymOwnership {
  id: string;
  gymId: string;
  userId: string;
  role: StaffRole;
  permissions: string[];
  createdAt: Date;
}

export interface GymEquipment {
  id: string;
  gymId: string;
  name: string;
  category?: string;
  brand?: string;
  quantity: number;
  condition: 'new' | 'good' | 'fair' | 'poor';
}
