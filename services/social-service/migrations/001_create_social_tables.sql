-- Migration: Create Social Service Tables

-- Enable extensions
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- 1. Follows Table (The Graph)
-- Using target_type for polymorphism (USER, TRAINER, GYM)
CREATE TABLE IF NOT EXISTS follows (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    follower_id UUID NOT NULL,
    following_id UUID NOT NULL,
    target_type VARCHAR(20) NOT NULL CHECK (target_type IN ('USER', 'TRAINER', 'GYM')),
    status VARCHAR(20) DEFAULT 'ACCEPTED' CHECK (status IN ('PENDING', 'ACCEPTED', 'BLOCKED')),
    created_at TIMESTAMP DEFAULT NOW(),
    
    -- Unique constraint to prevent duplicate follows
    UNIQUE(follower_id, following_id, target_type)
);

-- Indexes for Graph Traversal
CREATE INDEX idx_follows_follower ON follows(follower_id);
CREATE INDEX idx_follows_following ON follows(following_id, target_type);


-- 2. Interactions Table (Likes/Reactions)
-- Idempotent Interactions for ANY target (Post, Comment, Gym, Workout)
CREATE TABLE IF NOT EXISTS interactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL,
    target_id UUID NOT NULL, -- External FK
    target_type VARCHAR(20) NOT NULL CHECK (target_type IN ('POST', 'COMMENT', 'GYM', 'WORKOUT')),
    type VARCHAR(20) DEFAULT 'LIKE', -- LIKE, LOVE, FIRE, MUSCLE
    created_at TIMESTAMP DEFAULT NOW(),

    -- Idempotency Constraint
    UNIQUE(user_id, target_id, target_type, type)
);

CREATE INDEX idx_interactions_target ON interactions(target_id, target_type);
CREATE INDEX idx_interactions_user ON interactions(user_id);


-- 3. Comments Table
-- Threaded comments logic
CREATE TABLE IF NOT EXISTS comments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL,
    target_id UUID NOT NULL,
    target_type VARCHAR(20) NOT NULL CHECK (target_type IN ('POST', 'WORKOUT')),
    content TEXT NOT NULL,
    parent_id UUID REFERENCES comments(id) ON DELETE CASCADE, -- Threading
    mentions UUID[], -- Array of mentioned User IDs
    
    is_deleted BOOLEAN DEFAULT FALSE, -- Soft Delete
    edited_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_comments_target ON comments(target_id, target_type);
CREATE INDEX idx_comments_parent ON comments(parent_id);
