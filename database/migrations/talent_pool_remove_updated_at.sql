-- ============================================================================
-- TALENT POOL REMOVE UPDATED_AT COLUMN REFERENCES
-- This migration ensures talent_pool_entries works without updated_at column
-- ============================================================================

-- Option 1: Add the missing updated_at column if you want to keep it
-- ALTER TABLE talent_pool_entries 
-- ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW();

-- Option 2: Remove updated_at from schema (recommended since code doesn't use it)
-- The column doesn't exist in actual database, so no need to drop it
-- Just ensure all code references are removed (already done in API files)

-- Verify the table structure
SELECT column_name, data_type, is_nullable, column_default 
FROM information_schema.columns 
WHERE table_name = 'talent_pool_entries' 
AND table_schema = 'public'
ORDER BY ordinal_position;
