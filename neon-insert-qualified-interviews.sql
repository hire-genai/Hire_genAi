-- Insert interview records for qualified candidates
-- Just change the application_id and run the command

-- Example: Insert interview for a qualified candidate
-- Replace 'your-application-id-here' with the actual application UUID

INSERT INTO interviews (
    application_id,
    interview_status,
    interview_score,
    interview_evaluations,
    interview_recommendation,
    interview_summary,
    interview_feedback,
    created_at,
    updated_at
) VALUES (
    'your-application-id-here',  -- 🔧 CHANGE THIS: Application UUID
    'Completed',                  -- Status for qualified candidates
    85.50,                        -- Score (0-100) - adjust as needed
    '{
        "technical_skills": {"score": 88, "weight": 0.4, "notes": "Strong technical background"},
        "communication": {"score": 82, "weight": 0.3, "notes": "Clear communicator"},
        "problem_solving": {"score": 86, "weight": 0.3, "notes": "Good analytical skills"}
    }',                          -- Detailed evaluation JSON
    'Recommend',                 -- Recommendation: Strongly Recommend, Recommend, On Hold, Reject
    'Candidate demonstrates strong technical skills and good communication. Would be a valuable addition to the team.',  -- Summary
    'Interview went well. Candidate answered all questions confidently and showed good problem-solving abilities.',        -- Feedback
    NOW(),                        -- created_at
    NOW()                         -- updated_at
) ON CONFLICT (application_id) DO UPDATE SET
    interview_status = EXCLUDED.interview_status,
    interview_score = EXCLUDED.interview_score,
    interview_evaluations = EXCLUDED.interview_evaluations,
    interview_recommendation = EXCLUDED.interview_recommendation,
    interview_summary = EXCLUDED.interview_summary,
    interview_feedback = EXCLUDED.interview_feedback,
    updated_at = NOW();

-- ------------------------------------------------------------------
-- BATCH INSERT TEMPLATE (for multiple qualified candidates)
-- ------------------------------------------------------------------

/*
-- Uncomment and modify for batch insert:
INSERT INTO interviews (application_id, interview_status, interview_score, interview_evaluations, interview_recommendation, interview_summary, interview_feedback, created_at, updated_at) VALUES
    ('app-id-1', 'Completed', 90.00, '{"technical_skills": {"score": 92, "weight": 0.4}, "communication": {"score": 88, "weight": 0.3}, "problem_solving": {"score": 90, "weight": 0.3}}', 'Strongly Recommend', 'Exceptional candidate with excellent technical skills', 'Outstanding performance across all areas', NOW(), NOW()),
    ('app-id-2', 'Completed', 78.50, '{"technical_skills": {"score": 75, "weight": 0.4}, "communication": {"score": 80, "weight": 0.3}, "problem_solving": {"score": 82, "weight": 0.3}}', 'Recommend', 'Good candidate with solid foundation', 'Performed well, meets requirements', NOW(), NOW()),
    ('app-id-3', 'Completed', 82.25, '{"technical_skills": {"score": 85, "weight": 0.4}, "communication": {"score": 78, "weight": 0.3}, "problem_solving": {"score": 84, "weight": 0.3}}', 'Recommend', 'Strong performer with good skills', 'Consistent performance throughout interview', NOW(), NOW())
ON CONFLICT (application_id) DO UPDATE SET
    interview_status = EXCLUDED.interview_status,
    interview_score = EXCLUDED.interview_score,
    interview_evaluations = EXCLUDED.interview_evaluations,
    interview_recommendation = EXCLUDED.interview_recommendation,
    interview_summary = EXCLUDED.interview_summary,
    interview_feedback = EXCLUDED.interview_feedback,
    updated_at = NOW();
*/

-- ------------------------------------------------------------------
-- QUICK CHECK: Verify the interview was inserted
-- ------------------------------------------------------------------

-- To check your inserted interview:
-- SELECT * FROM interviews WHERE application_id = 'your-application-id-here';

-- To see all interviews with their application details:
-- SELECT 
--     i.id as interview_id,
--     i.application_id,
--     i.interview_status,
--     i.interview_score,
--     i.interview_recommendation,
--     a.candidate_id,
--     c.full_name as candidate_name,
--     jp.title as job_title
-- FROM interviews i
-- JOIN applications a ON i.application_id = a.id
-- JOIN candidates c ON a.candidate_id = c.id
-- JOIN job_postings jp ON a.job_id = jp.id
-- WHERE i.application_id = 'your-application-id-here';
