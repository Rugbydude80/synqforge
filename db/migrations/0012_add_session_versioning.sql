-- Migration: Add Session Versioning for Session Invalidation
-- Created: 2025-01-28
-- Description: Adds sessionVersion field to users table to enable session invalidation

-- Add session_version column to users table
ALTER TABLE users
ADD COLUMN IF NOT EXISTS session_version INTEGER DEFAULT 1 NOT NULL;

-- Create index for session version lookups
CREATE INDEX IF NOT EXISTS idx_users_session_version ON users(id, session_version);

-- Update existing users to have session_version = 1
UPDATE users SET session_version = 1 WHERE session_version IS NULL;

-- Add comments
COMMENT ON COLUMN users.session_version IS 'Session version counter. Incremented when password changes or user is deactivated to invalidate all existing sessions.';

