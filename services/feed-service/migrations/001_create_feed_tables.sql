-- Migration: Create Feed Tables
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Feed Items (Timeline)
-- Stores the materialized feed for each user.
CREATE TABLE IF NOT EXISTS feed_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL, -- The user who sees this item (Timeline Owner)
    actor_id UUID NOT NULL, -- Who performed the action
    action_type VARCHAR(50) NOT NULL, -- FOLLOW, LIKE_POST, COMMENT_POST, TRAINER_POST_CREATED
    target_id UUID NOT NULL,
    target_type VARCHAR(50) NOT NULL, -- USER, POST, WORKOUT
    metadata JSONB DEFAULT '{}', -- Snapshot of content (e.g. post snippet, username)
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_feed_user_created ON feed_items(user_id, created_at DESC);
