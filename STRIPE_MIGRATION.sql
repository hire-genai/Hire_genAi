-- Stripe Auto-Recharge Migration
-- Run this in Neon PostgreSQL to complete the Stripe auto-recharge setup

-- Step 1: Remove old Razorpay auto-recharge columns (no longer used)
ALTER TABLE company_subscriptions
  DROP COLUMN IF EXISTS auto_recharge_token_id,
  DROP COLUMN IF EXISTS auto_recharge_customer_id,
  DROP COLUMN IF EXISTS auto_recharge_card_last4,
  DROP COLUMN IF EXISTS auto_recharge_card_network,
  DROP COLUMN IF EXISTS auto_recharge_card_type,
  DROP COLUMN IF EXISTS auto_recharge_card_issuer,
  DROP COLUMN IF EXISTS auto_recharge_token_created_at;

-- Step 2: Add new Stripe auto-recharge columns
ALTER TABLE company_subscriptions
  ADD COLUMN IF NOT EXISTS stripe_pm_id           VARCHAR(255),
  ADD COLUMN IF NOT EXISTS stripe_card_last4       VARCHAR(4),
  ADD COLUMN IF NOT EXISTS stripe_card_network     VARCHAR(50),
  ADD COLUMN IF NOT EXISTS stripe_card_type        VARCHAR(50),
  ADD COLUMN IF NOT EXISTS stripe_card_fingerprint VARCHAR(255),
  ADD COLUMN IF NOT EXISTS stripe_card_saved_at    TIMESTAMPTZ;

-- Step 3: Create index on stripe_pm_id for faster lookups
CREATE INDEX IF NOT EXISTS idx_company_subscriptions_stripe_pm_id
  ON company_subscriptions (stripe_pm_id)
  WHERE stripe_pm_id IS NOT NULL;

-- Verify migration
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_name = 'company_subscriptions'
  AND column_name IN ('stripe_pm_id', 'stripe_card_last4', 'stripe_card_network', 'stripe_card_type', 'stripe_card_fingerprint', 'stripe_card_saved_at', 'auto_recharge_token_id')
ORDER BY ordinal_position;
