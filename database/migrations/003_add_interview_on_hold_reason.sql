-- Migration: Add on_hold_reason column to interviews table
-- Purpose: Track why an interview was put on hold (e.g., TRIAL_EXPIRED)

ALTER TABLE interviews 
ADD COLUMN IF NOT EXISTS on_hold_reason TEXT;

-- Store original status before putting on hold (for restoration)
ALTER TABLE interviews 
ADD COLUMN IF NOT EXISTS original_status TEXT;

-- Add index for querying interviews by on_hold_reason
CREATE INDEX IF NOT EXISTS idx_interviews_on_hold_reason ON interviews (on_hold_reason) WHERE on_hold_reason IS NOT NULL;

COMMENT ON COLUMN interviews.on_hold_reason IS 'Reason for interview being on hold: TRIAL_EXPIRED, MANUAL, etc.';
COMMENT ON COLUMN interviews.original_status IS 'Original status before being put on hold, used for restoration';
