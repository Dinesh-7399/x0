-- Database Migration: Add Verification Tables
-- Run this after 001_create_gym_tables.sql

-- Add verification fields to gyms table
ALTER TABLE gyms ADD COLUMN IF NOT EXISTS reviewer_id UUID;
ALTER TABLE gyms ADD COLUMN IF NOT EXISTS review_notes TEXT;
ALTER TABLE gyms ADD COLUMN IF NOT EXISTS rejection_reason TEXT;
ALTER TABLE gyms ADD COLUMN IF NOT EXISTS submitted_at TIMESTAMP;
ALTER TABLE gyms ADD COLUMN IF NOT EXISTS review_started_at TIMESTAMP;
ALTER TABLE gyms ADD COLUMN IF NOT EXISTS verified_at TIMESTAMP;

-- Update status enum values
-- Note: In production, use proper enum migration
-- For now, status is VARCHAR and accepts new values

-- Verification Reviews Table
CREATE TABLE IF NOT EXISTS gym_verification_reviews (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    gym_id UUID REFERENCES gyms(id) ON DELETE CASCADE,
    reviewer_id UUID NOT NULL,
    
    -- Status
    status VARCHAR(30) DEFAULT 'pending',
    assigned_at TIMESTAMP DEFAULT NOW(),
    started_at TIMESTAMP,
    completed_at TIMESTAMP,
    
    -- Checklist (stored as JSONB)
    checklist JSONB,
    checklist_completed_at TIMESTAMP,
    
    -- Photos tracking
    photos_uploaded_at TIMESTAMP,
    min_photos_required INTEGER DEFAULT 5,
    
    -- AI Review
    ai_review_status VARCHAR(20) DEFAULT 'pending',
    ai_overall_score DECIMAL(5,2),
    ai_approved BOOLEAN,
    ai_reviewed_at TIMESTAMP,
    
    -- Partner Assessment
    partner_notes TEXT,
    corrections_needed TEXT[],
    recommendation VARCHAR(30),
    
    -- Final Decision
    final_decision VARCHAR(20),
    final_decision_by UUID,
    final_decision_at TIMESTAMP,
    rejection_reason TEXT,
    
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Verification Photos Table
CREATE TABLE IF NOT EXISTS gym_verification_photos (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    review_id UUID REFERENCES gym_verification_reviews(id) ON DELETE CASCADE,
    url VARCHAR(500) NOT NULL,
    category VARCHAR(30) NOT NULL,
    caption TEXT,
    uploaded_at TIMESTAMP DEFAULT NOW(),
    
    -- AI Analysis
    ai_analyzed BOOLEAN DEFAULT FALSE,
    ai_score DECIMAL(5,2),
    ai_flags TEXT[],
    ai_approved BOOLEAN
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_verification_reviews_gym ON gym_verification_reviews(gym_id);
CREATE INDEX IF NOT EXISTS idx_verification_reviews_reviewer ON gym_verification_reviews(reviewer_id);
CREATE INDEX IF NOT EXISTS idx_verification_reviews_status ON gym_verification_reviews(status);
CREATE INDEX IF NOT EXISTS idx_verification_photos_review ON gym_verification_photos(review_id);
CREATE INDEX IF NOT EXISTS idx_gyms_status_approved ON gyms(status) WHERE status = 'approved';
