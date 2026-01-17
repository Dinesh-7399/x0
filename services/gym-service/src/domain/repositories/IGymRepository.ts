// src/domain/repositories/IGymRepository.ts

import type { Gym, GymOwnership, GymEquipment } from '../entities/Gym.js';

export interface CreateGymData {
  slug: string;
  name: string;
  description?: string;
  type: string;
  address?: string;
  city: string;
  state?: string;
  country: string;
  postalCode?: string;
  latitude?: number;
  longitude?: number;
  phone?: string;
  email?: string;
  website?: string;
  logoUrl?: string;
  coverImageUrl?: string;
  facilities?: string[];
  operatingHours?: any;
  ownerId: string;
}

export interface UpdateGymData {
  name?: string;
  description?: string;
  type?: string;
  address?: string;
  city?: string;
  state?: string;
  country?: string;
  postalCode?: string;
  latitude?: number;
  longitude?: number;
  phone?: string;
  email?: string;
  website?: string;
  logoUrl?: string;
  coverImageUrl?: string;
  facilities?: string[];
  operatingHours?: any;
  status?: string;
  verified?: boolean;
}

export interface SearchGymsParams {
  city?: string;
  type?: string;
  query?: string;
  verified?: boolean;
  limit?: number;
  offset?: number;
}

export interface IGymRepository {
  // Gym CRUD
  create(data: CreateGymData): Promise<Gym>;
  findById(id: string): Promise<Gym | null>;
  findBySlug(slug: string): Promise<Gym | null>;
  findByOwnerId(ownerId: string): Promise<Gym[]>;
  update(id: string, data: UpdateGymData): Promise<Gym | null>;
  softDelete(id: string): Promise<boolean>;

  // Search
  search(params: SearchGymsParams): Promise<Gym[]>;

  // Ownership
  addOwnership(gymId: string, userId: string, role: string, permissions?: string[]): Promise<GymOwnership>;
  findOwnership(gymId: string, userId: string): Promise<GymOwnership | null>;
  findOwnershipsByGym(gymId: string): Promise<GymOwnership[]>;
  updateOwnership(gymId: string, userId: string, role: string, permissions?: string[]): Promise<GymOwnership | null>;
  removeOwnership(gymId: string, userId: string): Promise<boolean>;

  // Equipment
  addEquipment(gymId: string, data: Omit<GymEquipment, 'id' | 'gymId'>): Promise<GymEquipment>;
  findEquipmentByGym(gymId: string): Promise<GymEquipment[]>;
  updateEquipment(id: string, data: Partial<GymEquipment>): Promise<GymEquipment | null>;
  removeEquipment(id: string): Promise<boolean>;
}
