-- Migration: Remove Metrics fields from job_postings table
-- These fields are no longer needed as the Metrics tab has been removed from the UI

-- First, backup the data (optional)
-- CREATE TABLE job_postings_metrics_backup AS SELECT id, job_open_date, expected_hires_per_month, target_offer_acceptance_pct, candidate_response_sla_hrs, interview_schedule_sla_hrs, cost_per_hire_budget, agency_fee_pct, job_board_costs FROM job_postings;

-- Remove Metrics columns from job_postings table
ALTER TABLE job_postings 
DROP COLUMN IF EXISTS expected_hires_per_month,
DROP COLUMN IF EXISTS target_offer_acceptance_pct,
DROP COLUMN IF EXISTS candidate_response_sla_hrs,
DROP COLUMN IF EXISTS interview_schedule_sla_hrs,
DROP COLUMN IF EXISTS cost_per_hire_budget,
DROP COLUMN IF EXISTS agency_fee_pct,
DROP COLUMN IF EXISTS job_board_costs;

-- Note: We are NOT dropping job_open_date as it will be set automatically when publishing jobs

-- Update existing records to set job_open_date to published_at if it's null
UPDATE job_postings 
SET job_open_date = published_at::date 
WHERE job_open_date IS NULL AND published_at IS NOT NULL;

-- Add comment to clarify job_open_date is now automated
COMMENT ON COLUMN job_postings.job_open_date IS 'Automatically set to current date when job is published';
