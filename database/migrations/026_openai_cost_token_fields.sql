-- Migration 026: Add total_tokens and request_count to openai_cost_sync.
-- These are populated by merging Usage API data into both costs_api and
-- usage_estimate rows during sync.

ALTER TABLE openai_cost_sync
  ADD COLUMN IF NOT EXISTS total_tokens   BIGINT,
  ADD COLUMN IF NOT EXISTS request_count  INTEGER;
