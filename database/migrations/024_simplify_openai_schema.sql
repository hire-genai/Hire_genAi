-- Migration 024: Drop auxiliary objects from earlier OpenAI cost tracking drafts.
-- Removes views and audit table that were replaced by the simpler 2-table design
-- (openai_model_pricing + openai_cost_sync). Safe to run multiple times.

DROP VIEW  IF EXISTS vw_ai_profitability;
DROP VIEW  IF EXISTS vw_company_actual_openai_cost;
DROP TABLE IF EXISTS openai_sync_runs;
