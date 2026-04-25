-- Migration: Add openai_base_cost column to usage tables
-- Purpose: Add missing openai_base_cost column for expense tracking

-- Add openai_base_cost to cv_parsing_usage
ALTER TABLE cv_parsing_usage 
ADD COLUMN IF NOT EXISTS openai_base_cost NUMERIC(10, 4);

-- Add openai_base_cost to video_interview_usage
ALTER TABLE video_interview_usage 
ADD COLUMN IF NOT EXISTS openai_base_cost NUMERIC(10, 4);

-- Add comments
COMMENT ON COLUMN cv_parsing_usage.openai_base_cost IS 'Base cost from OpenAI API for CV parsing';
COMMENT ON COLUMN video_interview_usage.openai_base_cost IS 'Base cost from OpenAI API for video interview';
