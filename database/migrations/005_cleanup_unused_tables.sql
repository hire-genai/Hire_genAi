-- Migration: Clean up unused subscription tables
-- Purpose: Remove duplicate/unused tables to simplify the schema

-- Drop the unused 'subscriptions' table (not used in code)
DROP TABLE IF EXISTS subscriptions CASCADE;

-- Keep only these tables:
-- - company_subscriptions (main subscription data)
-- - subscription_payments (payment history) 
-- - payment_methods (saved payment methods for future use)

-- Notes:
-- All code already uses company_subscriptions table
-- No breaking changes to existing functionality
