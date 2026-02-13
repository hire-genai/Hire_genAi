-- ============================================================================
-- INTERVIEW SCHEMA UPDATES - RUN ON NEON DATABASE
-- ============================================================================

-- ---------------------------------------------------------------------------
-- 1. ADD NEW INTERVIEW COLUMNS TO APPLICATIONS TABLE
-- ---------------------------------------------------------------------------

-- Add interview_evaluations JSONB column (flexible criteria scoring)
ALTER TABLE applications ADD COLUMN IF NOT EXISTS interview_evaluations JSONB DEFAULT '{}';

-- Add interview_summary TEXT column (AI-generated summary)
ALTER TABLE applications ADD COLUMN IF NOT EXISTS interview_summary TEXT;

-- ---------------------------------------------------------------------------
-- 2. DROP OLD HARDCODED SCORE COLUMNS (IF THEY EXIST)
-- These were hardcoded: technical_score, behavioral_score, communication_score
-- Now replaced by flexible interview_evaluations JSONB
-- ---------------------------------------------------------------------------

ALTER TABLE applications DROP COLUMN IF EXISTS technical_score;
ALTER TABLE applications DROP COLUMN IF EXISTS behavioral_score;
ALTER TABLE applications DROP COLUMN IF EXISTS communication_score;

-- ---------------------------------------------------------------------------
-- 3. CREATE VIDEO_INTERVIEW_USAGE TABLE (FOR BILLING)
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS video_interview_usage (
  id                    UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  company_id            UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  job_id                UUID REFERENCES job_postings(id) ON DELETE SET NULL,
  interview_id          UUID,                          -- References application.id
  candidate_id          UUID REFERENCES candidates(id) ON DELETE SET NULL,
  duration_minutes      INT NOT NULL DEFAULT 0,
  video_quality         TEXT DEFAULT 'HD',
  minute_price          NUMERIC(10,4) NOT NULL DEFAULT 0,
  cost                  NUMERIC(10,4) NOT NULL DEFAULT 0,
  completed_questions   INT DEFAULT 0,
  total_questions       INT DEFAULT 0,
  openai_base_cost      NUMERIC(10,4),
  pricing_source        TEXT DEFAULT 'env-config',
  tokens_used           INT,
  profit_margin_percent NUMERIC(5,2) DEFAULT 0,
  created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_video_interview_usage_company_id ON video_interview_usage (company_id);
CREATE INDEX IF NOT EXISTS idx_video_interview_usage_job_id ON video_interview_usage (job_id);
CREATE INDEX IF NOT EXISTS idx_video_interview_usage_interview_id ON video_interview_usage (interview_id);
CREATE INDEX IF NOT EXISTS idx_video_interview_usage_created_at ON video_interview_usage (created_at DESC);

-- ---------------------------------------------------------------------------
-- 4. VERIFY EXISTING INTERVIEW COLUMNS EXIST
-- These should already exist from original schema, but add if missing
-- ---------------------------------------------------------------------------

ALTER TABLE applications ADD COLUMN IF NOT EXISTS interview_status TEXT DEFAULT 'Not Scheduled';
ALTER TABLE applications ADD COLUMN IF NOT EXISTS interview_link TEXT;
ALTER TABLE applications ADD COLUMN IF NOT EXISTS interview_sent_at TIMESTAMPTZ;
ALTER TABLE applications ADD COLUMN IF NOT EXISTS interview_completed_at TIMESTAMPTZ;
ALTER TABLE applications ADD COLUMN IF NOT EXISTS interview_score NUMERIC(5,2);
ALTER TABLE applications ADD COLUMN IF NOT EXISTS interview_recommendation TEXT;
ALTER TABLE applications ADD COLUMN IF NOT EXISTS interview_feedback TEXT;

-- ============================================================================
-- END OF UPDATES
-- ============================================================================
