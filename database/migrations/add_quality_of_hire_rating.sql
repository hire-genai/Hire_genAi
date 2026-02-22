-- Add quality of hire rating field with JSON format
-- This migration adds a field to track quality of hire after 90 days with rating and employment status

-- Add new column to applications table
ALTER TABLE applications 
ADD COLUMN quality_of_hire_rating JSONB;

-- Add comment for documentation
COMMENT ON COLUMN applications.quality_of_hire_rating IS 'Quality of Hire data in JSON format: {rating: 1-5, employmentStatus: "Still with the Firm"|"Left the Firm"}';
