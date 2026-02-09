-- ================================================================
-- NEON DATABASE UPDATES - Run these commands in your Neon console
-- ================================================================
-- These ALTER TABLE statements add the new columns needed for the Apply page
-- functionality to your existing Neon database tables.

-- 1. Add columns to candidates table
ALTER TABLE candidates 
ADD COLUMN IF NOT EXISTS first_name TEXT,
ADD COLUMN IF NOT EXISTS last_name TEXT,
ADD COLUMN IF NOT EXISTS photo_url TEXT;

-- 2. Add columns to applications table
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

-- ================================================================
-- VERIFICATION QUERIES (Optional - run to verify columns added)
-- ================================================================

-- Check candidates table columns
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'candidates' 
  AND column_name IN ('first_name', 'last_name', 'photo_url')
ORDER BY column_name;

-- Check applications table columns
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'applications' 
  AND column_name IN (
    'expected_salary', 'salary_currency', 'salary_period', 'location',
    'linkedin_url', 'portfolio_url', 'available_start_date',
    'willing_to_relocate', 'languages', 'photo_url', 'cover_letter',
    'source', 'confirmation_status'
  )
ORDER BY column_name;

-- ================================================================
-- NOTES
-- ================================================================
-- 1. Run these commands in your Neon database console
-- 2. All ALTER statements use IF NOT EXISTS, so they're safe to run multiple times
-- 3. After running, your Apply page will work end-to-end with real database storage
-- 4. The photo_url column stores path to uploaded photos in /public/uploads/photos/
-- 5. languages column stores JSON array: [{"language": "English", "proficiency": "fluent"}]
-- 6. confirmation_status stores: "agree" or "disagree" or null
-- ================================================================
