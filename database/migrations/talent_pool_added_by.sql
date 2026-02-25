-- ============================================================================
-- TALENT POOL ADDED_BY COLUMN MIGRATION
-- Run this in Neon SQL Editor if column is missing
-- ============================================================================

ALTER TABLE talent_pool_entries 
ADD COLUMN IF NOT EXISTS added_by UUID REFERENCES users(id) ON DELETE SET NULL;
