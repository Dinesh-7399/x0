-- Database Migration: Create Attendance Service Tables
-- migrations/001_initial_schema.sql

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ============================================
-- 1. ATTENDANCE TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS attendance (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    member_id UUID NOT NULL,
    gym_id UUID NOT NULL,
    membership_id UUID NOT NULL,
    
    check_in_time TIMESTAMP NOT NULL,
    check_in_method VARCHAR(20) NOT NULL,
    check_in_device_id VARCHAR(100),
    check_in_staff_id UUID,
    
    check_out_time TIMESTAMP,
    check_out_method VARCHAR(20),
    check_out_device_id VARCHAR(100),
    
    duration_minutes INTEGER,
    
    notes TEXT,
    is_valid BOOLEAN DEFAULT TRUE,
    voided_at TIMESTAMP,
    voided_by UUID,
    void_reason TEXT,
    
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_attendance_member ON attendance(member_id);
CREATE INDEX IF NOT EXISTS idx_attendance_gym_date ON attendance(gym_id, check_in_time DESC);
CREATE INDEX IF NOT EXISTS idx_attendance_active ON attendance(member_id) WHERE check_out_time IS NULL AND is_valid = TRUE;

-- ============================================
-- 2. MEMBER STREAKS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS member_streaks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    member_id UUID NOT NULL UNIQUE,
    gym_id UUID, -- Optional: track per gym
    
    current_streak INTEGER DEFAULT 0,
    streak_type VARCHAR(20) DEFAULT 'daily',
    last_visit_date TIMESTAMP DEFAULT '1970-01-01 00:00:00',
    streak_start_date TIMESTAMP DEFAULT NOW(),
    
    longest_streak INTEGER DEFAULT 0,
    longest_streak_start_date TIMESTAMP DEFAULT NOW(),
    longest_streak_end_date TIMESTAMP DEFAULT NOW(),
    
    freeze_days_remaining INTEGER DEFAULT 2,
    freeze_used_this_month INTEGER DEFAULT 0,
    
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- ============================================
-- 3. GYM CAPACITY TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS gym_capacity (
    gym_id UUID PRIMARY KEY,
    max_capacity INTEGER NOT NULL DEFAULT 100,
    soft_limit INTEGER NOT NULL DEFAULT 80,
    
    current_occupancy INTEGER DEFAULT 0,
    last_updated_at TIMESTAMP DEFAULT NOW(),
    
    is_open BOOLEAN DEFAULT TRUE,
    is_full BOOLEAN DEFAULT FALSE
);

-- ============================================
-- 4. CHECK-IN TOKENS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS checkin_tokens (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    member_id UUID NOT NULL,
    gym_id UUID NOT NULL,
    
    token_value VARCHAR(255) NOT NULL, -- Hashed or encrypted in real world
    token_type VARCHAR(20) NOT NULL, -- qr_code, nfc
    
    expires_at TIMESTAMP NOT NULL,
    used_at TIMESTAMP,
    is_valid BOOLEAN DEFAULT TRUE,
    
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_tokens_value ON checkin_tokens(token_value);
CREATE INDEX IF NOT EXISTS idx_tokens_member_valid ON checkin_tokens(member_id) WHERE is_valid = TRUE;

-- ============================================
-- Triggers
-- ============================================
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_attendance_updated_at
    BEFORE UPDATE ON attendance
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER update_member_streaks_updated_at
    BEFORE UPDATE ON member_streaks
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();
