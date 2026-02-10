-- ================================================================
-- NEON DATABASE UPDATES - Run these commands in your Neon console
-- ================================================================
-- These ALTER TABLE statements add columns needed for Apply page,
-- CV parsing, and CV evaluation functionality.

-- 1. Add columns to candidates table
ALTER TABLE candidates 
ADD COLUMN IF NOT EXISTS first_name TEXT,
ADD COLUMN IF NOT EXISTS last_name TEXT,
ADD COLUMN IF NOT EXISTS phone TEXT,
ADD COLUMN IF NOT EXISTS location TEXT,
ADD COLUMN IF NOT EXISTS current_company TEXT,
ADD COLUMN IF NOT EXISTS current_title TEXT,
ADD COLUMN IF NOT EXISTS experience_years INT,
ADD COLUMN IF NOT EXISTS linkedin_url TEXT,
ADD COLUMN IF NOT EXISTS resume_url TEXT,
ADD COLUMN IF NOT EXISTS photo_url TEXT,
ADD COLUMN IF NOT EXISTS source TEXT,
ADD COLUMN IF NOT EXISTS notes TEXT;

-- 2. Add columns to applications table (Apply page fields)
ALTER TABLE applications 
ADD COLUMN IF NOT EXISTS expected_salary NUMERIC(12,2),
ADD COLUMN IF NOT EXISTS salary_currency TEXT DEFAULT 'USD',
ADD COLUMN IF NOT EXISTS salary_period TEXT DEFAULT 'month',
ADD COLUMN IF NOT EXISTS location TEXT,
ADD COLUMN IF NOT EXISTS linkedin_url TEXT,
ADD COLUMN IF NOT EXISTS portfolio_url TEXT,
ADD COLUMN IF NOT EXISTS available_start_date DATE,
ADD COLUMN IF NOT EXISTS willing_to_relocate BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS languages JSONB,
ADD COLUMN IF NOT EXISTS photo_url TEXT,
ADD COLUMN IF NOT EXISTS cover_letter TEXT,
ADD COLUMN IF NOT EXISTS source TEXT DEFAULT 'direct_application',
ADD COLUMN IF NOT EXISTS confirmation_status TEXT;

-- 3. Add columns for CV parsing and evaluation
ALTER TABLE applications
ADD COLUMN IF NOT EXISTS resume_text TEXT,
ADD COLUMN IF NOT EXISTS qualification_score INTEGER,
ADD COLUMN IF NOT EXISTS is_qualified BOOLEAN,
ADD COLUMN IF NOT EXISTS qualification_explanations JSONB;

-- ================================================================
-- VERIFICATION QUERIES (Optional - run to verify columns added)
-- ================================================================

-- Check candidates table columns
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'candidates' 
  AND column_name IN ('first_name', 'last_name', 'photo_url')
ORDER BY column_name;

-- Check applications table columns (Apply page + CV eval)
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'applications' 
  AND column_name IN (
    'expected_salary', 'salary_currency', 'salary_period', 'location',
    'linkedin_url', 'portfolio_url', 'available_start_date',
    'willing_to_relocate', 'languages', 'photo_url', 'cover_letter',
    'source', 'confirmation_status',
    'resume_text', 'qualification_score', 'is_qualified', 'qualification_explanations'
  )
ORDER BY column_name;

-- ================================================================
-- NOTES
-- ================================================================
-- 1. Run these commands in your Neon database console
-- 2. All ALTER statements use IF NOT EXISTS, so they're safe to run multiple times
-- 3. resume_text stores the full extracted text from the uploaded CV
-- 4. qualification_score stores the AI evaluation score (0-100)
-- 5. is_qualified stores whether the candidate passed the threshold
-- 6. qualification_explanations stores the full JSON evaluation breakdown
-- 7. The photo_url column stores path to uploaded photos in /public/uploads/photos/
-- 8. languages column stores JSON array: [{"language": "English", "proficiency": "fluent"}]
-- 9. confirmation_status stores: "agree" or "disagree" or null
-- ================================================================
