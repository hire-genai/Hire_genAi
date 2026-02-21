-- Add diversity category field to candidates table
-- This migration adds a field to track candidate diversity information

-- Add diversity_category enum
CREATE TYPE diversity_category AS ENUM ('Underrepresented Minority', 'Veteran', 'LGBTQ+');

-- Add new column to candidates table
ALTER TABLE candidates 
ADD COLUMN diversity_category diversity_category;

-- Add comment for documentation
COMMENT ON COLUMN candidates.diversity_category IS 'Diversity category: Underrepresented Minority, Veteran, LGBTQ+';
