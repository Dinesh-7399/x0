-- Database Migration: Create Workout Service Tables
-- migrations/001_create_workout_tables.sql

-- Enable extensions
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ============================================
-- 1. EXERCISES TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS exercises (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(100) NOT NULL,
    slug VARCHAR(100) NOT NULL,
    description TEXT DEFAULT '',
    instructions TEXT[] DEFAULT '{}',
    category VARCHAR(30) NOT NULL DEFAULT 'other',
    primary_muscles TEXT[] DEFAULT '{}',
    secondary_muscles TEXT[] DEFAULT '{}',
    equipment TEXT[] DEFAULT '{}',
    difficulty VARCHAR(20) NOT NULL DEFAULT 'intermediate',
    exercise_type VARCHAR(20) NOT NULL DEFAULT 'strength',
    media_urls TEXT[] DEFAULT '{}',
    is_system_exercise BOOLEAN DEFAULT FALSE,
    is_custom BOOLEAN DEFAULT TRUE,
    created_by UUID,
    is_approved BOOLEAN DEFAULT FALSE,
    is_public BOOLEAN DEFAULT FALSE,
    usage_count INTEGER DEFAULT 0,
    deleted_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_exercises_slug ON exercises(slug) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_exercises_category ON exercises(category) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_exercises_created_by ON exercises(created_by) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_exercises_system ON exercises(is_system_exercise) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_exercises_public ON exercises(is_public) WHERE is_public = TRUE AND deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_exercises_name_search ON exercises USING gin(to_tsvector('english', name)) WHERE deleted_at IS NULL;

-- ============================================
-- 2. WORKOUT LOGS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS workout_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL,
    template_id UUID,
    program_id UUID,
    program_week INTEGER,
    program_day INTEGER,
    name VARCHAR(100) NOT NULL,
    started_at TIMESTAMP NOT NULL DEFAULT NOW(),
    completed_at TIMESTAMP,
    status VARCHAR(20) NOT NULL DEFAULT 'in_progress',
    duration INTEGER, -- minutes
    notes TEXT DEFAULT '',
    mood INTEGER CHECK (mood IS NULL OR (mood >= 1 AND mood <= 5)),
    energy INTEGER CHECK (energy IS NULL OR (energy >= 1 AND energy <= 5)),
    exercises JSONB DEFAULT '[]',
    total_volume DECIMAL(12, 2) DEFAULT 0,
    total_sets INTEGER DEFAULT 0,
    total_reps INTEGER DEFAULT 0,
    calories_burned INTEGER,
    location VARCHAR(200),
    gym_id UUID,
    deleted_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_workout_logs_user ON workout_logs(user_id) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_workout_logs_user_date ON workout_logs(user_id, started_at DESC) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_workout_logs_user_active ON workout_logs(user_id) WHERE status = 'in_progress' AND deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_workout_logs_status ON workout_logs(status) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_workout_logs_template ON workout_logs(template_id) WHERE template_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_workout_logs_program ON workout_logs(program_id) WHERE program_id IS NOT NULL;

-- ============================================
-- 3. PERSONAL RECORDS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS personal_records (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL,
    exercise_id UUID NOT NULL,
    exercise_name VARCHAR(100) NOT NULL,
    record_type VARCHAR(30) NOT NULL,
    value DECIMAL(10, 2) NOT NULL,
    unit VARCHAR(20) NOT NULL,
    reps INTEGER,
    weight DECIMAL(10, 2),
    achieved_at TIMESTAMP NOT NULL DEFAULT NOW(),
    workout_log_id UUID NOT NULL,
    workout_log_set_number INTEGER,
    previous_value DECIMAL(10, 2),
    improvement DECIMAL(10, 2),
    created_at TIMESTAMP DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_prs_user ON personal_records(user_id);
CREATE INDEX IF NOT EXISTS idx_prs_user_exercise ON personal_records(user_id, exercise_id);
CREATE INDEX IF NOT EXISTS idx_prs_user_exercise_type ON personal_records(user_id, exercise_id, record_type);
CREATE INDEX IF NOT EXISTS idx_prs_achieved ON personal_records(achieved_at DESC);

-- ============================================
-- 4. WORKOUT TEMPLATES TABLE (for future)
-- ============================================
CREATE TABLE IF NOT EXISTS workout_templates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(100) NOT NULL,
    description TEXT DEFAULT '',
    created_by UUID NOT NULL,
    visibility VARCHAR(20) NOT NULL DEFAULT 'private',
    gym_id UUID,
    target_duration INTEGER DEFAULT 60,
    difficulty VARCHAR(20) DEFAULT 'intermediate',
    tags TEXT[] DEFAULT '{}',
    exercises JSONB DEFAULT '[]',
    warmup JSONB DEFAULT '[]',
    cooldown JSONB DEFAULT '[]',
    notes TEXT DEFAULT '',
    media_url VARCHAR(500),
    usage_count INTEGER DEFAULT 0,
    rating DECIMAL(3, 2) DEFAULT 0,
    rating_count INTEGER DEFAULT 0,
    is_featured BOOLEAN DEFAULT FALSE,
    deleted_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_templates_creator ON workout_templates(created_by) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_templates_visibility ON workout_templates(visibility) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_templates_gym ON workout_templates(gym_id) WHERE gym_id IS NOT NULL AND deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_templates_featured ON workout_templates(is_featured) WHERE is_featured = TRUE AND deleted_at IS NULL;

-- ============================================
-- Triggers for updated_at
-- ============================================
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_exercises_updated_at
    BEFORE UPDATE ON exercises
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER update_workout_logs_updated_at
    BEFORE UPDATE ON workout_logs
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER update_workout_templates_updated_at
    BEFORE UPDATE ON workout_templates
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ============================================
-- Comments for documentation
-- ============================================
COMMENT ON TABLE exercises IS 'Exercise catalog with system and custom exercises';
COMMENT ON TABLE workout_logs IS 'User workout sessions with exercises stored as JSONB';
COMMENT ON TABLE personal_records IS 'User personal records by exercise and record type';
COMMENT ON TABLE workout_templates IS 'Reusable workout structures created by trainers/users';
