// src/domain/events/GymEvents.ts

export const GymEventTypes = {
  GYM_CREATED: 'gym.created',
  GYM_UPDATED: 'gym.updated',
  GYM_DELETED: 'gym.deleted',
  GYM_VERIFIED: 'gym.verified',
  STAFF_ADDED: 'gym.staff.added',
  STAFF_REMOVED: 'gym.staff.removed',
  STAFF_UPDATED: 'gym.staff.updated',
} as const;

export interface GymCreatedEvent {
  gymId: string;
  ownerId: string;
  name: string;
  type: string;
  city: string;
  timestamp: Date;
}

export interface GymUpdatedEvent {
  gymId: string;
  changes: string[];
  timestamp: Date;
}

export interface GymVerifiedEvent {
  gymId: string;
  ownerId: string;
  timestamp: Date;
}

export interface StaffAddedEvent {
  gymId: string;
  userId: string;
  role: string;
  addedBy: string;
  timestamp: Date;
}

export interface StaffRemovedEvent {
  gymId: string;
  userId: string;
  removedBy: string;
  timestamp: Date;
}
