-- Migration: Update cv_parsing_usage table schema to match specification
-- Purpose: Align table structure with provided schema requirements

-- First, drop existing table if it exists (to recreate with correct schema)
DROP TABLE IF EXISTS cv_parsing_usage CASCADE;

-- Create cv_parsing_usage table with correct schema
CREATE TABLE cv_parsing_usage (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_id UUID NOT NULL,
    job_id UUID,
    candidate_id UUID,
    file_id UUID,
    file_size_kb INTEGER DEFAULT 0,
    parse_successful BOOLEAN DEFAULT true,
    unit_price NUMERIC(10, 4) NOT NULL DEFAULT '0',
    cost NUMERIC(10, 4) NOT NULL DEFAULT '0',
    success_rate NUMERIC(5, 2),
    openai_base_cost NUMERIC(10, 4),
    pricing_source TEXT DEFAULT 'env-config',
    tokens_used INTEGER,
    profit_margin_percent NUMERIC(5, 2) DEFAULT '0',
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Add foreign key constraints
ALTER TABLE cv_parsing_usage 
ADD CONSTRAINT cv_parsing_usage_company_id_fkey 
FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE CASCADE;

ALTER TABLE cv_parsing_usage 
ADD CONSTRAINT cv_parsing_usage_job_id_fkey 
FOREIGN KEY (job_id) REFERENCES job_postings(id) ON DELETE SET NULL;

ALTER TABLE cv_parsing_usage 
ADD CONSTRAINT cv_parsing_usage_candidate_id_fkey 
FOREIGN KEY (candidate_id) REFERENCES candidates(id) ON DELETE SET NULL;

-- Create indexes
CREATE INDEX idx_cv_parsing_usage_company_id ON cv_parsing_usage (company_id);
CREATE INDEX idx_cv_parsing_usage_job_id ON cv_parsing_usage (job_id);
CREATE INDEX idx_cv_parsing_usage_created_at ON cv_parsing_usage (created_at);

-- Add comments
COMMENT ON TABLE cv_parsing_usage IS 'Tracks CV parsing usage for billing purposes';
COMMENT ON COLUMN cv_parsing_usage.company_id IS 'Company that performed the CV parsing';
COMMENT ON COLUMN cv_parsing_usage.job_id IS 'Job posting associated with the CV parsing';
COMMENT ON COLUMN cv_parsing_usage.candidate_id IS 'Candidate whose CV was parsed';
COMMENT ON COLUMN cv_parsing_usage.file_id IS 'File ID of the parsed CV';
COMMENT ON COLUMN cv_parsing_usage.parse_successful IS 'Whether the CV parsing was successful';
COMMENT ON COLUMN cv_parsing_usage.unit_price IS 'Price per CV parsing unit';
COMMENT ON COLUMN cv_parsing_usage.cost IS 'Total cost for this CV parsing';
COMMENT ON COLUMN cv_parsing_usage.success_rate IS 'Success rate percentage of the parsing';
COMMENT ON COLUMN cv_parsing_usage.openai_base_cost IS 'Base cost from OpenAI API';
COMMENT ON COLUMN cv_parsing_usage.pricing_source IS 'Source of pricing information';
COMMENT ON COLUMN cv_parsing_usage.tokens_used IS 'Number of tokens used in parsing';
COMMENT ON COLUMN cv_parsing_usage.profit_margin_percent IS 'Profit margin percentage applied';
