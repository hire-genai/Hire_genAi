-- ============================================================================
-- ALIGN ASSESSMENTS TABLE WITH RECRUITMENT_ASSESSMENTS SCHEMA
-- ============================================================================

-- 1. Add missing columns
ALTER TABLE assessments ADD COLUMN IF NOT EXISTS ip_address INET;
ALTER TABLE assessments ADD COLUMN IF NOT EXISTS user_agent TEXT;

-- 2. Rename contact fields to match recruitment_assessments schema
ALTER TABLE assessments RENAME COLUMN contact_name TO name;
ALTER TABLE assessments RENAME COLUMN contact_email TO email;
ALTER TABLE assessments RENAME COLUMN contact_company TO company;
ALTER TABLE assessments RENAME COLUMN contact_phone TO phone;

-- 3. Change score to efficiency_score (INTEGER)
ALTER TABLE assessments RENAME COLUMN score TO efficiency_score;
ALTER TABLE assessments ALTER COLUMN efficiency_score TYPE INTEGER USING efficiency_score::INTEGER;

-- 4. Drop unnecessary columns
ALTER TABLE assessments DROP COLUMN IF EXISTS score_breakdown;
ALTER TABLE assessments DROP COLUMN IF EXISTS status;
ALTER TABLE assessments DROP COLUMN IF EXISTS completed_at;
ALTER TABLE assessments DROP COLUMN IF EXISTS updated_at;
ALTER TABLE assessments DROP COLUMN IF EXISTS session_id;
ALTER TABLE assessments DROP COLUMN IF EXISTS company_id;
ALTER TABLE assessments DROP COLUMN IF EXISTS user_id;

-- 5. Update email column to CITEXT for case-insensitive handling
ALTER TABLE assessments ALTER COLUMN email TYPE CITEXT;

-- 6. Update column constraints to match recruitment_assessments
ALTER TABLE assessments ALTER COLUMN name SET NOT NULL;
ALTER TABLE assessments ALTER COLUMN email SET NOT NULL;
ALTER TABLE assessments ALTER COLUMN company SET NOT NULL;
ALTER TABLE assessments ALTER COLUMN name TYPE VARCHAR(255);
ALTER TABLE assessments ALTER COLUMN company TYPE VARCHAR(255);
ALTER TABLE assessments ALTER COLUMN phone TYPE VARCHAR(50);

-- 7. Create performance indexes
DROP INDEX IF EXISTS idx_assessments_user_id;
DROP INDEX IF EXISTS idx_assessments_contact_email;
DROP INDEX IF EXISTS idx_assessments_session_id;
DROP INDEX IF EXISTS idx_assessments_status;

CREATE INDEX IF NOT EXISTS idx_assessments_email ON assessments(email);
CREATE INDEX IF NOT EXISTS idx_assessments_created_at ON assessments(created_at);

-- 8. Set default for answers if NULL
UPDATE assessments SET answers = '{}' WHERE answers IS NULL;
ALTER TABLE assessments ALTER COLUMN answers SET DEFAULT '{}';

-- Verify the migration
SELECT 
  'assessments' as table_name,
  COUNT(*) as total_records,
  COUNT(name) as records_with_name,
  COUNT(email) as records_with_email,
  COUNT(efficiency_score) as records_with_score
FROM assessments;

-- Show sample of migrated data
SELECT 
  id,
  name,
  email,
  company,
  efficiency_score,
  answers,
  created_at,
  ip_address,
  user_agent
FROM assessments 
ORDER BY created_at DESC
LIMIT 3;
