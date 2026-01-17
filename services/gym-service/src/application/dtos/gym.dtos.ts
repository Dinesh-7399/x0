// src/application/dtos/gym.dtos.ts

import type { Gym, GymType, GymStatus, OperatingHours, GymOwnership, GymEquipment } from '../../domain/entities/Gym.js';

// ============ INPUT DTOs ============

export interface CreateGymDto {
  name: string;
  description?: string;
  type?: GymType;
  address?: string;
  city: string;
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
  operatingHours?: OperatingHours;
}

export interface UpdateGymDto {
  name?: string;
  description?: string;
  type?: GymType;
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
  operatingHours?: OperatingHours;
}

export interface SearchGymsDto {
  city?: string;
  type?: GymType;
  query?: string;
  verified?: boolean;
  page?: number;
  limit?: number;
}

export interface AddStaffDto {
  userId: string;
  role: 'manager' | 'staff';
  permissions?: string[];
}

export interface AddEquipmentDto {
  name: string;
  category?: string;
  brand?: string;
  quantity?: number;
  condition?: 'new' | 'good' | 'fair' | 'poor';
}

// ============ OUTPUT DTOs ============

export interface GymResponseDto {
  id: string;
  slug: string;
  name: string;
  description?: string;
  type: GymType;
  address?: string;
  city: string;
  state?: string;
  country: string;
  postalCode?: string;
  location?: { latitude: number; longitude: number };
  phone?: string;
  email?: string;
  website?: string;
  logoUrl?: string;
  coverImageUrl?: string;
  facilities: string[];
  operatingHours?: OperatingHours;
  status: GymStatus;
  verified: boolean;
  createdAt: string;
}

export interface GymListResponseDto {
  gyms: GymResponseDto[];
  total?: number;
  page?: number;
  limit?: number;
}

// ============ MAPPERS ============

export function toGymResponse(gym: Gym): GymResponseDto {
  return {
    id: gym.id,
    slug: gym.slug,
    name: gym.name,
    description: gym.description,
    type: gym.type,
    address: gym.address,
    city: gym.city,
    state: gym.state,
    country: gym.country,
    postalCode: gym.postalCode,
    location: gym.latitude && gym.longitude
      ? { latitude: gym.latitude, longitude: gym.longitude }
      : undefined,
    phone: gym.phone,
    email: gym.email,
    website: gym.website,
    logoUrl: gym.logoUrl,
    coverImageUrl: gym.coverImageUrl,
    facilities: gym.facilities,
    operatingHours: gym.operatingHours,
    status: gym.status,
    verified: gym.verified,
    createdAt: gym.createdAt.toISOString(),
  };
}
