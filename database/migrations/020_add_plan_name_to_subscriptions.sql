-- Migration: add plan_name column to company_subscriptions
-- WHY: We need to display the actual Stripe product name (e.g. "Starter Monthly")
-- on the settings page and pricing page instead of a hardcoded "Pro Plan" label.

ALTER TABLE company_subscriptions
  ADD COLUMN IF NOT EXISTS plan_name VARCHAR(255);

COMMENT ON COLUMN company_subscriptions.plan_name IS
  'Human-readable plan/product name fetched from provider (e.g. Stripe product.name).';
