-- ============================================================================
-- DELEGATION-BASED ACCESS CONTROL MIGRATION
-- Run this in Neon SQL Editor
-- ============================================================================

-- 1. Ensure delegations table exists with correct structure
CREATE TABLE IF NOT EXISTS delegations (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  company_id      UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  delegation_type TEXT NOT NULL,                     -- 'job' or 'application'
  item_id         UUID NOT NULL,                     -- references job_postings.id or applications.id
  item_name       TEXT NOT NULL,                     -- denormalized for display
  delegated_by    UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  delegated_to    UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  reason          TEXT,
  start_date      DATE NOT NULL,
  end_date        DATE NOT NULL,
  status          TEXT NOT NULL DEFAULT 'active',    -- active, expired, revoked
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 2. Ensure delegation_audit_logs table exists
CREATE TABLE IF NOT EXISTS delegation_audit_logs (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  delegation_id   UUID NOT NULL REFERENCES delegations(id) ON DELETE CASCADE,
  action          TEXT NOT NULL,                     -- created, revoked, expired
  performed_by    UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  details         TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 3. Add indexes for access control queries (IF NOT EXISTS)
CREATE INDEX IF NOT EXISTS idx_delegations_company_id ON delegations (company_id);
CREATE INDEX IF NOT EXISTS idx_delegations_delegated_by ON delegations (delegated_by);
CREATE INDEX IF NOT EXISTS idx_delegations_delegated_to ON delegations (delegated_to);
CREATE INDEX IF NOT EXISTS idx_delegations_status ON delegations (status);
CREATE INDEX IF NOT EXISTS idx_delegations_item_id ON delegations (item_id);
CREATE INDEX IF NOT EXISTS idx_delegations_type ON delegations (delegation_type);
CREATE INDEX IF NOT EXISTS idx_delegations_dates ON delegations (start_date, end_date);
CREATE INDEX IF NOT EXISTS idx_deleg_audit_delegation_id ON delegation_audit_logs (delegation_id);
CREATE INDEX IF NOT EXISTS idx_deleg_audit_created_at ON delegation_audit_logs (created_at);

-- 4. Composite index for the main access control query pattern:
--    "Find active delegations for a specific user within date range"
CREATE INDEX IF NOT EXISTS idx_delegations_access_control 
  ON delegations (delegated_to, delegation_type, status, start_date, end_date);

-- 5. Index on job_postings.created_by for ownership filtering
CREATE INDEX IF NOT EXISTS idx_job_postings_created_by ON job_postings (created_by);

-- 6. Make end_date NOT NULL if it was nullable before
-- (safe ALTER — won't fail if already NOT NULL)
DO $$
BEGIN
  -- Update any NULL end_dates to 30 days after start_date
  UPDATE delegations SET end_date = start_date + INTERVAL '30 days' WHERE end_date IS NULL;
  
  -- Now make it NOT NULL
  ALTER TABLE delegations ALTER COLUMN end_date SET NOT NULL;
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'end_date column update skipped: %', SQLERRM;
END;
$$;

-- 7. Auto-expire delegations whose end_date has passed
-- Run this periodically or call from the API
UPDATE delegations 
SET status = 'expired' 
WHERE status = 'active' 
  AND end_date < CURRENT_DATE;

-- ============================================================================
-- VERIFICATION: Check tables exist
-- ============================================================================
-- SELECT table_name FROM information_schema.tables 
-- WHERE table_schema = 'public' 
-- AND table_name IN ('delegations', 'delegation_audit_logs');
--
-- SELECT column_name, data_type, is_nullable 
-- FROM information_schema.columns 
-- WHERE table_name = 'delegations' ORDER BY ordinal_position;
