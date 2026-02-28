-- Insert interview records for unqualified candidates
-- Just change the application_id and run the command

-- Example: Insert interview for an unqualified candidate
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
    'Completed',                  -- Status for unqualified candidates
    35.25,                        -- Score (0-100) - low score for unqualified
    '{
        "technical_skills": {"score": 30, "weight": 0.4, "notes": "Lacks required technical knowledge"},
        "communication": {"score": 40, "weight": 0.3, "notes": "Poor communication skills"},
        "problem_solving": {"score": 38, "weight": 0.3, "notes": "Weak analytical abilities"}
    }',                          -- Detailed evaluation JSON
    'Reject',                     -- Recommendation: Strongly Recommend, Recommend, On Hold, Reject
    'Candidate does not meet the minimum requirements for this position. Significant gaps in technical skills and communication.',  -- Summary
    'Interview revealed fundamental knowledge gaps. Candidate struggled with basic concepts and could not demonstrate required problem-solving skills.',        -- Feedback
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
-- BATCH INSERT TEMPLATE (for multiple unqualified candidates)
-- ------------------------------------------------------------------

/*
-- Uncomment and modify for batch insert:
INSERT INTO interviews (application_id, interview_status, interview_score, interview_evaluations, interview_recommendation, interview_summary, interview_feedback, created_at, updated_at) VALUES
    ('app-id-1', 'Completed', 25.00, '{"technical_skills": {"score": 20, "weight": 0.4}, "communication": {"score": 30, "weight": 0.3}, "problem_solving": {"score": 28, "weight": 0.3}}', 'Reject', 'Candidate lacks fundamental skills', 'Failed to demonstrate basic technical knowledge', NOW(), NOW()),
    ('app-id-2', 'Completed', 42.50, '{"technical_skills": {"score": 35, "weight": 0.4}, "communication": {"score": 45, "weight": 0.3}, "problem_solving": {"score": 50, "weight": 0.3}}', 'Reject', 'Below minimum requirements', 'Some areas showed potential but overall performance insufficient', NOW(), NOW()),
    ('app-id-3', 'Completed', 38.75, '{"technical_skills": {"score": 32, "weight": 0.4}, "communication": {"score": 40, "weight": 0.3}, "problem_solving": {"score": 45, "weight": 0.3}}', 'Reject', 'Not suitable for current role', 'Skills do not match job requirements', NOW(), NOW())
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
-- ALTERNATIVE: Incomplete Interview (for candidates who didn't finish)
-- ------------------------------------------------------------------

/*
-- For candidates who started but didn't complete the interview:
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
    'your-application-id-here',
    'Incomplete',                 -- Status for incomplete interviews
    NULL,                         -- No score for incomplete
    '{}',                         -- Empty evaluations
    NULL,                         -- No recommendation
    'Interview was not completed by the candidate.',
    'Candidate started the interview but did not finish all sections.',
    NOW(),
    NOW()
) ON CONFLICT (application_id) DO UPDATE SET
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
