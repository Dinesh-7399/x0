-- Database Migration: Create Trainer Tables
-- Run this migration to set up trainer-service tables

-- Enable pgcrypto extension for gen_random_uuid()
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- 1. Trainers Table (Profile)
CREATE TABLE IF NOT EXISTS trainers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL UNIQUE, -- Link to identity-service user
    bio TEXT,
    specializations TEXT[], -- Array of strings e.g. ['yoga', 'hiit']
    experience_years INTEGER DEFAULT 0,
    
    -- Status
    verification_status VARCHAR(20) DEFAULT 'unverified', -- unverified, verified, suspended
    
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- 2. Certifications Table
CREATE TABLE IF NOT EXISTS certifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    trainer_id UUID REFERENCES trainers(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    issuing_organization VARCHAR(255) NOT NULL,
    issue_date DATE,
    expiry_date DATE,
    certificate_url VARCHAR(500),
    
    -- Verification
    status VARCHAR(20) DEFAULT 'pending', -- pending, verified, rejected
    verified_at TIMESTAMP,
    
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- 3. Trainer-Gym Employment Table
CREATE TABLE IF NOT EXISTS trainer_gyms (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    trainer_id UUID REFERENCES trainers(id) ON DELETE CASCADE,
    gym_id UUID NOT NULL, -- Reference to gym-service gym ID
    
    -- Employment Details
    employment_type VARCHAR(50) DEFAULT 'contract', -- full_time, part_time, contract, freelance
    status VARCHAR(20) DEFAULT 'pending', -- pending, active, terminated
    
    joined_at TIMESTAMP DEFAULT NOW(),
    ended_at TIMESTAMP,
    
    UNIQUE(trainer_id, gym_id)
);

-- 4. Availabilities Table
CREATE TABLE IF NOT EXISTS availabilities (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    trainer_id UUID REFERENCES trainers(id) ON DELETE CASCADE,
    gym_id UUID NOT NULL, -- External reference to gym-service gym ID
    
    day_of_week INTEGER NOT NULL CHECK (day_of_week BETWEEN 0 AND 6), -- 0=Sunday, 6=Saturday
    start_time TIME NOT NULL,
    end_time TIME NOT NULL,
    
    is_recurring BOOLEAN DEFAULT TRUE,
    
    created_at TIMESTAMP DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_trainers_user_id ON trainers(user_id);
CREATE INDEX IF NOT EXISTS idx_certifications_trainer_id ON certifications(trainer_id);
CREATE INDEX IF NOT EXISTS idx_trainer_gyms_trainer_id ON trainer_gyms(trainer_id);
CREATE INDEX IF NOT EXISTS idx_trainer_gyms_gym_id ON trainer_gyms(gym_id);
CREATE INDEX IF NOT EXISTS idx_availabilities_trainer_gym ON availabilities(trainer_id, gym_id);
