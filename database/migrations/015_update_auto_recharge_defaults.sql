-- Migration: Update auto-recharge default values
-- Change minimum auto-recharge amount from ₹2000 to ₹2
-- Change default threshold from ₹100 to ₹50

-- Update existing company_billing records with old default values
UPDATE company_billing 
SET 
  auto_recharge_amount = 2.00,
  auto_recharge_threshold = 50.00,
  updated_at = NOW()
WHERE
  auto_recharge_amount = 2000.00 
  OR auto_recharge_threshold = 100.00;

-- Update schema defaults for new records
ALTER TABLE company_billing 
ALTER COLUMN auto_recharge_amount SET DEFAULT 2.00;

ALTER TABLE company_billing 
ALTER COLUMN auto_recharge_threshold SET DEFAULT 50.00;

-- Add comment for documentation
COMMENT ON COLUMN company_billing.auto_recharge_amount IS 'Auto-recharge amount in rupees (minimum ₹2, default ₹2)';
COMMENT ON COLUMN company_billing.auto_recharge_threshold IS 'Wallet balance threshold to trigger auto-recharge (default ₹50)';
