-- Clean up any existing decimal quality ratings to integers
-- Run this to fix the "invalid input syntax for type integer: 4.5" error

-- First, check what problematic data exists
SELECT id, quality_of_hire_rating 
FROM applications 
WHERE quality_of_hire_rating IS NOT NULL
AND quality_of_hire_rating::text LIKE '%4.5%';

-- Fix any 4.5 ratings to 4
UPDATE applications 
SET quality_of_hire_rating = '{"rating": 4, "employmentStatus": "Still with the Firm"}'
WHERE quality_of_hire_rating::text LIKE '%4.5%';

-- Check for any other decimal ratings
SELECT id, quality_of_hire_rating 
FROM applications 
WHERE quality_of_hire_rating IS NOT NULL
AND (quality_of_hire_rating::text LIKE '%.%' AND quality_of_hire_rating::text NOT LIKE '%":%');

-- If you find other decimals, update them to integers
-- For example, if you have 3.5, change to 3 or 4
-- UPDATE applications SET quality_of_hire_rating = '{"rating": 3, "employmentStatus": "Still with the Firm"}' WHERE quality_of_hire_rating::text LIKE '%3.5%';

-- Verify the fix
SELECT id, quality_of_hire_rating 
FROM applications 
WHERE current_stage = 'hired' 
AND quality_of_hire_rating IS NOT NULL
LIMIT 5;
