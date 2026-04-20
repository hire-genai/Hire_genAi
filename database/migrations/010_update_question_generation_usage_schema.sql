-- Migration: Update question_generation_usage table schema to match specification
-- Purpose: Align table structure with provided schema requirements

-- First, drop existing table if it exists (to recreate with correct schema)
DROP TABLE IF EXISTS question_generation_usage CASCADE;

-- Create question_generation_usage table with correct schema
CREATE TABLE question_generation_usage (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_id UUID NOT NULL,
    job_id UUID,
    draft_job_id TEXT,
    prompt_tokens INTEGER DEFAULT 0,
    completion_tokens INTEGER DEFAULT 0,
    total_tokens INTEGER DEFAULT 0,
    question_count INTEGER NOT NULL DEFAULT 0,
    cost NUMERIC(10, 4) NOT NULL DEFAULT '0',
    model_used TEXT DEFAULT 'gpt-4o',
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Add foreign key constraints
ALTER TABLE question_generation_usage 
ADD CONSTRAINT question_generation_usage_company_id_fkey 
FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE CASCADE;

ALTER TABLE question_generation_usage 
ADD CONSTRAINT question_generation_usage_job_id_fkey 
FOREIGN KEY (job_id) REFERENCES job_postings(id) ON DELETE SET NULL;

-- Create indexes
CREATE INDEX idx_question_gen_usage_company_id ON question_generation_usage (company_id);
CREATE INDEX idx_question_gen_usage_job_id ON question_generation_usage (job_id);
CREATE INDEX idx_question_gen_usage_draft ON question_generation_usage (draft_job_id);
CREATE INDEX idx_question_gen_usage_created_at ON question_generation_usage (created_at);

-- Add comments
COMMENT ON TABLE question_generation_usage IS 'Tracks question generation usage for billing purposes';
COMMENT ON COLUMN question_generation_usage.company_id IS 'Company that performed the question generation';
COMMENT ON COLUMN question_generation_usage.job_id IS 'Job posting associated with the question generation';
COMMENT ON COLUMN question_generation_usage.draft_job_id IS 'Draft job ID for temporary job postings';
COMMENT ON COLUMN question_generation_usage.prompt_tokens IS 'Number of prompt tokens used';
COMMENT ON COLUMN question_generation_usage.completion_tokens IS 'Number of completion tokens used';
COMMENT ON COLUMN question_generation_usage.total_tokens IS 'Total tokens used (prompt + completion)';
COMMENT ON COLUMN question_generation_usage.question_count IS 'Number of questions generated';
COMMENT ON COLUMN question_generation_usage.cost IS 'Total cost for this question generation';
COMMENT ON COLUMN question_generation_usage.model_used IS 'AI model used for generation';
