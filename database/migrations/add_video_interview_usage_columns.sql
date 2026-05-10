-- Migration: Add missing columns to video_interview_usage table
-- Date: 2026-05-06
-- Purpose: Fix video interview usage tracking to match code requirements

-- Add missing columns to video_interview_usage table
ALTER TABLE video_interview_usage
  ADD COLUMN IF NOT EXISTS interview_id UUID,
  ADD COLUMN IF NOT EXISTS candidate_id UUID,
  ADD COLUMN IF NOT EXISTS video_quality TEXT,
  ADD COLUMN IF NOT EXISTS completed_questions INTEGER,
  ADD COLUMN IF NOT EXISTS total_questions INTEGER,
  ADD COLUMN IF NOT EXISTS minute_price NUMERIC(10,4),
  ADD COLUMN IF NOT EXISTS openai_base_cost NUMERIC(10,4),
  ADD COLUMN IF NOT EXISTS pricing_source TEXT,
  ADD COLUMN IF NOT EXISTS tokens_used INTEGER,
  ADD COLUMN IF NOT EXISTS profit_margin_percent NUMERIC(5,2);

-- Make duration_seconds nullable (was NOT NULL, but code doesn't always provide it)
ALTER TABLE video_interview_usage
  ALTER COLUMN duration_seconds DROP NOT NULL;

-- Add comment
COMMENT ON TABLE video_interview_usage IS 'Track video interview usage for billing. Charged per minute.';
