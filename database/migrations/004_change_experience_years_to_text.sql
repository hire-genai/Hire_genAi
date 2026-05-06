-- Migration: Change experience_years from INT to TEXT to support ranges like "2-3 years"
-- This allows storing experience ranges instead of just single numbers

-- First, create a backup of existing data
CREATE TABLE IF NOT EXISTS job_postings_experience_backup AS 
SELECT id, experience_years FROM job_postings WHERE experience_years IS NOT NULL;

-- Alter the column type from INT to TEXT
ALTER TABLE job_postings 
ALTER COLUMN experience_years TYPE TEXT USING experience_years::TEXT;

-- Add a comment to document the change
COMMENT ON COLUMN job_postings.experience_years IS 'Experience requirement - can be single value (e.g., "2 years") or range (e.g., "2-3 years")';

-- Optional: Verify the migration
SELECT COUNT(*) as total_jobs, 
       COUNT(CASE WHEN experience_years IS NOT NULL THEN 1 END) as jobs_with_experience,
       COUNT(CASE WHEN experience_years LIKE '%-%' THEN 1 END) as range_experiences
FROM job_postings;
