-- Add quality of hire rating and employment status fields
-- This migration adds fields to track quality of hire after 90 days and current employment status

-- Add new columns to applications table
ALTER TABLE applications 
ADD COLUMN quality_of_hire_rating INT,
ADD COLUMN employment_status TEXT;

-- Add comments for documentation
COMMENT ON COLUMN applications.quality_of_hire_rating IS 'Quality of Hire Rating (1-5) after 90 days';
COMMENT ON COLUMN applications.employment_status IS 'Current employment status: Still with the Firm, Left the Firm';
