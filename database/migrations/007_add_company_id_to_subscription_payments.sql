-- Migration: Add company_id foreign key to subscription_payments
-- This simplifies payment queries by allowing direct filtering by company_id
-- instead of joining through company_subscriptions

-- Add company_id column
ALTER TABLE subscription_payments 
ADD COLUMN company_id UUID REFERENCES companies(id);

-- Backfill from company_subscriptions
UPDATE subscription_payments sp
SET company_id = cs.company_id
FROM company_subscriptions cs
WHERE cs.subscription_id = sp.subscription_id;

-- Backfill remaining using customer_id (for payments not linked to subscriptions)
UPDATE subscription_payments sp
SET company_id = '723b9677-89ab-420f-a326-170b4eac1aa0'
WHERE sp.raw_data->>'customer_id' = 'cust_SYuNUhAaxpBzeq'
AND sp.company_id IS NULL;

-- Add index for faster queries
CREATE INDEX IF NOT EXISTS idx_subscription_payments_company_id 
ON subscription_payments(company_id);

-- Verify all rows have company_id
SELECT payment_id, company_id, amount, status 
FROM subscription_payments 
ORDER BY payment_time DESC;

-- Comment for documentation
COMMENT ON COLUMN subscription_payments.company_id IS 
'Foreign key to companies table. Allows direct filtering of payments by company without JOIN.';
