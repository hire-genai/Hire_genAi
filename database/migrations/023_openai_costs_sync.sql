-- Migration 023: OpenAI Costs API sync
-- Stores ACTUAL OpenAI USD spend per company per day, fetched from
-- GET https://api.openai.com/v1/organization/costs?group_by[]=project_id
-- using OPENAI_ADMIN_KEY. Single table only — sync status is exposed via the
-- sync API response and via MAX(synced_at) on this table.

CREATE TABLE IF NOT EXISTS openai_cost_sync (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id          UUID,                                 -- NULL if project not matched to a company
  openai_project_id   TEXT NOT NULL,                        -- OpenAI proj_xxx id
  date_bucket         DATE NOT NULL,                        -- day this cost applies to (UTC)
  amount_usd          NUMERIC(12, 6) NOT NULL DEFAULT 0,    -- actual USD billed by OpenAI
  line_item           TEXT,                                 -- OpenAI service line (e.g. 'completions', 'embeddings')
  raw_data            JSONB,                                -- full bucket payload for audit
  synced_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT openai_cost_sync_unique UNIQUE (openai_project_id, date_bucket, line_item)
);

CREATE INDEX IF NOT EXISTS idx_openai_cost_sync_company ON openai_cost_sync(company_id);
CREATE INDEX IF NOT EXISTS idx_openai_cost_sync_date    ON openai_cost_sync(date_bucket);
CREATE INDEX IF NOT EXISTS idx_openai_cost_sync_project ON openai_cost_sync(openai_project_id);
