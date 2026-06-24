-- Migration 025: Add cost_source and token columns to openai_cost_sync.
--
-- cost_source distinguishes rows written from the Costs API (actual billing)
-- from rows that were estimated from Usage API token counts when the Costs API
-- has not yet published the project's spend.
--
-- Existing rows default to 'costs_api' (they were all written from actual data).

ALTER TABLE openai_cost_sync
  ADD COLUMN IF NOT EXISTS cost_source   TEXT NOT NULL DEFAULT 'costs_api',
  ADD COLUMN IF NOT EXISTS input_tokens  BIGINT,
  ADD COLUMN IF NOT EXISTS output_tokens BIGINT;

-- Enforce the allowed values
ALTER TABLE openai_cost_sync
  DROP CONSTRAINT IF EXISTS chk_openai_cost_source;
ALTER TABLE openai_cost_sync
  ADD CONSTRAINT chk_openai_cost_source
    CHECK (cost_source IN ('costs_api', 'usage_estimate'));

CREATE INDEX IF NOT EXISTS idx_openai_cost_sync_source ON openai_cost_sync(cost_source);
