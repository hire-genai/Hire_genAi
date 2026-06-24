-- Migration 022: OpenAI Cost Tracking — Schema
-- Adds the schema needed to track real OpenAI cost per CV parse / question
-- generation / video interview, alongside the customer charge.
--
-- New table:
--   openai_model_pricing  — token-to-USD rate catalog (admin-editable)
--
-- New columns on existing usage tables:
--   cv_parsing_usage          — tokens_used, prompt_tokens, completion_tokens,
--                               model_used, openai_base_cost, pricing_source,
--                               profit_margin_percent
--   question_generation_usage — openai_base_cost, profit_margin_percent,
--                               pricing_source
--   video_interview_usage     — tokens_used, prompt_tokens, completion_tokens,
--                               model_used, openai_base_cost, pricing_source,
--                               profit_margin_percent
--
-- All changes additive; legacy rows with NULL openai_base_cost fall back to a
-- 70% estimate in admin analytics queries.

-- ────────────────────────────────────────────────────────────────────────────
-- 1. Model pricing catalog
-- ────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS openai_model_pricing (
  id                     UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  model                  TEXT NOT NULL UNIQUE,
  input_price_per_1m     NUMERIC(12, 6) NOT NULL,
  output_price_per_1m    NUMERIC(12, 6) NOT NULL,
  per_minute_price       NUMERIC(12, 6),
  notes                  TEXT,
  effective_from         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at             TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at             TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_openai_model_pricing_model ON openai_model_pricing(model);

INSERT INTO openai_model_pricing (model, input_price_per_1m, output_price_per_1m, per_minute_price, notes)
VALUES
  ('gpt-4o',                    2.50,  10.00, NULL, 'CV parsing, JD question generation, evaluation'),
  ('gpt-4o-mini',               0.15,   0.60, NULL, 'Cheap fallback option'),
  ('gpt-4-turbo',              10.00,  30.00, NULL, 'Legacy'),
  ('gpt-4o-realtime-preview',   5.00,  20.00, 0.30, 'Azure Realtime API for AI interviews; per_minute_price used as fallback when token usage is unavailable')
ON CONFLICT (model) DO NOTHING;

-- ────────────────────────────────────────────────────────────────────────────
-- 2. question_generation_usage — add openai cost columns
-- ────────────────────────────────────────────────────────────────────────────
ALTER TABLE question_generation_usage
  ADD COLUMN IF NOT EXISTS openai_base_cost      NUMERIC(12, 6),
  ADD COLUMN IF NOT EXISTS profit_margin_percent NUMERIC(6, 3),
  ADD COLUMN IF NOT EXISTS pricing_source        TEXT;

-- ────────────────────────────────────────────────────────────────────────────
-- 3. cv_parsing_usage — add token + model columns
-- ────────────────────────────────────────────────────────────────────────────
ALTER TABLE cv_parsing_usage
  ADD COLUMN IF NOT EXISTS tokens_used           INTEGER,
  ADD COLUMN IF NOT EXISTS prompt_tokens         INTEGER,
  ADD COLUMN IF NOT EXISTS completion_tokens     INTEGER,
  ADD COLUMN IF NOT EXISTS model_used            TEXT,
  ADD COLUMN IF NOT EXISTS openai_base_cost      NUMERIC(12, 6),
  ADD COLUMN IF NOT EXISTS pricing_source        TEXT,
  ADD COLUMN IF NOT EXISTS profit_margin_percent NUMERIC(6, 3);

-- ────────────────────────────────────────────────────────────────────────────
-- 4. video_interview_usage — add token + model columns
-- ────────────────────────────────────────────────────────────────────────────
ALTER TABLE video_interview_usage
  ADD COLUMN IF NOT EXISTS tokens_used           INTEGER,
  ADD COLUMN IF NOT EXISTS prompt_tokens         INTEGER,
  ADD COLUMN IF NOT EXISTS completion_tokens     INTEGER,
  ADD COLUMN IF NOT EXISTS model_used            TEXT,
  ADD COLUMN IF NOT EXISTS openai_base_cost      NUMERIC(12, 6),
  ADD COLUMN IF NOT EXISTS pricing_source        TEXT,
  ADD COLUMN IF NOT EXISTS profit_margin_percent NUMERIC(6, 3);
