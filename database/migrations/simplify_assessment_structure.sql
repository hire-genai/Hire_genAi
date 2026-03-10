-- ============================================================================
-- ASSESSMENT STRUCTURE SIMPLIFICATION MIGRATION
-- ============================================================================

-- 1. Add answers JSON column to assessments table
ALTER TABLE assessments ADD COLUMN IF NOT EXISTS answers JSONB;

-- 2. Migrate existing data from assessment_answers to assessments.answers
-- (Only if there's existing data to migrate)
UPDATE assessments 
SET answers = (
  SELECT jsonb_object_agg(
    aa.question_key, 
    jsonb_build_object(
      'questionText', aa.question_text,
      'answerValue', aa.answer_value,
      'answerIndex', aa.answer_index
    )
  )
  FROM assessment_answers aa 
  WHERE aa.assessment_id = assessments.id
)
WHERE EXISTS (
  SELECT 1 FROM assessment_answers aa 
  WHERE aa.assessment_id = assessments.id
);

-- 3. Drop the assessment_answers table and its indexes
DROP INDEX IF EXISTS idx_assessment_answers_assessment_id;
DROP TABLE IF EXISTS assessment_answers;

-- 4. Create index on answers JSON column for better query performance
CREATE INDEX IF NOT EXISTS idx_assessments_answers ON assessments USING GIN (answers);

-- 5. Verify the migration
SELECT 
  'assessments' as table_name,
  COUNT(*) as total_records,
  COUNT(answers) as records_with_answers
FROM assessments;

-- Show sample of migrated data
SELECT 
  id,
  contact_name,
  status,
  answers,
  created_at
FROM assessments 
WHERE answers IS NOT NULL 
LIMIT 3;
