-- Migration: Add subscription_link column to company_subscriptions table
-- Purpose: Store the Razorpay short_url for each subscription so "Manage Plan" can open the correct link

ALTER TABLE company_subscriptions 
ADD COLUMN IF NOT EXISTS subscription_link VARCHAR(500);

-- Add comment for documentation
COMMENT ON COLUMN company_subscriptions.subscription_link IS 'Razorpay short_url for subscription management (e.g., https://rzp.io/rzp/XYZ123)';
