-- ============================================================================
-- Migration 004: Update auto-recharge defaults
-- ============================================================================
-- Purpose: Update default values for auto-recharge settings
-- - auto_recharge_amount: 100.00 -> 2000.00
-- - auto_recharge_threshold: 10.00 -> 100.00
-- Also update existing records that have old default values

-- Update column defaults
ALTER TABLE company_billing 
ALTER COLUMN auto_recharge_amount SET DEFAULT 2000.00,
ALTER COLUMN auto_recharge_threshold SET DEFAULT 100.00;

-- Update existing records that have old default values
UPDATE company_billing 
SET auto_recharge_amount = 2000.00 
WHERE auto_recharge_amount = 100.00 OR auto_recharge_amount IS NULL;

UPDATE company_billing 
SET auto_recharge_threshold = 100.00 
WHERE auto_recharge_threshold = 10.00 OR auto_recharge_threshold IS NULL;
