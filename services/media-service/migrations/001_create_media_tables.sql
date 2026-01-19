-- Database Migration: Create Media Tables
-- Run this migration to set up media-service tables

-- Enable pgcrypto extension for gen_random_uuid()
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- 1. Media Table
CREATE TABLE IF NOT EXISTS media (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL,
    type VARCHAR(20) NOT NULL DEFAULT 'image',
    filename VARCHAR(255) NOT NULL,
    mime_type VARCHAR(100) NOT NULL,
    size BIGINT NOT NULL,
    url VARCHAR(1000) NOT NULL,
    thumbnail_url VARCHAR(1000),
    status VARCHAR(20) NOT NULL DEFAULT 'ready',
    metadata JSONB DEFAULT '{}',
    entity_type VARCHAR(50),
    entity_id UUID,
    is_public BOOLEAN DEFAULT FALSE,
    deleted_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Indexes for common queries
-- User media listing
CREATE INDEX IF NOT EXISTS idx_media_user_id ON media(user_id);
CREATE INDEX IF NOT EXISTS idx_media_user_created ON media(user_id, created_at DESC) WHERE deleted_at IS NULL;

-- Type filtering
CREATE INDEX IF NOT EXISTS idx_media_type ON media(type);

-- Entity association
CREATE INDEX IF NOT EXISTS idx_media_entity ON media(entity_type, entity_id) WHERE entity_type IS NOT NULL;

-- Public media
CREATE INDEX IF NOT EXISTS idx_media_public ON media(is_public) WHERE is_public = TRUE AND deleted_at IS NULL;

-- Status filtering
CREATE INDEX IF NOT EXISTS idx_media_status ON media(status);

-- Soft delete filtering
CREATE INDEX IF NOT EXISTS idx_media_active ON media(id) WHERE deleted_at IS NULL;

-- Trigger to update updated_at
CREATE OR REPLACE FUNCTION update_media_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_media_updated_at
    BEFORE UPDATE ON media
    FOR EACH ROW
    EXECUTE FUNCTION update_media_updated_at();

-- Add comments for documentation
COMMENT ON TABLE media IS 'Stores metadata for uploaded media files (images, videos, documents)';
COMMENT ON COLUMN media.type IS 'Media type: image, video, document, audio';
COMMENT ON COLUMN media.status IS 'Processing status: pending, processing, ready, failed';
COMMENT ON COLUMN media.entity_type IS 'Associated entity type: workout, profile, gym, post, etc.';
COMMENT ON COLUMN media.entity_id IS 'Associated entity UUID';
COMMENT ON COLUMN media.metadata IS 'Additional metadata: dimensions, duration, encoding, etc.';
