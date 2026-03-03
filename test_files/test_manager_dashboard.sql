-- Test Manager Dashboard Data
-- Run this SQL to add sample data for Manager Dashboard testing

-- First, check existing recruiters
SELECT id, email, full_name FROM users WHERE company_id = '4d7a3f67-59d8-4c7f-8128-b614e81bcd7c';

-- Check existing job postings
SELECT id, title, created_by, status FROM job_postings WHERE company_id = '4d7a3f67-59d8-4c7f-8128-b614e81bcd7c' LIMIT 5;

-- 1. Create some open job postings for recruiters
-- Update existing job postings or insert new ones
UPDATE job_postings 
SET 
    status = 'open',
    created_by = 'anshu@gmail.com'
WHERE company_id = '4d7a3f67-59d8-4c7f-8128-b614e81bcd7c'
AND id IN (SELECT id FROM job_postings WHERE company_id = '4d7a3f67-59d8-4c7f-8128-b614e81bcd7c' LIMIT 2);

UPDATE job_postings 
SET 
    status = 'open',
    created_by = 'dheenayadava3854@gmail.com'
WHERE company_id = '4d7a3f67-59d8-4c7f-8128-b614e81bcd7c'
AND id IN (SELECT id FROM job_postings WHERE company_id = '4d7a3f67-59d8-4c7f-8128-b614e81bcd7c' OFFSET 2 LIMIT 2);

-- 2. Create some applications for active candidates
-- Update existing applications to be in active stages
UPDATE applications a
SET 
    current_stage = 'screening'
FROM job_postings jp
WHERE a.job_id = jp.id
AND jp.company_id = '4d7a3f67-59d8-4c7f-8128-b614e81bcd7c'
AND jp.created_by = 'anshu@gmail.com'
AND a.current_stage NOT IN ('hired', 'rejected', 'withdrawn')
LIMIT 3;

UPDATE applications a
SET 
    current_stage = 'interview'
FROM job_postings jp
WHERE a.job_id = jp.id
AND jp.company_id = '4d7a3f67-59d8-4c7f-8128-b614e81bcd7c'
AND jp.created_by = 'dheenayadava3854@gmail.com'
AND a.current_stage NOT IN ('hired', 'rejected', 'withdrawn')
LIMIT 2;

-- 3. Create some hired candidates
UPDATE applications a
SET 
    current_stage = 'hired',
    hire_date = NOW() - INTERVAL '1 month'
FROM job_postings jp
WHERE a.job_id = jp.id
AND jp.company_id = '4d7a3f67-59d8-4c7f-8128-b614e81bcd7c'
AND jp.created_by = 'anshu@gmail.com'
AND a.current_stage NOT IN ('hired', 'rejected', 'withdrawn')
LIMIT 1;

-- 4. Create some offers
UPDATE applications a
SET 
    offer_status = 'sent',
    current_stage = 'offer'
FROM job_postings jp
WHERE a.job_id = jp.id
AND jp.company_id = '4d7a3f67-59d8-4c7f-8128-b614e81bcd7c'
AND jp.created_by = 'dheenayadava3854@gmail.com'
AND a.current_stage NOT IN ('hired', 'rejected', 'withdrawn')
LIMIT 1;

UPDATE applications a
SET 
    offer_status = 'accepted',
    current_stage = 'offer'
FROM job_postings jp
WHERE a.job_id = jp.id
AND jp.company_id = '4d7a3f67-59d8-4c7f-8128-b614e81bcd7c'
AND jp.created_by = 'gh@gmail.com'
AND a.current_stage NOT IN ('hired', 'rejected', 'withdrawn')
LIMIT 1;

-- Verify the test data
-- Team Pipeline Health
SELECT 
    u.full_name,
    u.email,
    (SELECT COUNT(*) FROM job_postings jp WHERE jp.created_by = u.email AND jp.status = 'open') AS active_jobs,
    (SELECT COUNT(*) FROM applications a JOIN job_postings jp ON a.job_id = jp.id WHERE jp.created_by = u.email AND a.current_stage NOT IN ('hired', 'rejected', 'withdrawn')) AS active_candidates,
    (SELECT COUNT(*) FROM applications a JOIN job_postings jp ON a.job_id = jp.id WHERE jp.created_by = u.email AND a.current_stage = 'hired') AS total_hired
FROM users u
JOIN user_roles ur ON u.id = ur.user_id
WHERE u.company_id = '4d7a3f67-59d8-4c7f-8128-b614e81bcd7c'
AND ur.role = 'recruiter'
ORDER BY u.full_name;

-- Offer Acceptance Rate
SELECT 
    u.full_name,
    u.email,
    (SELECT COUNT(*) FROM applications a JOIN job_postings jp ON a.job_id = jp.id WHERE jp.created_by = u.email AND a.offer_status IN ('sent', 'under_review', 'negotiating')) AS offers_given,
    (SELECT COUNT(*) FROM applications a JOIN job_postings jp ON a.job_id = jp.id WHERE jp.created_by = u.email AND a.offer_status = 'accepted') AS offers_accepted
FROM users u
JOIN user_roles ur ON u.id = ur.user_id
WHERE u.company_id = '4d7a3f67-59d8-4c7f-8128-b614e81bcd7c'
AND ur.role = 'recruiter'
ORDER BY u.full_name;
