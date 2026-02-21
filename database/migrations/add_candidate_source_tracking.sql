-- Add detailed source tracking fields to candidates table
-- This migration adds fields to track where candidates came from (Direct, Agency, Referral)

-- Add source_type enum
CREATE TYPE candidate_source_type AS ENUM ('Direct', 'Agency', 'Employee Referral');

-- Add new columns to candidates table
ALTER TABLE candidates 
ADD COLUMN source_type candidate_source_type,
ADD COLUMN sub_source TEXT,
ADD COLUMN agency_name TEXT,
ADD COLUMN referral_employee_name TEXT,
ADD COLUMN referral_employee_email TEXT;

-- Add comments for documentation
COMMENT ON COLUMN candidates.source_type IS 'Type of source: Direct, Agency, or Employee Referral';
COMMENT ON COLUMN candidates.sub_source IS 'Sub-source for Direct type: LinkedIn, Google, Monster, Indeed, Facebook, Others';
COMMENT ON COLUMN candidates.agency_name IS 'Agency name when source_type is Agency';
COMMENT ON COLUMN candidates.referral_employee_name IS 'Employee name when source_type is Employee Referral';
COMMENT ON COLUMN candidates.referral_employee_email IS 'Employee email when source_type is Employee Referral';
