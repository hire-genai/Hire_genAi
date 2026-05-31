-- Migration: Add plan_amount column to company_subscriptions table
-- Purpose: Store the subscription plan price for auto-recharge linking
-- Date: 2026-05-30

ALTER TABLE company_subscriptions
ADD COLUMN plan_amount NUMERIC(12,2);

COMMENT ON COLUMN company_subscriptions.plan_amount IS 'The price of the subscription plan in the billing currency. Used to link auto-recharge amount to the active plan price.';

CREATE INDEX idx_company_subscriptions_plan_amount ON company_subscriptions (plan_amount) WHERE plan_amount IS NOT NULL;
