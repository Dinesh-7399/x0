-- Database Migration: Create Gym Tables
-- Run this migration to set up gym-service tables

-- Enable UUID extension if not exists
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Main gyms table
CREATE TABLE IF NOT EXISTS gyms (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    slug VARCHAR(100) UNIQUE NOT NULL,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    type VARCHAR(50) DEFAULT 'gym',
    
    -- Location
    address VARCHAR(500),
    city VARCHAR(100) NOT NULL,
    state VARCHAR(100),
    country VARCHAR(100) DEFAULT 'India',
    postal_code VARCHAR(20),
    latitude DECIMAL(10, 8),
    longitude DECIMAL(11, 8),
    
    -- Contact
    phone VARCHAR(20),
    email VARCHAR(255),
    website VARCHAR(255),
    
    -- Media
    logo_url VARCHAR(500),
    cover_image_url VARCHAR(500),
    
    -- Embedded JSON
    facilities JSONB DEFAULT '[]',
    operating_hours JSONB,
    
    -- Status
    status VARCHAR(20) DEFAULT 'pending',
    verified BOOLEAN DEFAULT FALSE,
    owner_id UUID NOT NULL,
    
    -- Timestamps
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    deleted_at TIMESTAMP
);

-- Gym ownership/staff table
CREATE TABLE IF NOT EXISTS gym_ownership (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    gym_id UUID REFERENCES gyms(id) ON DELETE CASCADE,
    user_id UUID NOT NULL,
    role VARCHAR(20) NOT NULL,
    permissions TEXT[],
    created_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(gym_id, user_id)
);

-- Gym equipment table
CREATE TABLE IF NOT EXISTS gym_equipment (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    gym_id UUID REFERENCES gyms(id) ON DELETE CASCADE,
    name VARCHAR(100) NOT NULL,
    category VARCHAR(50),
    brand VARCHAR(100),
    quantity INTEGER DEFAULT 1,
    condition VARCHAR(20) DEFAULT 'good'
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_gyms_city ON gyms(city);
CREATE INDEX IF NOT EXISTS idx_gyms_owner ON gyms(owner_id);
CREATE INDEX IF NOT EXISTS idx_gyms_slug ON gyms(slug);
CREATE INDEX IF NOT EXISTS idx_gyms_status ON gyms(status) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_gyms_type ON gyms(type);
CREATE INDEX IF NOT EXISTS idx_gym_ownership_gym ON gym_ownership(gym_id);
CREATE INDEX IF NOT EXISTS idx_gym_ownership_user ON gym_ownership(user_id);
CREATE INDEX IF NOT EXISTS idx_gym_equipment_gym ON gym_equipment(gym_id);
