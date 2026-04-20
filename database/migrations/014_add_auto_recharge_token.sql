-- Migration: Add separate auto-recharge token columns to company_subscriptions
-- This allows storing a dedicated payment token for auto-recharge, separate from subscription token

-- Add auto-recharge specific token columns
ALTER TABLE company_subscriptions 
ADD COLUMN IF NOT EXISTS auto_recharge_token_id VARCHAR(255),
ADD COLUMN IF NOT EXISTS auto_recharge_customer_id VARCHAR(255),
ADD COLUMN IF NOT EXISTS auto_recharge_card_last4 VARCHAR(4),
ADD COLUMN IF NOT EXISTS auto_recharge_card_network VARCHAR(50),
ADD COLUMN IF NOT EXISTS auto_recharge_card_type VARCHAR(50),
ADD COLUMN IF NOT EXISTS auto_recharge_card_issuer VARCHAR(100),
ADD COLUMN IF NOT EXISTS auto_recharge_token_created_at TIMESTAMPTZ;

-- Add indexes for better performance
CREATE INDEX IF NOT EXISTS idx_company_subscriptions_auto_recharge_token 
ON company_subscriptions(auto_recharge_token_id) WHERE auto_recharge_token_id IS NOT NULL;

-- Add comment for documentation
COMMENT ON COLUMN company_subscriptions.auto_recharge_token_id IS 'Razorpay token ID for auto-recharge payments (separate from subscription token)';
COMMENT ON COLUMN company_subscriptions.auto_recharge_customer_id IS 'Razorpay customer ID associated with auto-recharge token';
COMMENT ON COLUMN company_subscriptions.auto_recharge_card_last4 IS 'Last 4 digits of saved card for auto-recharge';
COMMENT ON COLUMN company_subscriptions.auto_recharge_card_network IS 'Card network (Visa, Mastercard, etc.) for auto-recharge';
COMMENT ON COLUMN company_subscriptions.auto_recharge_card_type IS 'Card type (credit, debit) for auto-recharge';
COMMENT ON COLUMN company_subscriptions.auto_recharge_card_issuer IS 'Card issuing bank for auto-recharge';
