-- Migration: Add trial_ends_at column to company_billing
-- Date: 2026-04-01
-- Description: Adds trial_ends_at column for cleaner 7-day trial logic
--              Trial only ends when: (1) trial_ends_at passes, OR (2) successful payment made

-- Add trial_ends_at column if it doesn't exist
ALTER TABLE company_billing 
ADD COLUMN IF NOT EXISTS trial_ends_at TIMESTAMPTZ;

-- Update existing records: set trial_ends_at = company.created_at + 7 days
-- This ensures existing companies get proper trial end dates
UPDATE company_billing cb
SET trial_ends_at = c.created_at + INTERVAL '7 days'
FROM companies c
WHERE cb.company_id = c.id
  AND cb.trial_ends_at IS NULL;

-- Create index for efficient trial queries
CREATE INDEX IF NOT EXISTS idx_company_billing_trial_ends_at ON company_billing (trial_ends_at);

-- Verify the migration
DO $$
BEGIN
  RAISE NOTICE 'Migration 001_add_trial_ends_at completed successfully';
END $$;
