-- Migration: Change experience_years from INT to TEXT and add min/max columns
-- This allows storing experience ranges like "0-2 years", "2-5 years", etc.

-- Update job_postings table
ALTER TABLE job_postings 
ALTER COLUMN experience_years TYPE TEXT;

-- Update candidates table (if needed for consistency)
ALTER TABLE candidates 
ALTER COLUMN experience_years TYPE TEXT;

-- Update screening_submissions table (if needed for consistency)
ALTER TABLE screening_submissions 
ALTER COLUMN experience_years TYPE TEXT;

-- Add experience_min and experience_max columns to screening_questions JSONB
-- These are stored inside the screening_questions JSONB column, no schema change needed
-- Example: {"minExperience": 0, "maxExperience": 2, "experienceType": "range", ...}
