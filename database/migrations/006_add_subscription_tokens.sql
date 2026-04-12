-- Add customer_id and token_id columns to company_subscriptions table
-- These are needed for Razorpay recurring payments via tokens

ALTER TABLE company_subscriptions 
ADD COLUMN IF NOT EXISTS customer_id VARCHAR(255),
ADD COLUMN IF NOT EXISTS token_id VARCHAR(255);

-- Add indexes for better performance
CREATE INDEX IF NOT EXISTS idx_company_subscriptions_customer_id ON company_subscriptions(customer_id);
CREATE INDEX IF NOT EXISTS idx_company_subscriptions_token_id ON company_subscriptions(token_id);
