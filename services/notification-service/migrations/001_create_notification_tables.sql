-- Database Migration: Create Notification Service Tables
-- migrations/001_create_notification_tables.sql

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ============================================
-- 1. NOTIFICATIONS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL,
    type VARCHAR(50) NOT NULL,
    title VARCHAR(200) NOT NULL,
    body TEXT DEFAULT '',
    data JSONB DEFAULT '{}',
    image_url VARCHAR(500),
    action_url VARCHAR(500),
    priority VARCHAR(20) NOT NULL DEFAULT 'normal',
    channels TEXT[] DEFAULT '{}',
    template_id UUID,
    source_service VARCHAR(50) NOT NULL,
    source_event_id VARCHAR(100),
    expires_at TIMESTAMP,
    group_id VARCHAR(50),
    status VARCHAR(20) NOT NULL DEFAULT 'pending',
    read_at TIMESTAMP,
    deleted_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Indexes for notifications
CREATE INDEX IF NOT EXISTS idx_notifications_user ON notifications(user_id) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_notifications_user_unread ON notifications(user_id) WHERE read_at IS NULL AND deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_notifications_user_date ON notifications(user_id, created_at DESC) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_notifications_source_event ON notifications(source_event_id) WHERE source_event_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_notifications_expires ON notifications(expires_at) WHERE expires_at IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_notifications_status ON notifications(status) WHERE deleted_at IS NULL;

-- ============================================
-- 2. USER NOTIFICATION PREFERENCES TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS user_notification_preferences (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL UNIQUE,
    
    -- Global settings
    global_enabled BOOLEAN DEFAULT TRUE,
    quiet_hours_enabled BOOLEAN DEFAULT TRUE,
    quiet_hours_start VARCHAR(5) DEFAULT '22:00',
    quiet_hours_end VARCHAR(5) DEFAULT '08:00',
    timezone VARCHAR(50) DEFAULT 'Asia/Kolkata',
    
    -- Channel preferences
    push_enabled BOOLEAN DEFAULT TRUE,
    email_enabled BOOLEAN DEFAULT TRUE,
    sms_enabled BOOLEAN DEFAULT TRUE,
    in_app_enabled BOOLEAN DEFAULT TRUE,
    
    -- Category preferences
    workout_reminders BOOLEAN DEFAULT TRUE,
    social_notifications BOOLEAN DEFAULT TRUE,
    chat_notifications BOOLEAN DEFAULT TRUE,
    marketing_emails BOOLEAN DEFAULT FALSE,
    gym_announcements BOOLEAN DEFAULT TRUE,
    trainer_messages BOOLEAN DEFAULT TRUE,
    payment_alerts BOOLEAN DEFAULT TRUE,
    
    -- Email frequency
    email_digest_frequency VARCHAR(20) DEFAULT 'daily',
    
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Index on user_id
CREATE INDEX IF NOT EXISTS idx_preferences_user ON user_notification_preferences(user_id);

-- ============================================
-- 3. DEVICE TOKENS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS device_tokens (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL,
    token TEXT NOT NULL,
    platform VARCHAR(10) NOT NULL, -- ios, android, web
    device_id VARCHAR(100) NOT NULL UNIQUE,
    app_version VARCHAR(20) DEFAULT 'unknown',
    is_active BOOLEAN DEFAULT TRUE,
    last_used_at TIMESTAMP DEFAULT NOW(),
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Indexes for device tokens
CREATE INDEX IF NOT EXISTS idx_device_tokens_user ON device_tokens(user_id) WHERE is_active = TRUE;
CREATE INDEX IF NOT EXISTS idx_device_tokens_token ON device_tokens(token);
CREATE INDEX IF NOT EXISTS idx_device_tokens_device_id ON device_tokens(device_id);

-- ============================================
-- 4. DELIVERY LOGS TABLE (for tracking)
-- ============================================
CREATE TABLE IF NOT EXISTS notification_delivery_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    notification_id UUID NOT NULL REFERENCES notifications(id) ON DELETE CASCADE,
    channel VARCHAR(20) NOT NULL,
    provider VARCHAR(30) NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'pending',
    attempt_number INTEGER DEFAULT 1,
    provider_message_id VARCHAR(100),
    error_code VARCHAR(50),
    error_message TEXT,
    sent_at TIMESTAMP DEFAULT NOW(),
    delivered_at TIMESTAMP,
    opened_at TIMESTAMP,
    clicked_at TIMESTAMP
);

-- Indexes for delivery logs
CREATE INDEX IF NOT EXISTS idx_delivery_logs_notification ON notification_delivery_logs(notification_id);
CREATE INDEX IF NOT EXISTS idx_delivery_logs_status ON notification_delivery_logs(status);

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

CREATE TRIGGER update_notifications_updated_at
    BEFORE UPDATE ON notifications
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER update_preferences_updated_at
    BEFORE UPDATE ON user_notification_preferences
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER update_device_tokens_updated_at
    BEFORE UPDATE ON device_tokens
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ============================================
-- Comments
-- ============================================
COMMENT ON TABLE notifications IS 'User notifications across all channels';
COMMENT ON TABLE user_notification_preferences IS 'User preferences for notification delivery';
COMMENT ON TABLE device_tokens IS 'Push notification device tokens';
COMMENT ON TABLE notification_delivery_logs IS 'Delivery attempt tracking for analytics';
