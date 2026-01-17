-- Migration: 002_create_2fa_and_history.sql
-- Two-Factor Authentication and Login History

-- Two-Factor Secrets Table
CREATE TABLE IF NOT EXISTS two_factor_secrets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    secret VARCHAR(255) NOT NULL,
    enabled BOOLEAN NOT NULL DEFAULT false,
    backup_codes TEXT[] NOT NULL DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    enabled_at TIMESTAMP WITH TIME ZONE,
    UNIQUE(user_id)
);

-- Index for user lookup
CREATE INDEX IF NOT EXISTS idx_two_factor_secrets_user_id ON two_factor_secrets(user_id);

-- Login History Table
CREATE TABLE IF NOT EXISTS login_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    status VARCHAR(50) NOT NULL,
    ip_address INET,
    user_agent TEXT,
    device VARCHAR(50),
    browser VARCHAR(50),
    os VARCHAR(50),
    location VARCHAR(255),
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Indexes for login history
CREATE INDEX IF NOT EXISTS idx_login_history_user_id ON login_history(user_id);
CREATE INDEX IF NOT EXISTS idx_login_history_user_created ON login_history(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_login_history_status ON login_history(user_id, status, created_at);

-- Add user roles column if not exists
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'users' AND column_name = 'roles') THEN
        ALTER TABLE users ADD COLUMN roles TEXT[] NOT NULL DEFAULT '{member}';
    END IF;
END $$;

-- Add index for roles
CREATE INDEX IF NOT EXISTS idx_users_roles ON users USING GIN(roles);
