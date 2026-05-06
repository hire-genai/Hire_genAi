-- Migration: Add cancel_at_cycle_end column to company_subscriptions
-- This column tracks whether a subscription is scheduled for cancellation at the end of the billing cycle
-- When true: subscription remains active until current_end, then expires
-- When false: subscription is fully active or already cancelled

-- Add cancel_at_cycle_end column
ALTER TABLE company_subscriptions 
ADD COLUMN IF NOT EXISTS cancel_at_cycle_end BOOLEAN DEFAULT FALSE;

-- Add index for faster queries on cancel_at_cycle_end
CREATE INDEX IF NOT EXISTS idx_company_subscriptions_cancel_at_cycle_end 
ON company_subscriptions(cancel_at_cycle_end) 
WHERE cancel_at_cycle_end = TRUE;

-- Comment for documentation
COMMENT ON COLUMN company_subscriptions.cancel_at_cycle_end IS 
'When true, subscription will be cancelled at the end of current billing cycle. User retains access until next_billing_time.';
