-- ============================================================================
-- Migration: Separate interview data from applications into interviews table
-- ============================================================================
-- This migration:
--   1. Creates the new `interviews` table
--   2. Migrates all existing interview data from `applications`
--   3. Drops interview-related columns from `applications`
--
-- Run this ONCE against your production database.
-- ============================================================================

BEGIN;

-- ============================================================================
-- 1. CREATE interviews TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS interviews (
  id                                    UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  application_id                        UUID NOT NULL REFERENCES applications(id) ON DELETE CASCADE,

  -- Interview scheduling & status
  interview_status                      TEXT DEFAULT 'Not Scheduled',
  interview_link                        TEXT,
  interview_sent_at                     TIMESTAMPTZ,
  interview_completed_at                TIMESTAMPTZ,

  -- Scoring & evaluation
  interview_score                       NUMERIC(5,2),
  interview_evaluations                 JSONB DEFAULT '{}',
  interview_recommendation              TEXT,
  interview_summary                     TEXT,
  interview_feedback                    TEXT,

  -- Screenshots & verification
  during_interview_screenshot           TEXT,
  during_interview_screenshot_captured_at TIMESTAMPTZ,
  post_interview_photo_url              TEXT,
  post_interview_photo_captured_at      TIMESTAMPTZ,
  verification_photo_url                TEXT,
  photo_verified                        BOOLEAN,
  photo_match_score                     NUMERIC(5,4),
  verified_at                           TIMESTAMPTZ,

  -- Timestamps
  created_at                            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at                            TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- One interview per application (enforced uniqueness)
CREATE UNIQUE INDEX IF NOT EXISTS idx_interviews_application_id ON interviews (application_id);
CREATE INDEX IF NOT EXISTS idx_interviews_status ON interviews (interview_status);
CREATE INDEX IF NOT EXISTS idx_interviews_score ON interviews (interview_score) WHERE interview_score IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_interviews_completed_at ON interviews (interview_completed_at) WHERE interview_completed_at IS NOT NULL;

-- Apply updated_at trigger
CREATE TRIGGER set_updated_at_interviews
  BEFORE UPDATE ON interviews
  FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at();

-- ============================================================================
-- 2. MIGRATE EXISTING DATA
-- ============================================================================
INSERT INTO interviews (
  application_id,
  interview_status,
  interview_link,
  interview_sent_at,
  interview_completed_at,
  interview_score,
  interview_evaluations,
  interview_recommendation,
  interview_summary,
  interview_feedback,
  during_interview_screenshot,
  during_interview_screenshot_captured_at,
  post_interview_photo_url,
  post_interview_photo_captured_at,
  verification_photo_url,
  photo_verified,
  photo_match_score,
  verified_at,
  created_at,
  updated_at
)
SELECT
  a.id,
  COALESCE(a.interview_status, 'Not Scheduled'),
  a.interview_link,
  a.interview_sent_at,
  a.interview_completed_at,
  a.interview_score,
  COALESCE(a.interview_evaluations, '{}'),
  a.interview_recommendation,
  a.interview_summary,
  a.interview_feedback,
  a.during_interview_screenshot,
  a.during_interview_screenshot_captured_at,
  a.post_interview_photo_url,
  a.post_interview_photo_captured_at,
  a.verification_photo_url,
  a.photo_verified,
  a.photo_match_score,
  a.verified_at,
  a.created_at,
  a.updated_at
FROM applications a
WHERE NOT EXISTS (
  SELECT 1 FROM interviews i WHERE i.application_id = a.id
);

-- ============================================================================
-- 3. DROP INTERVIEW COLUMNS FROM applications
-- ============================================================================
ALTER TABLE applications DROP COLUMN IF EXISTS interview_status;
ALTER TABLE applications DROP COLUMN IF EXISTS interview_link;
ALTER TABLE applications DROP COLUMN IF EXISTS interview_sent_at;
ALTER TABLE applications DROP COLUMN IF EXISTS interview_completed_at;
ALTER TABLE applications DROP COLUMN IF EXISTS interview_score;
ALTER TABLE applications DROP COLUMN IF EXISTS interview_evaluations;
ALTER TABLE applications DROP COLUMN IF EXISTS interview_recommendation;
ALTER TABLE applications DROP COLUMN IF EXISTS interview_summary;
ALTER TABLE applications DROP COLUMN IF EXISTS interview_feedback;
ALTER TABLE applications DROP COLUMN IF EXISTS during_interview_screenshot;
ALTER TABLE applications DROP COLUMN IF EXISTS during_interview_screenshot_captured_at;
ALTER TABLE applications DROP COLUMN IF EXISTS post_interview_photo_url;
ALTER TABLE applications DROP COLUMN IF EXISTS post_interview_photo_captured_at;
ALTER TABLE applications DROP COLUMN IF EXISTS verification_photo_url;
ALTER TABLE applications DROP COLUMN IF EXISTS photo_verified;
ALTER TABLE applications DROP COLUMN IF EXISTS photo_match_score;
ALTER TABLE applications DROP COLUMN IF EXISTS verified_at;

-- Drop old indexes that referenced dropped columns
DROP INDEX IF EXISTS idx_applications_during_interview_screenshot;
DROP INDEX IF EXISTS idx_applications_post_interview_photo;

COMMIT;
