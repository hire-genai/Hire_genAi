-- Migration: Add on_hold_reason column to job_postings
-- Purpose: Track why a job was put on hold (e.g., TRIAL_EXPIRED)

ALTER TABLE job_postings 
ADD COLUMN IF NOT EXISTS on_hold_reason TEXT;

-- Add index for querying jobs by on_hold_reason
CREATE INDEX IF NOT EXISTS idx_job_postings_on_hold_reason ON job_postings (on_hold_reason) WHERE on_hold_reason IS NOT NULL;

COMMENT ON COLUMN job_postings.on_hold_reason IS 'Reason for job being on hold: TRIAL_EXPIRED, MANUAL, etc.';
