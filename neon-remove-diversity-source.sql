-- Migration: Remove diversity and source columns from candidates table
-- Run this on your Neon database after updating the application code

-- Remove diversity_category column from candidates table
ALTER TABLE candidates DROP COLUMN IF EXISTS diversity_category;

-- Remove source column from candidates table (keep source_type)
ALTER TABLE candidates DROP COLUMN IF EXISTS source;

-- Remove diversity-related columns from job_postings table
ALTER TABLE job_postings DROP COLUMN IF EXISTS diversity_goals;
ALTER TABLE job_postings DROP COLUMN IF EXISTS diversity_target_pct;

-- Drop the diversity_category enum type (only if no other tables use it)
DROP TYPE IF EXISTS diversity_category;

-- Verify the changes
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'candidates' 
  AND table_schema = 'public'
ORDER BY ordinal_position;
