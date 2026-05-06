-- Migration: Create admin_sessions table
-- Purpose: Add admin authentication session tracking table

CREATE TABLE IF NOT EXISTS admin_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_email VARCHAR(255) NOT NULL,
  session_token_hash VARCHAR(255) NOT NULL UNIQUE,
  ip_address INET,
  user_agent TEXT,
  issued_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  expires_at TIMESTAMPTZ NOT NULL,
  last_activity_at TIMESTAMPTZ DEFAULT now(),
  revoked_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

COMMENT ON TABLE admin_sessions IS 'Stores authenticated sessions for owner/admin access to HireGenAI admin panel';

CREATE INDEX IF NOT EXISTS idx_admin_sessions_owner_email ON admin_sessions(owner_email);
CREATE INDEX IF NOT EXISTS idx_admin_sessions_token_hash ON admin_sessions(session_token_hash);
CREATE INDEX IF NOT EXISTS idx_admin_sessions_expires_at ON admin_sessions(expires_at);
