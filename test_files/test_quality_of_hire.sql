-- Test Quality of Hire Data
-- Run this SQL to add sample quality_of_hire_rating data for testing

-- First, let's check if we have any hired candidates
SELECT id, current_stage, hire_date, quality_of_hire_rating 
FROM applications 
WHERE current_stage = 'hired' 
LIMIT 5;

-- If no hired candidates exist, let's create some test data
-- Update a few applications to be hired with quality ratings

-- Update sample applications to be hired with quality ratings
UPDATE applications 
SET 
    current_stage = 'hired',
    hire_date = NOW() - INTERVAL '2 months',
    quality_of_hire_rating = '{"rating": 4, "employmentStatus": "Still with the Firm"}'
WHERE current_stage != 'hired' 
AND id IN (SELECT id FROM applications WHERE current_stage != 'hired' LIMIT 3);

-- Update more applications with different data
UPDATE applications 
SET 
    current_stage = 'hired',
    hire_date = NOW() - INTERVAL '4 months',
    quality_of_hire_rating = '{"rating": 5, "employmentStatus": "Still with the Firm"}'
WHERE current_stage != 'hired' 
AND id IN (SELECT id FROM applications WHERE current_stage != 'hired' LIMIT 3);

-- Update more applications with different data
UPDATE applications 
SET 
    current_stage = 'hired',
    hire_date = NOW() - INTERVAL '1 month',
    quality_of_hire_rating = '{"rating": 4, "employmentStatus": "Left the Firm"}'
WHERE current_stage != 'hired' 
AND id IN (SELECT id FROM applications WHERE current_stage != 'hired' LIMIT 4);

-- Verify the test data was created
SELECT 
    id,
    current_stage,
    hire_date,
    quality_of_hire_rating,
    CASE 
        WHEN DATE_TRUNC('quarter', hire_date) = DATE_TRUNC('quarter', NOW()) THEN 'Current Quarter'
        WHEN DATE_TRUNC('quarter', hire_date) = DATE_TRUNC('quarter', NOW() - INTERVAL '3 months') THEN 'Previous Quarter'
        WHEN DATE_TRUNC('quarter', hire_date) = DATE_TRUNC('quarter', NOW() - INTERVAL '6 months') THEN 'Q-2'
        WHEN DATE_TRUNC('quarter', hire_date) = DATE_TRUNC('quarter', NOW() - INTERVAL '9 months') THEN 'Q-3'
        ELSE TO_CHAR(DATE_TRUNC('quarter', hire_date), 'YYYY "Q"Q')
    END as cohort
FROM applications 
WHERE current_stage = 'hired' 
AND quality_of_hire_rating IS NOT NULL
ORDER BY hire_date DESC;

-- Test the actual query used by the dashboard
WITH hired_cohorts AS (
  SELECT 
    CASE 
      WHEN DATE_TRUNC('quarter', hire_date) = DATE_TRUNC('quarter', NOW()) THEN 'Current Quarter'
      WHEN DATE_TRUNC('quarter', hire_date) = DATE_TRUNC('quarter', NOW() - INTERVAL '3 months') THEN 'Previous Quarter'
      WHEN DATE_TRUNC('quarter', hire_date) = DATE_TRUNC('quarter', NOW() - INTERVAL '6 months') THEN 'Q-2'
      WHEN DATE_TRUNC('quarter', hire_date) = DATE_TRUNC('quarter', NOW() - INTERVAL '9 months') THEN 'Q-3'
      ELSE TO_CHAR(DATE_TRUNC('quarter', hire_date), 'YYYY "Q"Q')
    END as cohort,
    AVG((qoh.rating)::numeric) as avg_rating,
    COUNT(*) as count,
    -- Calculate retention for this cohort
    COUNT(CASE 
      WHEN hire_date <= NOW() - INTERVAL '3 months' 
      AND (quality_of_hire_rating->>'employmentStatus' = 'Still with the Firm' 
           OR quality_of_hire_rating->>'employmentStatus' IS NULL)
      THEN 1 
    END) as retained_count,
    COUNT(CASE 
      WHEN hire_date <= NOW() - INTERVAL '3 months' 
      THEN 1 
    END) as retention_eligible
  FROM applications a
  JOIN job_postings jp ON a.job_id = jp.id
  CROSS JOIN LATERAL jsonb_to_record(quality_of_hire_rating) AS qoh(rating int, "employmentStatus" text)
  WHERE jp.company_id = '98af0138-70f3-4e69-b3e2-a561c0e5e8bf'  -- Replace with your company_id
    AND current_stage = 'hired'
    AND quality_of_hire_rating IS NOT NULL
    AND quality_of_hire_rating->>'rating' IS NOT NULL
    AND hire_date IS NOT NULL
  GROUP BY DATE_TRUNC('quarter', hire_date)
  ORDER BY DATE_TRUNC('quarter', hire_date) DESC
  LIMIT 4
)
SELECT 
  cohort,
  ROUND(avg_rating, 1) as avg_rating,
  CASE 
    WHEN retention_eligible > 0 THEN ROUND((retained_count::numeric / retention_eligible) * 100)
    ELSE 0 
  END as retention_3mo,
  CASE 
    WHEN avg_rating >= 4.5 THEN 'High'
    WHEN avg_rating >= 4.0 THEN 'Medium-High'
    WHEN avg_rating >= 3.5 THEN 'Medium'
    ELSE 'Low'
  END as performance_index,
  count
FROM hired_cohorts
ORDER BY cohort DESC;
